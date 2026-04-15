import { BrowserWindow } from 'electron';
import path from 'node:path';

/**
 * メインウィンドウを生成する。
 *
 * - 開発時 (`VITE_DEV_SERVER_URL` env 設定時): Vite dev server の URL を読む
 * - それ以外: frontend/dist/index.html を file:// で読む
 *
 * セキュリティ既定値:
 *   - contextIsolation: true
 *   - nodeIntegration: false
 *   - sandbox: true
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

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 本番ビルド: monorepo ルートの frontend/dist/index.html を読む
    // electron/dist/window.js から見て ../../frontend/dist/index.html
    const indexPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist', 'index.html');
    void win.loadFile(indexPath);
  }

  return win;
}
