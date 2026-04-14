import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import type { Server } from 'node:http';
import { createRouter } from './router';
import { initializeAdapters } from './adapters';
import { flowEventBus } from './events';

const DEFAULT_PORT = 8765;
const VERSION = '0.1.0';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8765',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8765',
];

let server: Server | null = null;
let activePort = DEFAULT_PORT;

export function getServerPort(): number {
  return activePort;
}

/**
 * 全 HTTP リクエスト/レスポンスを flowEventBus に流す監視ミドルウェア。
 * Renderer のログパネルから届いた body や params を確認できるようにする。
 * 機密ヘッダ (authorization, cookie) はマスクする。
 */
const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'x-api-key']);

function sanitizeHeaders(raw: Request['headers']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    const value = Array.isArray(v) ? v.join(', ') : String(v);
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? '***' : value;
  }
  return out;
}

const httpMonitor: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const startedAt = Date.now();

  flowEventBus.emitEvent({
    type: 'http:request',
    request: {
      id: requestId,
      method: req.method,
      path: req.originalUrl,
      params: { ...(req.params as Record<string, string>) },
      query: { ...(req.query as Record<string, unknown>) },
      body: req.body,
      headers: sanitizeHeaders(req.headers),
      timestamp: new Date(startedAt).toISOString(),
    },
  });

  res.on('finish', () => {
    flowEventBus.emitEvent({
      type: 'http:response',
      response: {
        id: requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
    });
  });

  next();
};

export async function startServer(): Promise<number> {
  if (server) return activePort;

  initializeAdapters();

  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(
    cors({
      origin: (origin, callback) => {
        // curl や同一プロセスからの呼び出しは origin=undefined
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error(`origin not allowed: ${origin}`));
      },
    }),
  );

  // JSON パース後・ルーティング前に監視ミドルウェアを挾む。
  // これで body は parse 済みの JS オブジェクトとして取れる。
  app.use(httpMonitor);

  app.use('/', createRouter(VERSION));

  // JSON パース失敗 (body-parser の SyntaxError) を 400 に変換。
  // スタックトレースは出さずメッセージだけログに残す。
  const jsonErrorHandler: ErrorRequestHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (
      err instanceof SyntaxError &&
      'status' in err &&
      (err as { status?: number }).status === 400 &&
      'body' in err
    ) {
      console.warn(
        `[server] invalid JSON body on ${req.method} ${req.originalUrl}: ${err.message}`,
      );
      res.status(400).json({
        success: false,
        error: 'invalid JSON body',
        detail: err.message,
      });
      return;
    }
    next(err);
  };
  app.use(jsonErrorHandler);

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  activePort = port;

  return new Promise((resolve, reject) => {
    // 127.0.0.1 のみバインド (外部アクセスを禁止)
    server = app
      .listen(port, '127.0.0.1', () => {
        console.log(`[server] listening on http://127.0.0.1:${port}`);
        resolve(port);
      })
      .on('error', (err) => {
        console.error('[server] failed to start', err);
        reject(err);
      });
  });
}

export async function stopServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server?.close((err) => (err ? reject(err) : resolve()));
  });
  server = null;
}
