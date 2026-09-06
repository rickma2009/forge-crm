import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@interaction-pattern-lab/contracts': fileURLToPath(new URL('../contracts/src/index.ts', import.meta.url)) },
  },
  server: {
    proxy: { '/api': { target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000', changeOrigin: false } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    globals: true,
    testTimeout: 10_000,
    fileParallelism: false,
  },
});
