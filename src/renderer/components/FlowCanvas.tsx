import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Connection,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import { TriggerNode } from '../nodes/TriggerNode';
import { AdapterNode } from '../nodes/AdapterNode';
import { TransformNode } from '../nodes/TransformNode';
import type { AdapterRunStatus, AppNode } from '../nodes/types';

interface Props {
  nodes: AppNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
}

export const FlowCanvas: React.FC<Props> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}) => {
  const nodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      adapter: AdapterNode,
      transform: TransformNode,
    }),
    [],
  );

  return (
    <div className="app-canvas">
      <ReactFlow<AppNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background gap={18} size={1} color="#2a303f" />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export function applyAdapterStatus(
  nodes: AppNode[],
  nodeId: string,
  status: AdapterRunStatus,
): AppNode[] {
  return nodes.map((n) => {
    if (n.id !== nodeId) return n;
    if (n.type !== 'adapter') return n;
    return { ...n, data: { ...n.data, status } };
  });
}
