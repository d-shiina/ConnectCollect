import React from 'react';
import { Dialog } from '@base-ui-components/react/dialog';

interface Props {
  flowName: string;
  onSave: () => void;
  onRun: () => void;
  running: boolean;
}

export const Toolbar: React.FC<Props> = ({ flowName, onSave, onRun, running }) => {
  return (
    <header className="app-header">
      <h1>WinActor Cloud Bridge — {flowName}</h1>
      <div className="actions">
        <button className="btn" onClick={onSave} disabled={running}>
          保存
        </button>
        <button className="btn primary" onClick={onRun} disabled={running}>
          {running ? '実行中...' : '実行'}
        </button>
        <Dialog.Root>
          <Dialog.Trigger className="btn ghost">情報</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 100,
              }}
            />
            <Dialog.Popup
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--panel)',
                border: '1px solid var(--panel-border)',
                borderRadius: 8,
                padding: 24,
                minWidth: 360,
                zIndex: 101,
                color: 'var(--text)',
              }}
            >
              <Dialog.Title style={{ margin: 0, fontSize: 16 }}>
                WinActor Cloud Bridge
              </Dialog.Title>
              <Dialog.Description style={{ marginTop: 8, color: 'var(--text-dim)' }}>
                WinActor から HTTP 経由で各種 SaaS を操作するための橋渡しツールです。
                アダプタはプラグイン形式で追加できます。
              </Dialog.Description>
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Dialog.Close className="btn">閉じる</Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
};
