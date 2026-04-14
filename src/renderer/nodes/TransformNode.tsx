import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TransformFlowNode } from './types';
import { NodeIoBox } from './NodeIoBox';

export const TransformNode: React.FC<NodeProps<TransformFlowNode>> = ({ data }) => {
  const status = data.status ?? 'idle';
  return (
    <div className={`rf-node transform ${status}`}>
      <div className="rf-node-header">
        <span className="rf-node-title">{data.label || 'Transform'}</span>
        <span className="rf-node-type">TRANSFORM</span>
      </div>
      <div className="rf-node-body">
        <div className="rf-socket rf-socket-in">
          <Handle
            type="target"
            position={Position.Left}
            className="rf-handle rf-handle-in"
          />
          <span className="rf-socket-label">input</span>
        </div>
        <div className="rf-socket rf-socket-out">
          <span className="rf-socket-label">output</span>
          <Handle
            type="source"
            position={Position.Right}
            className="rf-handle rf-handle-out"
          />
        </div>
        <div className="rf-node-sub">データ変換</div>
        <NodeIoBox label="in" value={data.lastInput} />
        <NodeIoBox label="out" value={data.lastOutput} />
      </div>
    </div>
  );
};
