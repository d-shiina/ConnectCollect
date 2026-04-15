import { BrowserWindow } from 'electron';
import path from 'node:path';

/**
 * メインウィンドウを生成する。
 *
 * Step 2 時点では空の HTML を読み込む。Step 3 で Vite dev server URL に切り替える。
 *
 * セキュリティ既定値:
 *   - contextIsolation: true
 *   - nodeIntegration: false
 *   - sandbox: true
 *
 * Renderer から main へ届く API は preload.ts の contextBridge 経由のみ。
 */
export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'rpa-tool',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Step 2 placeholder: data URL でプレースホルダ HTML を読む。
  // Step 3 で Vite dev server に置き換える。
  const placeholderHtml = encodeURIComponent(
    `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>rpa-tool</title>
    <style>
      body { font-family: -apple-system, system-ui, sans-serif;
             display: flex; align-items: center; justify-content: center;
             height: 100vh; margin: 0; background: #1e1e2e; color: #cdd6f4; }
      .box { text-align: center; }
      .box h1 { font-size: 32px; margin: 0 0 8px; }
      .box p  { opacity: 0.7; margin: 0; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>rpa-tool</h1>
      <p>Step 2: Electron window placeholder</p>
    </div>
  </body>
</html>`,
  );
  win.loadURL(`data:text/html;charset=utf-8,${placeholderHtml}`);

  return win;
}
