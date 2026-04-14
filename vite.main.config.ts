import { defineConfig } from 'vite';

// Electron Forge Vite plugin が build.lib.entry を注入するので
// ここではランタイムに require したい Node モジュールを external に指定するだけでよい。
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', 'express', 'cors'],
    },
  },
});
