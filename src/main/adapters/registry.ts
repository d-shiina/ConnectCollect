import type { Adapter } from './base';
import type { AdapterMetadata, AdapterType } from '../../shared/types';

/**
 * プラグイン形式のアダプタ登録レジストリ。
 *
 * 新しいアダプタを追加する手順:
 *   1. `src/main/adapters/<name>.ts` に `Adapter` 実装を作成
 *   2. `src/main/adapters/index.ts` の `builtInAdapters` に追加
 *      (もしくは外部プラグインとして `registry.register(adapter)` を呼ぶ)
 *
 * 同名アダプタを上書き登録することで機能差し替えも可能。
 */
class AdapterRegistry {
  private adapters = new Map<AdapterType, Adapter>();

  register(adapter: Adapter): void {
    if (this.adapters.has(adapter.name)) {
      console.warn(`[AdapterRegistry] overriding existing adapter: ${adapter.name}`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  unregister(name: AdapterType): void {
    this.adapters.delete(name);
  }

  get(name: AdapterType): Adapter | undefined {
    return this.adapters.get(name);
  }

  has(name: AdapterType): boolean {
    return this.adapters.has(name);
  }

  list(): Adapter[] {
    return Array.from(this.adapters.values());
  }

  listMetadata(): AdapterMetadata[] {
    return this.list().map((a) => a.metadata);
  }
}

export const adapterRegistry = new AdapterRegistry();
export type { AdapterRegistry };
