import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite 設定。
 *
 * Step 3: 通常のブラウザ向け SPA として起動する。
 * Step 5 で Electron BrowserWindow がこの dev server URL を loadURL する。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
