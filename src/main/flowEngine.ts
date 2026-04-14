import type {
  FlowDefinition,
  FlowNode,
  FlowRunResult,
  LogEntry,
} from '../shared/types';
import { adapterRegistry } from './adapters';

/**
 * 有向グラフからトポロジカル順で実行順序を決定する。
 * 現状は直列実行のみ想定 (1 入力 / 1 出力 のチェーン)。
 */
function computeExecutionOrder(flow: FlowDefinition): FlowNode[] {
  const nodeMap = new Map(flow.nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of flow.nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  }
  for (const edge of flow.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }

  const queue: string[] = [];
  for (const [id, n] of incoming) {
    if (n === 0) queue.push(id);
  }

  const order: FlowNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const node = nodeMap.get(id);
    if (node) order.push(node);
    for (const next of outgoing.get(id) ?? []) {
      const remaining = (incoming.get(next) ?? 0) - 1;
      incoming.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  if (order.length !== flow.nodes.length) {
    throw new Error('フローにサイクル、または孤立ノードがあります');
  }
  return order;
}

function makeLog(
  level: LogEntry['level'],
  message: string,
  nodeId?: string,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    nodeId,
    message,
  };
}

export async function executeFlow(
  flow: FlowDefinition,
  inputs: Record<string, unknown>,
): Promise<FlowRunResult> {
  const logs: LogEntry[] = [];
  logs.push(makeLog('info', `フロー "${flow.name}" の実行を開始`));

  let currentPayload: Record<string, unknown> = { ...inputs };

  try {
    const order = computeExecutionOrder(flow);

    for (const node of order) {
      logs.push(makeLog('info', `ノード ${node.data.label} を実行`, node.id));

      switch (node.type) {
        case 'trigger': {
          // トリガーノードはインプットをそのまま通す
          logs.push(
            makeLog('info', 'トリガーノード: 入力をパススルー', node.id),
          );
          break;
        }
        case 'adapter': {
          const adapterType = node.data.adapterType;
          if (!adapterType) {
            throw new Error(`アダプタ種別が未設定です (node=${node.id})`);
          }
          const adapter = adapterRegistry.get(adapterType);
          if (!adapter) {
            throw new Error(
              `アダプタが登録されていません: ${adapterType} (node=${node.id})`,
            );
          }
          const output = await adapter.execute(
            node.data.config ?? {},
            currentPayload,
          );
          if (!output.success) {
            logs.push(
              makeLog(
                'error',
                `${adapter.name} エラー: ${output.error ?? 'unknown'}`,
                node.id,
              ),
            );
            throw new Error(output.error ?? `${adapter.name} adapter failed`);
          }
          logs.push(
            makeLog('info', `${adapter.name} 成功`, node.id),
          );
          currentPayload = {
            ...currentPayload,
            [`${adapter.name}Result`]: output.data,
            last: output.data,
          };
          break;
        }
        case 'transform': {
          // プレースホルダ: 現状は入力そのまま
          logs.push(
            makeLog(
              'info',
              '変換ノード: 現時点では入力をそのまま通します',
              node.id,
            ),
          );
          break;
        }
        default: {
          logs.push(
            makeLog('warn', `未知のノード種別: ${node.type}`, node.id),
          );
        }
      }
    }

    logs.push(makeLog('info', 'フロー実行完了'));
    return {
      success: true,
      flowId: flow.id,
      outputs: currentPayload,
      executedAt: new Date().toISOString(),
      logs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(makeLog('error', `フロー実行失敗: ${message}`));
    return {
      success: false,
      flowId: flow.id,
      error: message,
      executedAt: new Date().toISOString(),
      logs,
    };
  }
}
