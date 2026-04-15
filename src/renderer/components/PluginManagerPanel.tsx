import React, { useEffect, useState } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import type { PluginInfo } from '../../shared/types';
import { PluginAuthSection } from './PluginAuthSection';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPluginsChanged?: () => void;
}

export const PluginManagerPanel: React.FC<Props> = ({
  open,
  onOpenChange,
  onPluginsChanged,
}) => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    try {
      const list = (await window.bridge?.listPlugins()) ?? [];
      setPlugins(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const toggle = async (name: string, enabled: boolean): Promise<void> => {
    await window.bridge.setPluginEnabled(name, enabled);
    setPlugins((prev) =>
      prev.map((p) => (p.name === name ? { ...p, enabled } : p)),
    );
    onPluginsChanged?.();
  };

  const openDir = async (): Promise<void> => {
    await window.bridge.openPluginDir();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog-popup dialog-wide">
          <Dialog.Title className="dialog-title">プラグイン管理</Dialog.Title>
          <Dialog.Description className="dialog-desc">
            登録されているアダプタプラグインの一覧です。トグルで有効/無効を
            切り替えると、対応するノードがフロー実行時に実行可否を決定します。
          </Dialog.Description>

          <div className="dialog-section">
            <div className="dialog-section-head">
              プラグイン ({plugins.length})
            </div>
            {loading && <div className="muted">読み込み中...</div>}
            {!loading && plugins.length === 0 && (
              <div className="muted">登録されたプラグインはありません。</div>
            )}
            <div className="plugin-list">
              {plugins.map((p) => (
                <div
                  key={p.name}
                  className={`plugin-row ${p.enabled ? 'enabled' : 'disabled'}`}
                >
                  <div className="plugin-row-main">
                    <div className="plugin-row-title">
                      <span className="plugin-name">{p.displayName}</span>
                      <span className="plugin-id">{p.name}</span>
                      <span className={`plugin-source source-${p.source}`}>
                        {p.source}
                      </span>
                    </div>
                    <div className="plugin-desc">{p.description}</div>
                  </div>
                  <div className="plugin-row-actions">
                    <button
                      className="btn ghost"
                      onClick={() =>
                        setExpanded(expanded === p.name ? null : p.name)
                      }
                    >
                      {expanded === p.name ? '閉じる' : '詳細'}
                    </button>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => toggle(p.name, e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  {expanded === p.name && (
                    <div className="plugin-detail">
                      <div className="plugin-detail-head">Config schema</div>
                      {p.configSchema.length === 0 ? (
                        <div className="muted">(設定項目なし)</div>
                      ) : (
                        <ul className="plugin-schema">
                          {p.configSchema.map((s) => (
                            <li key={s.key}>
                              <code>{s.key}</code>
                              <span className="plugin-schema-type">
                                {s.type}
                                {s.required && ' *'}
                              </span>
                              <span className="plugin-schema-label">
                                {s.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <PluginAuthSection pluginName={p.name} auth={p.auth} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="dialog-section">
            <div className="dialog-section-head">プラグインフォルダ</div>
            <div className="muted">
              将来的にはこのフォルダに JS ファイルを放り込むと動的に
              ロードされるようにする予定です。現状はフォルダを開くだけです。
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={openDir}>
                フォルダを開く
              </button>
              <button className="btn" onClick={refresh}>
                再読み込み
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Dialog.Close className="btn">閉じる</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
