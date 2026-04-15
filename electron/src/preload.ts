import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

/**
 * Renderer に公開する API。
 *
 * - versions          : Node / Chrome / Electron バージョン
 * - rpc(method,params): Python agent への JSON-RPC リクエスト
 * - onNotification    : Python agent からの通知 (id 無しメッセージ) の購読
 * - onAgentExit       : agent プロセスが終了したときに呼ばれる
 */

interface AgentNotification {
  method: string;
  params: unknown;
}

interface AgentExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

const api = {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
    return ipcRenderer.invoke('rpc', method, params) as Promise<T>;
  },

  onNotification(
    handler: (notification: AgentNotification) => void,
  ): () => void {
    const listener = (_e: IpcRendererEvent, payload: AgentNotification): void =>
      handler(payload);
    ipcRenderer.on('agent:notification', listener);
    return () => {
      ipcRenderer.off('agent:notification', listener);
    };
  },

  onAgentExit(handler: (info: AgentExit) => void): () => void {
    const listener = (_e: IpcRendererEvent, payload: AgentExit): void =>
      handler(payload);
    ipcRenderer.on('agent:exit', listener);
    return () => {
      ipcRenderer.off('agent:exit', listener);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);

// 型情報を別ファイルから参照するため export しておく (preload は CommonJS)
export type RpaApi = typeof api;
