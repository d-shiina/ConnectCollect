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

// WinActor から渡ってくる入力パラメータの定義 (フロー単位)
export interface FlowInputDef {
  key: string;
  label?: string;
  example?: string;
}

// フロー定義本体
export interface FlowDefinition {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** WinActor からのリクエストで期待する入力パラメータ一覧 (オプション) */
  inputSchema?: FlowInputDef[];
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

/**
 * プラグインが宣言する認証方式。
 * プラグインごとに異なるため、アダプタ側で明示する。
 *
 * - none: 認証不要
 * - static: 固定の API キー / トークンを credentialStore に保存
 * - oauth2: OAuth 2.0 認可コードフロー。BrowserWindow で authorize_url に
 *   誘導して、Express のコールバックで code → token を交換する
 */
export type PluginAuthMethod =
  | { type: 'none' }
  | {
      type: 'static';
      fields: AdapterConfigFieldSchema[];
    }
  | {
      type: 'oauth2';
      authorizeUrl: string;
      tokenUrl: string;
      scopes?: string[];
      /** credentialStore のキー名 (デフォルト: clientId / clientSecret / accessToken / refreshToken / expiresAt) */
      clientIdKey?: string;
      clientSecretKey?: string;
      accessTokenKey?: string;
      refreshTokenKey?: string;
      expiresAtKey?: string;
      /** Express が受け付けるコールバックパス (デフォルト: /oauth/<scope>/callback) */
      redirectPath?: string;
    };

// アダプタのメタ情報 (UI 表示や一覧取得用)
export interface AdapterMetadata {
  name: AdapterType;
  displayName: string;
  description: string;
  /** ノードの config に持たせる非機密設定項目 */
  configSchema: AdapterConfigFieldSchema[];
  /** プラグインが要求する認証方式。未指定は none 扱い。 */
  auth?: PluginAuthMethod;
}

export interface AdapterConfigFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'password' | 'number' | 'boolean';
  required: boolean;
  placeholder?: string;
}

/** プラグイン管理 UI 用にランタイム情報を付与したメタ情報 */
export interface PluginInfo extends AdapterMetadata {
  enabled: boolean;
  source: 'builtin' | 'user';
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
  /** プラグイン (アダプタ) 一覧をランタイム情報付きで取得 */
  listPlugins(): Promise<PluginInfo[]>;
  /** プラグインの有効/無効を切り替え */
  setPluginEnabled(name: string, enabled: boolean): Promise<void>;
  /** プラグインフォルダをファイラで開く */
  openPluginDir(): Promise<void>;
  /** 認証情報が登録されているか (生の値は返さない) */
  credentialsHas(scope: string, key: string): Promise<boolean>;
  /** 認証情報を保存 */
  credentialsSet(scope: string, key: string, value: string): Promise<void>;
  /** 認証情報を削除 */
  credentialsDelete(scope: string, key: string): Promise<void>;
  /** OAuth 2.0 フローを開始する (Main 側で BrowserWindow を開いて code を捕捉) */
  oauthStart(scope: string): Promise<{ success: boolean; error?: string }>;
  /** フロー実行イベントの購読。unsubscribe 関数を返す */
  onFlowEvent(callback: (event: FlowEvent) => void): () => void;
}

declare global {
  interface Window {
    bridge: BridgeApi;
  }
}
