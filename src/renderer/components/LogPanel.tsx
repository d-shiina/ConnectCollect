import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../../shared/types';

interface Props {
  logs: LogEntry[];
}

export const LogPanel: React.FC<Props> = ({ logs }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <section className="app-logs">
      <div className="log-header">
        <span>実行ログ</span>
        <span>{logs.length} entries</span>
      </div>
      <div className="log-list" ref={ref}>
        {logs.length === 0 && (
          <div className="log-entry info">
            <span className="time">--:--:--</span>
            ログはまだありません。フローを実行するとここに表示されます。
          </div>
        )}
        {logs.map((entry, idx) => (
          <div key={idx} className={`log-entry ${entry.level}`}>
            <span className="time">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            {entry.nodeId ? `[${entry.nodeId}] ` : ''}
            {entry.message}
          </div>
        ))}
      </div>
    </section>
  );
};
