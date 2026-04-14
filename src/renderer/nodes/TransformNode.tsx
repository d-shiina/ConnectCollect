import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TransformFlowNode } from './types';

export const TransformNode: React.FC<NodeProps<TransformFlowNode>> = ({ data }) => {
  return (
    <div className="rf-node transform">
      <Handle type="target" position={Position.Left} />
      <div className="label">{data.label || 'Transform'}</div>
      <div className="sub">データ変換</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
