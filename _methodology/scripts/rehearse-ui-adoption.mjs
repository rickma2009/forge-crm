import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Disposable source-copy rehearsal; never writes to an existing target project.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const web = path.join(root, 'packages/web');
if (!fs.existsSync(path.join(web, 'node_modules/.bin/vitest'))) throw new Error('Install Lab dependencies before rehearsal.');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-ui-adoption-'));
console.log(`Rehearsal directory: ${target}`);
const write = (name, body) => { const dest = path.join(target, name); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, body); };
const copy = (name, filter) => fs.cpSync(path.join(web, name), path.join(target, name), { recursive: true, filter });
const cleanInstall = process.argv.includes('--clean-install');
if (!cleanInstall) fs.symlinkSync(path.join(web, 'node_modules'), path.join(target, 'node_modules'), 'dir');
for (const part of ['components', 'primitives', 'templates', 'scenarios', 'adoption']) {
  copy(`src/ui-assets/${part}`);
}
for (const part of ['navigation-shell', 'record-workspace']) copy(`src/demos/${part}`);
const sourcePackage = JSON.parse(fs.readFileSync(path.join(web, 'package.json'), 'utf8'));
const dependencies = Object.fromEntries(Object.entries(sourcePackage.dependencies).filter(([name]) => ['react', 'react-dom'].includes(name)));
const devDependencies = Object.fromEntries(Object.entries(sourcePackage.devDependencies).filter(([name]) => name !== '@forge-crm/tsconfig'));
write('package.json', JSON.stringify({ name: 'disposable-ui-adoption', version: '0.0.0', private: true, type: 'module', scripts: { dev: 'vite --host 127.0.0.1', build: 'tsc --noEmit && vite build', test: 'vitest run' }, dependencies, devDependencies }, null, 2));
write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022','DOM','DOM.Iterable'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true, esModuleInterop: true, types: ['vitest/globals', '@testing-library/jest-dom'] }, include: ['src'] }));
write('index.html', '<html lang="zh-CN"><meta charset="utf-8"><title>资产接入演练</title><div id="root"></div><script type="module" src="/src/main.tsx"></script></html>');
write('src/main.tsx', `import { createRoot } from 'react-dom/client';
import { ResourceWorkspace } from './ui-assets/adoption/ResourceWorkspace';
createRoot(document.getElementById('root')!).render(<ResourceWorkspace/>);
`);
write('src/setup.ts', "import '@testing-library/jest-dom/vitest';\nimport { afterEach } from 'vitest';\nimport { cleanup } from '@testing-library/react';\nafterEach(cleanup);\n");
write('vite.config.ts', "import { defineConfig } from 'vitest/config';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins:[react()], test:{ environment:'jsdom', globals:true, setupFiles:['./src/setup.ts'], fileParallelism:false } });\n");
const results = [];
if (cleanInstall) {
  const run = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: target, encoding: 'utf8', timeout: 120000 });
  write('install.log', (run.stdout ?? '') + (run.stderr ?? ''));
  if (run.status !== 0) throw new Error(`Clean install failed: ${target}/install.log`);
}
for (const [bin, args] of [['tsc', ['--noEmit']], ['vite', ['build']], ['vitest', ['run']]]) {
  const run = spawnSync(path.join(target, 'node_modules/.bin', bin), args, { cwd: target, encoding: 'utf8' });
  write(`${bin}.log`, (run.stdout ?? '') + (run.stderr ?? ''));
  results.push({ command: `${bin} ${args.join(' ')}`, exitCode: run.status });
  console.log(`${bin}: ${run.status === 0 ? 'PASS' : 'FAIL'}; ${path.join(target, `${bin}.log`)}`);
}
write('result.json', JSON.stringify({ cleanInstall, results, limitations: [cleanInstall ? 'Fresh npm installation; generated package-lock retained.' : 'Existing local dependencies reused; no clean install verified.', 'Standalone scoped adoption.css; Lab global CSS not imported.', 'No production adoption claimed.'] }, null, 2));
if (results.some(r => r.exitCode !== 0)) process.exitCode = 1;
