import React from 'react';

interface Props {
  flowId: string;
  flowName: string;
  onFlowIdChange: (id: string) => void;
  onSave: () => void;
  onRun: () => void;
  onOpenWinActorPanel: () => void;
  onOpenPluginManager: () => void;
  running: boolean;
}

/** フロー ID として許可する文字 (URL に直接埋め込めるもの) */
const FLOW_ID_PATTERN = /^[a-zA-Z0-9_-]*$/;

export const Toolbar: React.FC<Props> = ({
  flowId,
  flowName,
  onFlowIdChange,
  onSave,
  onRun,
  onOpenWinActorPanel,
  onOpenPluginManager,
  running,
}) => {
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value;
    if (FLOW_ID_PATTERN.test(next)) {
      onFlowIdChange(next);
    }
  };

  return (
    <header className="app-header">
      <h1>WinActor Cloud Bridge — {flowName}</h1>
      <div className="flow-id-field">
        <label htmlFor="flow-id-input">flowId</label>
        <input
          id="flow-id-input"
          type="text"
          value={flowId}
          onChange={handleIdChange}
          spellCheck={false}
          disabled={running}
          placeholder="sample-flow"
        />
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onOpenPluginManager}>
          プラグイン
        </button>
        <button className="btn ghost" onClick={onOpenWinActorPanel}>
          WinActor 呼び出し
        </button>
        <button className="btn" onClick={onSave} disabled={running}>
          保存
        </button>
        <button className="btn primary" onClick={onRun} disabled={running}>
          {running ? '実行中...' : '実行'}
        </button>
      </div>
    </header>
  );
};
