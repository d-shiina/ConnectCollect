import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { TriggerFlowNode } from './types';
import { NodeIoBox } from './NodeIoBox';

export const TriggerNode: React.FC<NodeProps<TriggerFlowNode>> = ({
  id,
  data,
}) => {
  const status = data.status ?? 'idle';
  const { deleteElements } = useReactFlow();
  const onDelete = (e: React.MouseEvent): void => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };
  return (
    <div className={`rf-node trigger ${status}`}>
      <div className="rf-node-header">
        <span className="rf-node-title">{data.label || 'Trigger'}</span>
        <span className="rf-node-type">TRIGGER</span>
        <button
          className="rf-node-delete"
          onClick={onDelete}
          onPointerDown={(e) => e.stopPropagation()}
          title="削除"
        >
          ×
        </button>
      </div>
      <div className="rf-node-body">
        <div className="rf-socket rf-socket-out">
          <span className="rf-socket-label">output</span>
          <Handle
            type="source"
            position={Position.Right}
            className="rf-handle rf-handle-out"
          />
        </div>
        <div className="rf-node-sub">WinActor からの呼び出し</div>
        <NodeIoBox label="in" value={data.lastInput} />
        <NodeIoBox label="out" value={data.lastOutput} />
      </div>
    </div>
  );
};
