import React, { useEffect, useState } from 'react';
import type { AdapterConfigFieldSchema } from '../../shared/types';

interface Props {
  pluginName: string;
  schema: AdapterConfigFieldSchema[];
}

interface FieldState {
  hasValue: boolean;
  draft: string;
  editing: boolean;
}

/**
 * 指定プラグイン (scope) の認証情報を編集する小さなフォーム。
 * - 生の値は Renderer に取得しない ((設定済み) / (未設定) だけ表示)
 * - 新しい値を入力して保存するか、クリアボタンで削除する
 */
export const PluginCredentials: React.FC<Props> = ({ pluginName, schema }) => {
  const [state, setState] = useState<Record<string, FieldState>>({});

  const refresh = async (): Promise<void> => {
    const next: Record<string, FieldState> = {};
    for (const field of schema) {
      const hasValue = (await window.bridge.credentialsHas(
        pluginName,
        field.key,
      )) ?? false;
      next[field.key] = {
        hasValue,
        draft: '',
        editing: !hasValue,
      };
    }
    setState(next);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginName, schema.length]);

  const update = (key: string, patch: Partial<FieldState>): void => {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const save = async (key: string): Promise<void> => {
    const field = state[key];
    if (!field || !field.draft) return;
    await window.bridge.credentialsSet(pluginName, key, field.draft);
    update(key, { hasValue: true, draft: '', editing: false });
  };

  const clear = async (key: string): Promise<void> => {
    await window.bridge.credentialsDelete(pluginName, key);
    update(key, { hasValue: false, draft: '', editing: true });
  };

  if (schema.length === 0) return null;

  return (
    <div className="plugin-cred">
      <div className="plugin-detail-head">認証情報</div>
      {schema.map((field) => {
        const s = state[field.key] ?? {
          hasValue: false,
          draft: '',
          editing: true,
        };
        return (
          <div className="plugin-cred-row" key={field.key}>
            <div className="plugin-cred-head">
              <code>{field.key}</code>
              <span className="plugin-cred-label">{field.label}</span>
              {s.hasValue ? (
                <span className="plugin-cred-status set">設定済み</span>
              ) : (
                <span className="plugin-cred-status unset">未設定</span>
              )}
            </div>
            {s.editing ? (
              <div className="plugin-cred-edit">
                <input
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={s.draft}
                  onChange={(e) => update(field.key, { draft: e.target.value })}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className="btn primary"
                  onClick={() => save(field.key)}
                  disabled={!s.draft}
                >
                  保存
                </button>
                {s.hasValue && (
                  <button
                    className="btn ghost"
                    onClick={() => update(field.key, { editing: false, draft: '' })}
                  >
                    キャンセル
                  </button>
                )}
              </div>
            ) : (
              <div className="plugin-cred-edit">
                <button
                  className="btn"
                  onClick={() => update(field.key, { editing: true })}
                >
                  変更
                </button>
                <button className="btn ghost" onClick={() => clear(field.key)}>
                  クリア
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
