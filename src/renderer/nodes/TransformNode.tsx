import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TransformFlowNode } from './types';
import { NodeIoBox } from './NodeIoBox';

export const TransformNode: React.FC<NodeProps<TransformFlowNode>> = ({ data }) => {
  return (
    <div className={`rf-node transform ${data.status ?? 'idle'}`}>
      <Handle type="target" position={Position.Left} />
      <div className="label">{data.label || 'Transform'}</div>
      <div className="sub">データ変換</div>
      <NodeIoBox label="in" value={data.lastInput} />
      <NodeIoBox label="out" value={data.lastOutput} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
