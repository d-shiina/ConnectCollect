import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import { TriggerNode } from '../nodes/TriggerNode';
import { AdapterNode } from '../nodes/AdapterNode';
import { TransformNode } from '../nodes/TransformNode';
import type { AdapterRunStatus, AppNode } from '../nodes/types';
import { NODE_DRAG_MIME, type DragPayload } from './NodePanel';

interface Props {
  nodes: AppNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
  onAddNode: (payload: DragPayload, position: { x: number; y: number }) => void;
}

const InnerCanvas: React.FC<Props> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onAddNode,
}) => {
  const nodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      adapter: AdapterNode,
      transform: TransformNode,
    }),
    [],
  );

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(NODE_DRAG_MIME);
      if (!raw) return;
      let payload: DragPayload;
      try {
        payload = JSON.parse(raw) as DragPayload;
      } catch {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onAddNode(payload, position);
    },
    [onAddNode, screenToFlowPosition],
  );

  return (
    <div className="app-canvas" onDragOver={onDragOver} onDrop={onDrop}>
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

export const FlowCanvas: React.FC<Props> = (props) => {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  );
};

/** 指定ノードのステータスを更新 (アダプタ以外も対象) */
export function applyAdapterStatus(
  nodes: AppNode[],
  nodeId: string,
  status: AdapterRunStatus,
): AppNode[] {
  return nodes.map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, status } } : n,
  );
}

/** 指定ノードの入出力データをマージして新しい配列を返す */
export function applyNodeIo(
  nodes: AppNode[],
  nodeId: string,
  io: { input?: unknown; output?: unknown },
): AppNode[] {
  return nodes.map((n) => {
    if (n.id !== nodeId) return n;
    const data = { ...n.data };
    if (io.input !== undefined) data.lastInput = io.input;
    if (io.output !== undefined) data.lastOutput = io.output;
    return { ...n, data };
  });
}

/** 指定ノードから出ている (または入っている) エッジを animated にする */
export function setEdgesAnimatedForNode(
  edges: Edge[],
  activeNodeId: string | null,
): Edge[] {
  return edges.map((e) => {
    const active =
      activeNodeId !== null &&
      (e.source === activeNodeId || e.target === activeNodeId);
    return active === !!e.animated ? e : { ...e, animated: active };
  });
}

/** 全エッジのアニメーションをクリア */
export function clearEdgeAnimations(edges: Edge[]): Edge[] {
  return edges.map((e) => (e.animated ? { ...e, animated: false } : e));
}
