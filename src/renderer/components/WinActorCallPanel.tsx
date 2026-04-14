import React, { useMemo, useState } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import type { FlowInputDef } from '../../shared/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
  serverPort: number;
  inputSchema: FlowInputDef[];
  onInputSchemaChange: (next: FlowInputDef[]) => void;
}

type Mode = 'query' | 'form' | 'json';

/** WinActor の変数プレースホルダ表記 (%変数名%) 付きで URL/Body を組み立てる */
function buildWinActorTemplate(
  port: number,
  flowId: string,
  schema: FlowInputDef[],
  mode: Mode,
): { method: string; url: string; headers: Array<[string, string]>; body: string } {
  const base = `http://127.0.0.1:${port}/flows/${flowId || '<flowId>'}/run`;

  const placeholder = (def: FlowInputDef): string => {
    // WinActor の変数を想定: %変数名% 形式
    return `%${def.label || def.key}%`;
  };

  if (mode === 'query') {
    const qs = schema
      .filter((s) => s.key.trim() !== '')
      .map((s) => `${encodeURIComponent(s.key)}=${placeholder(s)}`)
      .join('&');
    return {
      method: 'POST',
      url: qs ? `${base}?${qs}` : base,
      headers: [],
      body: '',
    };
  }

  if (mode === 'form') {
    const body = schema
      .filter((s) => s.key.trim() !== '')
      .map((s) => `${encodeURIComponent(s.key)}=${placeholder(s)}`)
      .join('&');
    return {
      method: 'POST',
      url: base,
      headers: [['Content-Type', 'application/x-www-form-urlencoded']],
      body,
    };
  }

  // json
  const obj: Record<string, string> = {};
  for (const s of schema) {
    if (s.key.trim() === '') continue;
    obj[s.key] = placeholder(s);
  }
  return {
    method: 'POST',
    url: base,
    headers: [['Content-Type', 'application/json']],
    body: JSON.stringify({ inputs: obj }, null, 2),
  };
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('clipboard copy failed', err);
  }
}

const CopyField: React.FC<{ label: string; value: string; multiline?: boolean }> = ({
  label,
  value,
  multiline,
}) => {
  const [copied, setCopied] = useState(false);
  const onCopy = (): void => {
    copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="copy-field">
      <div className="copy-field-head">
        <span>{label}</span>
        <button className="btn" onClick={onCopy} disabled={!value}>
          {copied ? 'コピーしました' : 'コピー'}
        </button>
      </div>
      {multiline ? (
        <pre className="copy-field-value multiline">{value || '(なし)'}</pre>
      ) : (
        <code className="copy-field-value">{value || '(なし)'}</code>
      )}
    </div>
  );
};

export const WinActorCallPanel: React.FC<Props> = ({
  open,
  onOpenChange,
  flowId,
  serverPort,
  inputSchema,
  onInputSchemaChange,
}) => {
  const [mode, setMode] = useState<Mode>('query');

  const template = useMemo(
    () => buildWinActorTemplate(serverPort, flowId, inputSchema, mode),
    [serverPort, flowId, inputSchema, mode],
  );

  const updateDef = (index: number, patch: Partial<FlowInputDef>): void => {
    const next = inputSchema.map((d, i) => (i === index ? { ...d, ...patch } : d));
    onInputSchemaChange(next);
  };
  const addDef = (): void => {
    onInputSchemaChange([
      ...inputSchema,
      { key: `param${inputSchema.length + 1}`, label: '', example: '' },
    ]);
  };
  const removeDef = (index: number): void => {
    onInputSchemaChange(inputSchema.filter((_, i) => i !== index));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog-popup dialog-wide">
          <Dialog.Title className="dialog-title">
            WinActor からの呼び出し方
          </Dialog.Title>
          <Dialog.Description className="dialog-desc">
            WinActor の HTTP ノードにそのまま貼れる形でテンプレートを生成します。
            <code>%変数名%</code> の部分を WinActor の変数名に合わせてください。
          </Dialog.Description>

          <div className="dialog-section">
            <div className="dialog-section-head">入力パラメータ</div>
            {inputSchema.length === 0 && (
              <div className="muted">
                パラメータ未定義です。下の「+ 追加」から WinActor で渡したい
                変数を定義してください。
              </div>
            )}
            {inputSchema.map((def, i) => (
              <div className="input-def-row" key={i}>
                <input
                  type="text"
                  value={def.key}
                  onChange={(e) => updateDef(i, { key: e.target.value })}
                  placeholder="key (query など)"
                />
                <input
                  type="text"
                  value={def.label ?? ''}
                  onChange={(e) => updateDef(i, { label: e.target.value })}
                  placeholder="WinActor 変数名 (任意)"
                />
                <button className="btn ghost" onClick={() => removeDef(i)}>
                  ✕
                </button>
              </div>
            ))}
            <button className="btn" onClick={addDef}>
              + 追加
            </button>
          </div>

          <div className="dialog-section">
            <div className="dialog-section-head">呼び出し方式</div>
            <div className="mode-tabs">
              <button
                className={`btn ${mode === 'query' ? 'primary' : ''}`}
                onClick={() => setMode('query')}
              >
                クエリ文字列 (おすすめ)
              </button>
              <button
                className={`btn ${mode === 'form' ? 'primary' : ''}`}
                onClick={() => setMode('form')}
              >
                form-urlencoded
              </button>
              <button
                className={`btn ${mode === 'json' ? 'primary' : ''}`}
                onClick={() => setMode('json')}
              >
                JSON body
              </button>
            </div>
          </div>

          <div className="dialog-section">
            <CopyField label="Method" value={template.method} />
            <CopyField label="URL" value={template.url} />
            {template.headers.map(([k, v], idx) => (
              <CopyField key={idx} label={`Header: ${k}`} value={v} />
            ))}
            {template.body && (
              <CopyField label="Body" value={template.body} multiline />
            )}
          </div>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Dialog.Close className="btn">閉じる</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
