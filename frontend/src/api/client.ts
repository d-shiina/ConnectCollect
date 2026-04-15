/**
 * window.api ラッパ。
 *
 * preload.ts (electron 側) で contextBridge.exposeInMainWorld('api', ...) されている
 * オブジェクトを型付きで再公開する。
 *
 * window.api が存在しない (例: Electron 外で Vite 単体起動) 場合は
 * `unavailable` フラグが立ち、rpc 呼び出しは拒否される。
 */

interface AgentNotification {
  method: string;
  params: unknown;
}

interface AgentExit {
  code: number | null;
  signal: string | null;
}

interface RpaApi {
  versions: { node: string; chrome: string; electron: string };
  rpc<T = unknown>(method: string, params?: unknown): Promise<T>;
  onNotification(handler: (n: AgentNotification) => void): () => void;
  onAgentExit(handler: (info: AgentExit) => void): () => void;
}

declare global {
  interface Window {
    api?: RpaApi;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.api !== 'undefined';
}

export async function rpc<T = unknown>(
  method: string,
  params?: unknown,
): Promise<T> {
  if (!window.api) {
    throw new Error(
      'window.api unavailable - frontend is running outside Electron',
    );
  }
  return window.api.rpc<T>(method, params);
}

export function onNotification(
  handler: (n: AgentNotification) => void,
): () => void {
  if (!window.api) return () => undefined;
  return window.api.onNotification(handler);
}

export function onAgentExit(handler: (info: AgentExit) => void): () => void {
  if (!window.api) return () => undefined;
  return window.api.onAgentExit(handler);
}

export interface SystemHealth {
  status: 'ok';
  agent_version: string;
  python_version: string;
  platform: string;
  uptime_seconds: number;
}
