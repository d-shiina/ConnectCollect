import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TriggerFlowNode } from './types';

export const TriggerNode: React.FC<NodeProps<TriggerFlowNode>> = ({ data }) => {
  return (
    <div className="rf-node trigger">
      <div className="label">{data.label || 'Trigger'}</div>
      <div className="sub">WinActor からの呼び出し</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
