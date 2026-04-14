// Main と Renderer で共有する型定義

export type AdapterType = 'kintone' | 'box' | 'google_workspace' | string;

export type NodeType = 'trigger' | 'adapter' | 'transform';

// ReactFlow ノードに載せるデータ
export interface NodeData {
  label: string;
  adapterType?: AdapterType;
  config?: Record<string, unknown>;
}

// フロー内のノード定義
export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

// フロー内のエッジ定義
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

// フロー定義本体
export interface FlowDefinition {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
}

// フロー実行リクエスト（WinActor から受け取る形式）
export interface FlowRunRequest {
  inputs?: Record<string, unknown>;
}

// 実行ログエントリ
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
}

// フロー実行結果
export interface FlowRunResult {
  success: boolean;
  flowId: string;
  outputs?: Record<string, unknown>;
  error?: string;
  executedAt: string;
  logs: LogEntry[];
}

// アダプタのメタ情報 (UI 表示や一覧取得用)
export interface AdapterMetadata {
  name: AdapterType;
  displayName: string;
  description: string;
  configSchema: AdapterConfigFieldSchema[];
}

export interface AdapterConfigFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'password' | 'number' | 'boolean';
  required: boolean;
  placeholder?: string;
}

// HTTP リクエスト/レスポンス監視用イベント
export interface HttpRequestInfo {
  id: string;
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string>;
  timestamp: string;
}

export interface HttpResponseInfo {
  id: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: string;
}

// フロー実行・HTTP 監視イベント (Main → Renderer に push される)
export type FlowEvent =
  | { type: 'run:start'; flowId: string; timestamp: string }
  | {
      type: 'run:node';
      flowId: string;
      nodeId: string;
      status: 'running' | 'success' | 'error';
      /** running 時に入ってきたデータ (payload) */
      input?: unknown;
      /** success/error 時にこのノードから出ていくデータ */
      output?: unknown;
      timestamp: string;
    }
  | { type: 'run:log'; flowId: string; entry: LogEntry }
  | {
      type: 'run:end';
      flowId: string;
      success: boolean;
      error?: string;
      timestamp: string;
    }
  | { type: 'http:request'; request: HttpRequestInfo }
  | { type: 'http:response'; response: HttpResponseInfo };

// Renderer ↔ Main の IPC API 定義
export interface BridgeApi {
  listFlows(): Promise<FlowDefinition[]>;
  getFlow(id: string): Promise<FlowDefinition | null>;
  saveFlow(flow: FlowDefinition): Promise<FlowDefinition>;
  deleteFlow(id: string): Promise<void>;
  listAdapters(): Promise<AdapterMetadata[]>;
  getServerPort(): Promise<number>;
  /** フロー実行イベントの購読。unsubscribe 関数を返す */
  onFlowEvent(callback: (event: FlowEvent) => void): () => void;
}

declare global {
  interface Window {
    bridge: BridgeApi;
  }
}
