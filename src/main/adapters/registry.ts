import type { Adapter } from './base';
import type { AdapterType, PluginInfo } from '../../shared/types';

/**
 * プラグイン形式のアダプタ登録レジストリ。
 *
 * 新しいアダプタを追加する手順:
 *   1. `src/main/adapters/<name>.ts` に `Adapter` 実装を作成
 *   2. `src/main/adapters/index.ts` の `builtInAdapters` に追加
 *      (もしくは外部プラグインとして `registry.register(adapter, {source: 'user'})` を呼ぶ)
 *
 * 同名アダプタを上書き登録することで機能差し替えも可能。
 * GUI のプラグイン管理パネルから enable/disable を切り替えられる。
 */
interface AdapterEntry {
  adapter: Adapter;
  enabled: boolean;
  source: 'builtin' | 'user';
}

class AdapterRegistry {
  private entries = new Map<AdapterType, AdapterEntry>();

  register(adapter: Adapter, opts?: { source?: 'builtin' | 'user' }): void {
    if (this.entries.has(adapter.name)) {
      console.warn(`[AdapterRegistry] overriding existing adapter: ${adapter.name}`);
    }
    this.entries.set(adapter.name, {
      adapter,
      enabled: true,
      source: opts?.source ?? 'builtin',
    });
  }

  unregister(name: AdapterType): void {
    this.entries.delete(name);
  }

  get(name: AdapterType): Adapter | undefined {
    const entry = this.entries.get(name);
    return entry?.adapter;
  }

  has(name: AdapterType): boolean {
    return this.entries.has(name);
  }

  isEnabled(name: AdapterType): boolean {
    return this.entries.get(name)?.enabled ?? false;
  }

  setEnabled(name: AdapterType, enabled: boolean): void {
    const entry = this.entries.get(name);
    if (!entry) return;
    entry.enabled = enabled;
  }

  list(): Adapter[] {
    return Array.from(this.entries.values()).map((e) => e.adapter);
  }

  listPlugins(): PluginInfo[] {
    return Array.from(this.entries.values()).map((e) => ({
      ...e.adapter.metadata,
      enabled: e.enabled,
      source: e.source,
    }));
  }

  /** 有効なアダプタのメタ情報だけ返す (サイドパネル用) */
  listEnabledMetadata(): PluginInfo[] {
    return this.listPlugins().filter((p) => p.enabled);
  }
}

export const adapterRegistry = new AdapterRegistry();
export type { AdapterRegistry };
