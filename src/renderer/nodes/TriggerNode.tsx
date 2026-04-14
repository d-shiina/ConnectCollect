import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TriggerFlowNode } from './types';
import { NodeIoBox } from './NodeIoBox';

export const TriggerNode: React.FC<NodeProps<TriggerFlowNode>> = ({ data }) => {
  return (
    <div className={`rf-node trigger ${data.status ?? 'idle'}`}>
      <div className="label">{data.label || 'Trigger'}</div>
      <div className="sub">WinActor からの呼び出し</div>
      <NodeIoBox label="in" value={data.lastInput} />
      <NodeIoBox label="out" value={data.lastOutput} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
