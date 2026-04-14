import React from 'react';
import type { AdapterMetadata } from '../../shared/types';

interface Props {
  adapters: AdapterMetadata[];
}

export const NodePanel: React.FC<Props> = ({ adapters }) => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-section">
        <h2>基本ノード</h2>
        <div className="node-chip">
          <span className="dot" />
          Trigger
        </div>
        <div className="node-chip">
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
          <div className="node-chip" key={a.name} title={a.description}>
            <span className="dot" />
            {a.displayName}
          </div>
        ))}
      </div>
    </aside>
  );
};
