import { fileURLToPath } from 'node:url';
const path = (p) => fileURLToPath(new URL(p, import.meta.url));
export default {
  root: path('./'),
  resolve: { alias: {
    'react-dom': path('../../packages/web/node_modules/react-dom'),
    'react': path('../../packages/web/node_modules/react'),
    '@tabler/icons-react': path('../../packages/web/node_modules/@tabler/icons-react'),
    '@forge-crm/contracts': path('../../packages/contracts/src/index.ts'),
  } },
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 5174, strictPort: true, watch: { ignored: ['**/.runtime/**', '**/tests/**'] }, fs: { allow: [path('../../')] } },
  build: { outDir: 'dist', emptyOutDir: true },
};
