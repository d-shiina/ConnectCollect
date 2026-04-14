import React from 'react';

interface Props {
  label: 'in' | 'out';
  value: unknown;
}

function formatValue(v: unknown): string {
  if (v === undefined) return '(none)';
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/**
 * ノード上に入出力データを表示する小さなコラプス可能ボックス。
 * クリックで展開/折り畳み。
 */
export const NodeIoBox: React.FC<Props> = ({ label, value }) => {
  if (value === undefined) return null;
  return (
    <details className={`io-box io-${label}`}>
      <summary>
        <span className="io-label">{label}</span>
      </summary>
      <pre className="io-pre">{formatValue(value)}</pre>
    </details>
  );
};
