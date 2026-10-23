import { fileURLToPath } from 'node:url';
const path = (value) => fileURLToPath(new URL(value, import.meta.url));
export default {
  root: path('./'),
  resolve: { alias: {
    react: path('../../packages/web/node_modules/react'),
    'react-dom': path('../../packages/web/node_modules/react-dom'),
    '@tabler/icons-react': path('../../packages/web/node_modules/@tabler/icons-react'),
  } },
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 5175, strictPort: true, watch: { ignored: ['**/.runtime/**'] }, fs: { allow: [path('../../')] } },
  build: { outDir: 'dist', emptyOutDir: true },
};
