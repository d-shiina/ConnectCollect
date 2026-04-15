import { useEffect, useState } from 'react';
import { isElectron, rpc, type SystemHealth } from './api/client';

/**
 * Step 5 動作確認用 App。
 *
 * 起動時に rpc('system.health') を呼び、Python agent の応答を画面に表示する。
 * Step 6 以降でルーティング (シナリオ一覧 / エディタ / 実行ログ) に置き換える。
 */
export function App(): JSX.Element {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inElectron = isElectron();

  useEffect(() => {
    if (!inElectron) {
      setError(
        'Electron 外で起動されているため Python agent には接続できません',
      );
      return;
    }
    let cancelled = false;
    rpc<SystemHealth>('system.health')
      .then((result) => {
        if (!cancelled) setHealth(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [inElectron]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-100">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight">rpa-tool</h1>
        <p className="mt-2 text-sm text-slate-400">
          Step 5: Electron ↔ Python bridge
        </p>

        <div className="mt-8 rounded-lg border border-slate-700 bg-slate-800 p-4 text-left text-sm">
          {!inElectron && (
            <p className="text-amber-400">
              ⚠ {error ?? 'Electron 外環境'}
            </p>
          )}
          {inElectron && error && (
            <p className="text-rose-400">✖ agent error: {error}</p>
          )}
          {inElectron && !error && !health && (
            <p className="text-slate-400">⏳ system.health を呼び出し中…</p>
          )}
          {health && (
            <ul className="space-y-1">
              <li>
                <span className="text-slate-400">status:</span>{' '}
                <span className="text-emerald-400">{health.status}</span>
              </li>
              <li>
                <span className="text-slate-400">agent:</span>{' '}
                {health.agent_version}
              </li>
              <li>
                <span className="text-slate-400">python:</span>{' '}
                {health.python_version}
              </li>
              <li>
                <span className="text-slate-400">platform:</span>{' '}
                {health.platform}
              </li>
              <li>
                <span className="text-slate-400">uptime:</span>{' '}
                {health.uptime_seconds.toFixed(2)}s
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
