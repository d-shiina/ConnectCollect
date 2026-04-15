import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';

/**
 * Python agent (rpa-agent) を子プロセスとして起動し、stdin/stdout で
 * JSON-RPC 2.0 メッセージをやりとりするブリッジ。
 *
 * 役割:
 *  - 子プロセスのライフサイクル管理 (起動 / 終了 / クラッシュ検知)
 *  - リクエスト → レスポンスの id ベース突き合わせ
 *  - サーバ通知 (id 無しメッセージ) を EventEmitter で配信
 *
 * Step 5 時点では system.health 1 メソッドで往復を検証するのが目標。
 * Step 9 で execution.event 通知を Renderer へ流す経路として使う。
 */

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  method: string;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: JsonRpcError;
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface PythonBridgeOptions {
  /** Python 実行ファイルのパス。未指定なら自動解決 */
  pythonPath?: string;
  /** agent パッケージのあるディレクトリ (cwd として使う) */
  agentDir: string;
  /** Electron app.getPath('userData') を Python に渡す */
  userDataDir: string;
  /** stderr の各行を受け取るコールバック */
  onStderr?: (line: string) => void;
}

export interface BridgeEvents {
  notification: (method: string, params: unknown) => void;
  exit: (code: number | null, signal: NodeJS.Signals | null) => void;
}

export declare interface PythonBridge {
  on<E extends keyof BridgeEvents>(event: E, listener: BridgeEvents[E]): this;
  off<E extends keyof BridgeEvents>(event: E, listener: BridgeEvents[E]): this;
  emit<E extends keyof BridgeEvents>(
    event: E,
    ...args: Parameters<BridgeEvents[E]>
  ): boolean;
}

export class PythonBridge extends EventEmitter {
  private readonly options: PythonBridgeOptions;
  private process: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private stdoutBuffer = '';
  private stderrBuffer = '';
  private stopped = false;

  constructor(options: PythonBridgeOptions) {
    super();
    this.options = options;
  }

  /** 子プロセスを起動する。1 回だけ呼べる */
  start(): void {
    if (this.process) {
      throw new Error('PythonBridge already started');
    }
    const pythonPath = this.options.pythonPath ?? resolvePythonPath(this.options.agentDir);
    const args = [
      '-m',
      'agent',
      '--user-data-dir',
      this.options.userDataDir,
    ];
    const child = spawn(pythonPath, args, {
      cwd: this.options.agentDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // src/ レイアウトの import を効かせる
        PYTHONPATH: path.join(this.options.agentDir, 'src'),
        PYTHONUNBUFFERED: '1',
      },
    });
    this.process = child;

    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (chunk: string) => this.handleStdout(chunk));
    child.stderr.setEncoding('utf-8');
    child.stderr.on('data', (chunk: string) => this.handleStderr(chunk));

    child.on('exit', (code, signal) => {
      this.stopped = true;
      // 解決待ちのリクエストを全て reject
      for (const [, pending] of this.pending) {
        pending.reject(
          new Error(
            `python agent exited (code=${code}, signal=${signal ?? 'none'}) before responding to ${pending.method}`,
          ),
        );
      }
      this.pending.clear();
      this.emit('exit', code, signal);
    });
  }

  /** 子プロセスを停止する (graceful: stdin を閉じて EOF を送る) */
  async stop(timeoutMs = 3000): Promise<void> {
    const child = this.process;
    if (!child || this.stopped) return;
    this.stopped = true;
    child.stdin.end();
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (!child.killed) child.kill('SIGTERM');
        resolve();
      }, timeoutMs);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /** JSON-RPC リクエストを送って応答を待つ */
  rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
    const child = this.process;
    if (!child || this.stopped) {
      return Promise.reject(new Error('python agent not running'));
    }
    const id = this.nextId++;
    const message = {
      jsonrpc: '2.0' as const,
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    };
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        method,
      });
      child.stdin.write(JSON.stringify(message) + '\n', (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  private handleStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    let newlineIndex = this.stdoutBuffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        this.handleMessage(line);
      }
      newlineIndex = this.stdoutBuffer.indexOf('\n');
    }
  }

  private handleStderr(chunk: string): void {
    this.stderrBuffer += chunk;
    let newlineIndex = this.stderrBuffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.stderrBuffer.slice(0, newlineIndex);
      this.stderrBuffer = this.stderrBuffer.slice(newlineIndex + 1);
      this.options.onStderr?.(line);
      newlineIndex = this.stderrBuffer.indexOf('\n');
    }
  }

  private handleMessage(line: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      this.options.onStderr?.(`[python-bridge] non-JSON line: ${line}`);
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;

    const obj = parsed as Partial<JsonRpcResponse & JsonRpcNotification>;
    if (obj.id !== undefined && obj.id !== null) {
      // レスポンス
      const id = typeof obj.id === 'number' ? obj.id : Number(obj.id);
      const pending = this.pending.get(id);
      if (!pending) {
        this.options.onStderr?.(`[python-bridge] orphan response id=${id}`);
        return;
      }
      this.pending.delete(id);
      if (obj.error) {
        const err = new Error(`${obj.error.message} (code=${obj.error.code})`);
        pending.reject(err);
      } else {
        pending.resolve(obj.result);
      }
      return;
    }

    if (typeof obj.method === 'string') {
      // 通知
      this.emit('notification', obj.method, obj.params);
      return;
    }
  }
}

/**
 * Python 実行ファイルを解決する。
 *
 * 1. 環境変数 RPA_AGENT_PYTHON があればそれを使う
 * 2. agent/.venv/bin/python (POSIX) または agent/.venv/Scripts/python.exe (Windows)
 * 3. システムの python3 にフォールバック
 */
export function resolvePythonPath(agentDir: string): string {
  const envOverride = process.env.RPA_AGENT_PYTHON;
  if (envOverride && fs.existsSync(envOverride)) return envOverride;

  const isWindows = process.platform === 'win32';
  const venvPython = isWindows
    ? path.join(agentDir, '.venv', 'Scripts', 'python.exe')
    : path.join(agentDir, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;

  return isWindows ? 'python.exe' : 'python3';
}
