import type { AdapterMetadata, AdapterType } from '../../shared/types';
import type { ScopedCredentials } from '../credentials';

export interface AdapterConfig {
  [key: string]: unknown;
}

export interface AdapterInput {
  [key: string]: unknown;
}

export interface AdapterOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * アダプタ実行時に本体から渡されるコンテキスト。
 * - credentials: そのアダプタ名で scope 固定された認証情報ストア
 * - log: フロー実行ログに追記するヘルパ (ノード名付きで記録される)
 */
export interface AdapterExecutionContext {
  credentials: ScopedCredentials;
  log: (level: 'info' | 'warn' | 'error', message: string) => void;
}

/**
 * アダプタの基底インターフェース。
 * 新しい SaaS 連携を追加する場合はこのインターフェースを実装し、
 * registry に `registerAdapter()` で登録する。
 */
export interface Adapter {
  /** 内部識別子 (kintone, box, ...) */
  readonly name: AdapterType;
  /** UI 表示用メタ情報 */
  readonly metadata: AdapterMetadata;
  /** 実行ロジック */
  execute(
    config: AdapterConfig,
    input: AdapterInput,
    ctx: AdapterExecutionContext,
  ): Promise<AdapterOutput>;
}
