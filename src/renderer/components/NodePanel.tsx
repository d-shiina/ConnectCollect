import React from 'react';
import type { AdapterMetadata } from '../../shared/types';

interface Props {
  adapters: AdapterMetadata[];
}

export interface DragPayload {
  nodeType: 'trigger' | 'adapter' | 'transform';
  adapterType?: string;
  label: string;
}

const MIME = 'application/x-connectcollect-node';

const onDragStart = (
  e: React.DragEvent<HTMLDivElement>,
  payload: DragPayload,
): void => {
  e.dataTransfer.setData(MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'copy';
};

export const NodePanel: React.FC<Props> = ({ adapters }) => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-section">
        <h2>基本ノード</h2>
        <div
          className="node-chip"
          draggable
          onDragStart={(e) =>
            onDragStart(e, { nodeType: 'trigger', label: 'Trigger' })
          }
        >
          <span className="dot" />
          Trigger
        </div>
        <div
          className="node-chip"
          draggable
          onDragStart={(e) =>
            onDragStart(e, { nodeType: 'transform', label: 'Transform' })
          }
        >
          <span className="dot" />
          Transform
        </div>
      </div>
      <div className="sidebar-section">
        <h2>アダプタ ({adapters.length})</h2>
        {adapters.length === 0 && (
          <div className="node-chip" style={{ cursor: 'default', opacity: 0.6 }}>
            読み込み中...
          </div>
        )}
        {adapters.map((a) => (
          <div
            className="node-chip"
            key={a.name}
            title={a.description}
            draggable
            onDragStart={(e) =>
              onDragStart(e, {
                nodeType: 'adapter',
                adapterType: a.name,
                label: a.displayName,
              })
            }
          >
            <span className="dot" />
            {a.displayName}
          </div>
        ))}
      </div>
      <div className="sidebar-section sidebar-hint">
        ドラッグしてキャンバスに配置
      </div>
    </aside>
  );
};

export { MIME as NODE_DRAG_MIME };
