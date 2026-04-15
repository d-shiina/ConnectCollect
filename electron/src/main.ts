import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createMainWindow } from './window';
import { PythonBridge } from './python-bridge';
import { registerIpcHandlers } from './ipc-handlers';

/**
 * Electron main process エントリポイント。
 *
 * 起動順序:
 *  1. Python agent (rpa-agent) を子プロセスとして spawn
 *  2. IPC ハンドラを登録 (Renderer → main → agent への中継)
 *  3. BrowserWindow を生成
 *
 * 終了時は agent をきれいに stop してからプロセス終了。
 */

let mainWindow: BrowserWindow | null = null;
let pythonBridge: PythonBridge | null = null;

function resolveAgentDir(): string {
  // electron/dist/main.js から見て ../../agent
  return path.resolve(__dirname, '..', '..', 'agent');
}

function bootstrap(): void {
  const agentDir = resolveAgentDir();
  pythonBridge = new PythonBridge({
    agentDir,
    userDataDir: app.getPath('userData'),
    onStderr: (line) => {
      // eslint-disable-next-line no-console
      console.error(`[agent] ${line}`);
    },
  });
  pythonBridge.start();
  registerIpcHandlers(pythonBridge, () => mainWindow);

  mainWindow = createMainWindow();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  bootstrap();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await pythonBridge?.stop();
  pythonBridge = null;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await pythonBridge?.stop();
  pythonBridge = null;
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[main] uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[main] unhandledRejection', reason);
});
