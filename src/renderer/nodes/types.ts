import type { Node } from '@xyflow/react';
import type { NodeData } from '../../shared/types';

export type AdapterRunStatus = 'idle' | 'running' | 'success' | 'error';

export interface AdapterNodeData extends NodeData {
  status?: AdapterRunStatus;
  [key: string]: unknown;
}

export interface TriggerNodeData extends NodeData {
  [key: string]: unknown;
}

export interface TransformNodeData extends NodeData {
  [key: string]: unknown;
}

export type TriggerFlowNode = Node<TriggerNodeData, 'trigger'>;
export type AdapterFlowNode = Node<AdapterNodeData, 'adapter'>;
export type TransformFlowNode = Node<TransformNodeData, 'transform'>;

export type AppNode = TriggerFlowNode | AdapterFlowNode | TransformFlowNode;
