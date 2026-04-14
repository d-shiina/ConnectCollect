import { EventEmitter } from 'node:events';
import type { FlowEvent } from '../shared/types';

/**
 * フロー実行イベントを Main プロセス内で配信するシングルトンバス。
 * - flowEngine が emit
 * - index.ts (Electron main) が購読して BrowserWindow に forward
 */
class FlowEventBus extends EventEmitter {
  emitEvent(event: FlowEvent): void {
    this.emit('flow-event', event);
  }

  onEvent(listener: (event: FlowEvent) => void): () => void {
    this.on('flow-event', listener);
    return () => this.off('flow-event', listener);
  }
}

export const flowEventBus = new FlowEventBus();
// Electron のメインプロセスは長寿命なのでリスナー上限を上げておく
flowEventBus.setMaxListeners(50);
