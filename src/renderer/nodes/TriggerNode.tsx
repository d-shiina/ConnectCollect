import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TriggerFlowNode } from './types';
import { NodeIoBox } from './NodeIoBox';

export const TriggerNode: React.FC<NodeProps<TriggerFlowNode>> = ({ data }) => {
  const status = data.status ?? 'idle';
  return (
    <div className={`rf-node trigger ${status}`}>
      <div className="rf-node-header">
        <span className="rf-node-title">{data.label || 'Trigger'}</span>
        <span className="rf-node-type">TRIGGER</span>
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
