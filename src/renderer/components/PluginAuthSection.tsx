import React, { useEffect, useState } from 'react';
import type { PluginAuthMethod } from '../../shared/types';

interface Props {
  pluginName: string;
  auth: PluginAuthMethod | undefined;
}

interface FieldState {
  hasValue: boolean;
  draft: string;
  editing: boolean;
}

/**
 * プラグインが宣言した auth 方式に応じて認証 UI を出し分ける。
 *
 * - none: 何も表示しない
 * - static: 固定フィールドの入力フォーム
 * - oauth2: client_id / client_secret の入力 + 「接続」ボタン
 */
export const PluginAuthSection: React.FC<Props> = ({ pluginName, auth }) => {
  if (!auth || auth.type === 'none') {
    return (
      <div className="plugin-cred">
        <div className="plugin-detail-head">認証情報</div>
        <div className="muted">このプラグインは認証不要です。</div>
      </div>
    );
  }

  if (auth.type === 'static') {
    return <StaticAuthForm pluginName={pluginName} fields={auth.fields} />;
  }

  return <OAuth2Form pluginName={pluginName} auth={auth} />;
};

// ====== static ======

interface StaticProps {
  pluginName: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'string' | 'password' | 'number' | 'boolean';
    required: boolean;
    placeholder?: string;
  }>;
}

