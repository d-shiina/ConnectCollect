import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';

/**
 * Electron main process エントリポイント。
 *
 * Step 2 時点では「空の BrowserWindow を 1 つ開くだけ」のミニマム実装。
 * Step 3 で React (Vite) を読み込み、Step 5 で Python agent と接続する。
 */

let mainWindow: BrowserWindow | null = null;

function bootstrap(): void {
  mainWindow = createMainWindow();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  bootstrap();

  // macOS: dock からの再アクティブ化に対応
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      bootstrap();
    }
  });
});

// Windows / Linux: 全ウィンドウが閉じたら終了
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 未捕捉エラーは標準エラーへ吐く (Step 5 で構造化ログに置き換え予定)
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[main] uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[main] unhandledRejection', reason);
});
