import { adapterRegistry } from './registry';
import { kintoneAdapter } from './kintone';
import { boxAdapter } from './box';
import type { Adapter } from './base';

/**
 * ビルトインアダプタ一覧。
 * ここに追記するだけで新しいアダプタがプラグインとして登録される。
 */
const builtInAdapters: Adapter[] = [kintoneAdapter, boxAdapter];

let initialized = false;

export function initializeAdapters(): void {
  if (initialized) return;
  for (const adapter of builtInAdapters) {
    adapterRegistry.register(adapter);
  }
  initialized = true;
}

export { adapterRegistry } from './registry';
export type { Adapter, AdapterConfig, AdapterInput, AdapterOutput } from './base';
