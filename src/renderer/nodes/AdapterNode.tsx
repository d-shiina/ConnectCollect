import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AdapterFlowNode, AdapterRunStatus } from './types';

export type { AdapterRunStatus } from './types';

export const AdapterNode: React.FC<NodeProps<AdapterFlowNode>> = ({ data }) => {
  const status: AdapterRunStatus = data.status ?? 'idle';
  return (
    <div className={`rf-node adapter ${status}`}>
      <Handle type="target" position={Position.Left} />
      <div className="label">{data.label || 'Adapter'}</div>
      <div className="sub">{data.adapterType ?? '—'}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
