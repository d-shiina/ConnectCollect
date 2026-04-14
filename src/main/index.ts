import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { startServer, stopServer, getServerPort } from './server';
import { flowStore } from './flowStore';
import { adapterRegistry, initializeAdapters } from './adapters';
import type { FlowDefinition } from '../shared/types';

// Electron Forge Vite plugin が差し込む定数
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(
      path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
      ),
    );
  }

  return win;
}

function registerIpcHandlers(): void {
  ipcMain.handle('flows:list', async () => flowStore.listFlows());
  ipcMain.handle('flows:get', async (_e, id: string) => flowStore.getFlow(id));
  ipcMain.handle('flows:save', async (_e, flow: FlowDefinition) =>
    flowStore.saveFlow(flow),
  );
  ipcMain.handle('flows:delete', async (_e, id: string) =>
    flowStore.deleteFlow(id),
  );
  ipcMain.handle('adapters:list', async () => adapterRegistry.listMetadata());
  ipcMain.handle('server:port', async () => getServerPort());
}

app.whenReady().then(async () => {
  initializeAdapters();
  registerIpcHandlers();

  try {
    await startServer();
  } catch (err) {
    console.error('[main] failed to start HTTP server', err);
  }

  mainWindow = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await stopServer();
});
