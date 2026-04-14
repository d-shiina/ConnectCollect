import express from 'express';
import cors from 'cors';
import type { Server } from 'node:http';
import { createRouter } from './router';
import { initializeAdapters } from './adapters';

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

export async function startServer(): Promise<number> {
  if (server) return activePort;

  initializeAdapters();

  const app = express();

  app.use(express.json({ limit: '1mb' }));
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

  app.use('/', createRouter(VERSION));

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
