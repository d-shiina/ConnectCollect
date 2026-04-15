import React, { useMemo } from 'react';
import type {
  AdapterConfigFieldSchema,
  AdapterMetadata,
} from '../../shared/types';
import type { AppNode } from '../nodes/types';

interface Props {
  node: AppNode | null;
  adapters: AdapterMetadata[];
  onUpdateNode: (
    id: string,
    patch: { label?: string; config?: Record<string, unknown> },
  ) => void;
  onClose: () => void;
}

/**
 * 選択中のノードのプロパティを編集するサイドパネル。
 * - 非アダプタノード (trigger/transform): label のみ編集可
 * - アダプタノード: プラグインの configSchema に沿ってフィールドを動的生成
 */
export const NodeInspector: React.FC<Props> = ({
  node,
  adapters,
  onUpdateNode,
  onClose,
}) => {
  const adapter = useMemo<AdapterMetadata | null>(() => {
    if (!node || node.type !== 'adapter') return null;
    const t = (node.data as { adapterType?: string }).adapterType;
    return adapters.find((a) => a.name === t) ?? null;
  }, [node, adapters]);

  if (!node) return null;

  const nodeLabel = node.data.label ?? '';
  const config =
    ('config' in node.data && (node.data.config as Record<string, unknown>)) ||
    {};

  const updateLabel = (label: string): void => {
    onUpdateNode(node.id, { label });
  };

  const updateConfigField = (key: string, value: unknown): void => {
    onUpdateNode(node.id, { config: { ...config, [key]: value } });
  };

  const renderField = (field: AdapterConfigFieldSchema): React.ReactNode => {
    const value = config[field.key];
    const strValue = typeof value === 'string' ? value : (value ?? '').toString();

    if (field.type === 'boolean') {
      return (
        <label className="inspector-row checkbox">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => updateConfigField(field.key, e.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    }

    return (
      <label className="inspector-row">
        <span className="inspector-label">
          {field.label}
          {field.required && <span className="required">*</span>}
        </span>
        <input
          type={field.type === 'password' ? 'password' : 'text'}
          value={strValue}
          onChange={(e) =>
            updateConfigField(
              field.key,
              field.type === 'number' ? Number(e.target.value) : e.target.value,
            )
          }
          placeholder={field.placeholder}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
    );
  };

  return (
    <aside className="app-inspector">
      <div className="inspector-header">
        <div>
          <div className="inspector-title">{nodeLabel || node.type}</div>
          <div className="inspector-subtitle">
            {node.type}
            {adapter ? ` · ${adapter.displayName}` : ''}
          </div>
        </div>
        <button className="btn ghost" onClick={onClose} title="閉じる">
          ×
        </button>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-head">共通</div>
        <label className="inspector-row">
          <span className="inspector-label">ラベル</span>
          <input
            type="text"
            value={nodeLabel}
            onChange={(e) => updateLabel(e.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="inspector-row readonly">
          <span className="inspector-label">ノード ID</span>
          <code>{node.id}</code>
        </div>
      </div>

      {node.type === 'adapter' && (
        <div className="inspector-section">
          <div className="inspector-section-head">
            アダプタ設定
            {adapter && <span className="adapter-tag">{adapter.name}</span>}
          </div>
          {!adapter && (
            <div className="muted">
              adapterType が未設定です。metadata を解決できません。
            </div>
          )}
          {adapter && adapter.configSchema.length === 0 && (
            <div className="muted">このアダプタに設定項目はありません。</div>
          )}
          {adapter &&
            adapter.configSchema.map((f) => (
              <React.Fragment key={f.key}>{renderField(f)}</React.Fragment>
            ))}
          {adapter?.description && (
            <div className="muted adapter-desc">{adapter.description}</div>
          )}
        </div>
      )}

      {node.type === 'trigger' && (
        <div className="inspector-section">
          <div className="inspector-section-head">トリガー設定</div>
          <div className="muted">
            現状はパラメータなし。WinActor からの HTTP リクエスト で起動します。
          </div>
        </div>
      )}

      {node.type === 'transform' && (
        <div className="inspector-section">
          <div className="inspector-section-head">変換設定</div>
          <div className="muted">
            変換ノードはまだプレースホルダ実装です (入力をそのまま通過)。
          </div>
        </div>
      )}
    </aside>
  );
};
