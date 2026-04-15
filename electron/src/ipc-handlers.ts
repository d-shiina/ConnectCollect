import { BrowserWindow, ipcMain } from 'electron';
import type { PythonBridge } from './python-bridge';

/**
 * Renderer ↔ main プロセス間の IPC ハンドラ登録。
 *
 * Step 5 時点では:
 *  - rpc(method, params)            : Python agent への汎用 JSON-RPC リクエスト
 *  - 通知 (agent → Renderer)        : webContents.send('agent:notification', {method, params})
 *
 * Step 6 以降で scenario / execution / node 専用 IPC は追加せず、すべて rpc() を
 * 経由する設計とする。Renderer 側の API クライアントが薄いラッパを提供する。
 */
export function registerIpcHandlers(
  bridge: PythonBridge,
  getWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle(
    'rpc',
    async (_e, method: unknown, params: unknown): Promise<unknown> => {
      if (typeof method !== 'string' || method.length === 0) {
        throw new Error("'method' must be a non-empty string");
      }
      return bridge.rpc(method, params);
    },
  );

  // Python 側からの通知を Renderer にブロードキャストする
  bridge.on('notification', (method: string, params: unknown) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('agent:notification', { method, params });
    }
  });

  // Python プロセスが落ちたら UI に通知 (Step 5 では console + ブロードキャスト)
  bridge.on('exit', (code, signal) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('agent:exit', { code, signal });
    }
  });
}
