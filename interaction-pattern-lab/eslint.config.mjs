import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/src/generated/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/server/**/*.ts', 'packages/contracts/**/*.ts', 'packages/web/vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.es2022 } },
  },
];