const StaticAuthForm: React.FC<StaticProps> = ({ pluginName, fields }) => {
  const [state, setState] = useState<Record<string, FieldState>>({});

  const refresh = async (): Promise<void> => {
    const next: Record<string, FieldState> = {};
    for (const f of fields) {
      const hasValue =
        (await window.bridge.credentialsHas(pluginName, f.key)) ?? false;
      next[f.key] = { hasValue, draft: '', editing: !hasValue };
    }
    setState(next);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginName]);

  const update = (key: string, patch: Partial<FieldState>): void => {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const save = async (key: string): Promise<void> => {
    const s = state[key];
    if (!s?.draft) return;
    await window.bridge.credentialsSet(pluginName, key, s.draft);
    update(key, { hasValue: true, draft: '', editing: false });
  };

  const clear = async (key: string): Promise<void> => {
    await window.bridge.credentialsDelete(pluginName, key);
    update(key, { hasValue: false, draft: '', editing: true });
  };

  return (
    <div className="plugin-cred">
      <div className="plugin-detail-head">認証情報 (static)</div>
      {fields.map((f) => {
        const s = state[f.key] ?? { hasValue: false, draft: '', editing: true };
        return (
          <div className="plugin-cred-row" key={f.key}>
            <div className="plugin-cred-head">
              <code>{f.key}</code>
              <span className="plugin-cred-label">{f.label}</span>
              <span
                className={`plugin-cred-status ${s.hasValue ? 'set' : 'unset'}`}
              >
                {s.hasValue ? '設定済み' : '未設定'}
              </span>
            </div>
            {s.editing ? (
              <div className="plugin-cred-edit">
                <input
                  type={f.type === 'password' ? 'password' : 'text'}
                  value={s.draft}
                  onChange={(e) => update(f.key, { draft: e.target.value })}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className="btn primary"
                  onClick={() => save(f.key)}
                  disabled={!s.draft}
                >
                  保存
                </button>
                {s.hasValue && (
                  <button
                    className="btn ghost"
                    onClick={() => update(f.key, { editing: false, draft: '' })}
                  >
                    キャンセル
                  </button>
                )}
              </div>
            ) : (
              <div className="plugin-cred-edit">
                <button
                  className="btn"
                  onClick={() => update(f.key, { editing: true })}
                >
                  変更
                </button>
                <button className="btn ghost" onClick={() => clear(f.key)}>
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

// ====== oauth2 ======

interface OAuth2Props {
  pluginName: string;
  auth: Extract<PluginAuthMethod, { type: 'oauth2' }>;
}

const OAuth2Form: React.FC<OAuth2Props> = ({ pluginName, auth }) => {
  const clientIdKey = auth.clientIdKey ?? 'clientId';
  const clientSecretKey = auth.clientSecretKey ?? 'clientSecret';
  const accessTokenKey = auth.accessTokenKey ?? 'accessToken';

  const [clientIdSet, setClientIdSet] = useState(false);
  const [clientSecretSet, setClientSecretSet] = useState(false);
  const [connected, setConnected] = useState(false);
  const [clientIdDraft, setClientIdDraft] = useState('');
  const [clientSecretDraft, setClientSecretDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    const [idSet, secretSet, tokenSet] = await Promise.all([
      window.bridge.credentialsHas(pluginName, clientIdKey),
      window.bridge.credentialsHas(pluginName, clientSecretKey),
      window.bridge.credentialsHas(pluginName, accessTokenKey),
    ]);
    setClientIdSet(idSet);
    setClientSecretSet(secretSet);
    setConnected(tokenSet);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginName]);

  const saveClient = async (): Promise<void> => {
    if (clientIdDraft) {
      await window.bridge.credentialsSet(
        pluginName,
        clientIdKey,
        clientIdDraft,
      );
    }
    if (clientSecretDraft) {
      await window.bridge.credentialsSet(
        pluginName,
        clientSecretKey,
        clientSecretDraft,
      );
    }
    setClientIdDraft('');
    setClientSecretDraft('');
    await refresh();
  };

  const connect = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await window.bridge.oauthStart(pluginName);
      if (result.success) {
        setMessage('認証しました');
      } else {
        setMessage(`認証失敗: ${result.error ?? 'unknown'}`);
      }
      await refresh();
    } catch (err) {
      setMessage(`認証失敗: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    await window.bridge.credentialsDelete(pluginName, accessTokenKey);
    await window.bridge.credentialsDelete(pluginName, 'refreshToken');
    await window.bridge.credentialsDelete(pluginName, 'expiresAt');
    await refresh();
    setMessage('切断しました');
  };

  return (
    <div className="plugin-cred">
      <div className="plugin-detail-head">認証情報 (OAuth 2.0)</div>

      <div className="plugin-cred-row">
        <div className="plugin-cred-head">
          <code>clientId / clientSecret</code>
          <span
            className={`plugin-cred-status ${clientIdSet && clientSecretSet ? 'set' : 'unset'}`}
          >
            {clientIdSet && clientSecretSet ? '設定済み' : '未設定'}
          </span>
        </div>
        <div className="plugin-cred-edit">
          <input
            type="text"
            value={clientIdDraft}
            placeholder={clientIdSet ? '(再設定する場合のみ入力)' : 'Client ID'}
            onChange={(e) => setClientIdDraft(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <input
            type="password"
            value={clientSecretDraft}
            placeholder={
              clientSecretSet ? '(再設定する場合のみ入力)' : 'Client Secret'
            }
            onChange={(e) => setClientSecretDraft(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="btn"
            onClick={saveClient}
            disabled={!clientIdDraft && !clientSecretDraft}
          >
            保存
          </button>
        </div>
      </div>

      <div className="plugin-cred-row">
        <div className="plugin-cred-head">
          <code>accessToken</code>
          <span className={`plugin-cred-status ${connected ? 'set' : 'unset'}`}>
            {connected ? '接続中' : '未接続'}
          </span>
        </div>
        <div className="plugin-cred-edit">
          <button
            className="btn primary"
            onClick={connect}
            disabled={!clientIdSet || !clientSecretSet || busy}
            title={
              !clientIdSet || !clientSecretSet
                ? '先に Client ID / Secret を保存してください'
                : ''
            }
          >
            {busy ? '認証中...' : connected ? '再接続' : '接続'}
          </button>
          {connected && (
            <button className="btn ghost" onClick={disconnect}>
              切断
            </button>
          )}
        </div>
        {message && (
          <div className="muted" style={{ marginTop: 6 }}>
            {message}
          </div>
        )}
        <div className="muted" style={{ marginTop: 6, fontSize: 10 }}>
          リダイレクト URI: <code>http://127.0.0.1:8765{auth.redirectPath ?? `/oauth/${pluginName}/callback`}</code>
        </div>
      </div>
    </div>
  );
};
