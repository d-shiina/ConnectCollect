import type { Node } from '@xyflow/react';
import type { NodeData } from '../../shared/types';

export type AdapterRunStatus = 'idle' | 'running' | 'success' | 'error';

/** 実行中に Main から push される入出力スナップショット */
export interface NodeRuntimeData {
  status?: AdapterRunStatus;
  lastInput?: unknown;
  lastOutput?: unknown;
}

export interface AdapterNodeData extends NodeData, NodeRuntimeData {
  [key: string]: unknown;
}

export interface TriggerNodeData extends NodeData, NodeRuntimeData {
  [key: string]: unknown;
}

export interface TransformNodeData extends NodeData, NodeRuntimeData {
  [key: string]: unknown;
}

export type TriggerFlowNode = Node<TriggerNodeData, 'trigger'>;
export type AdapterFlowNode = Node<AdapterNodeData, 'adapter'>;
export type TransformFlowNode = Node<TransformNodeData, 'transform'>;

export type AppNode = TriggerFlowNode | AdapterFlowNode | TransformFlowNode;
