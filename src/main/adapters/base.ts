import type { AdapterMetadata, AdapterType } from '../../shared/types';

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
  execute(config: AdapterConfig, input: AdapterInput): Promise<AdapterOutput>;
}
