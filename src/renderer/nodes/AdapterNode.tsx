import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AdapterFlowNode, AdapterRunStatus } from './types';
import { NodeIoBox } from './NodeIoBox';

export type { AdapterRunStatus } from './types';

export const AdapterNode: React.FC<NodeProps<AdapterFlowNode>> = ({ data }) => {
  const status: AdapterRunStatus = data.status ?? 'idle';
  return (
    <div className={`rf-node adapter ${status}`}>
      <div className="rf-node-header">
        <span className="rf-node-title">{data.label || 'Adapter'}</span>
        <span className="rf-node-type">{(data.adapterType ?? 'ADAPTER').toUpperCase()}</span>
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
        <NodeIoBox label="in" value={data.lastInput} />
        <NodeIoBox label="out" value={data.lastOutput} />
      </div>
    </div>
  );
};
