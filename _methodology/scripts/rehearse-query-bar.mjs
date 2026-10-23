import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { exportComponentSource } from './export-component-source.mjs';
import { loadRehearsalRecipe } from './rehearsal-recipe.mjs';

// Source-copy rehearsal. Installation is opt-in; no business database access.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const web = path.join(root, 'packages/web');
const modules = path.join(web, 'node_modules');
const cleanInstall = process.argv.includes('--clean-install');
const args = process.argv.slice(2).filter(argument => argument !== '--clean-install');
if (args.length && (args.length !== 2 || args[0] !== '--component')) throw new Error('Usage: node rehearse-query-bar.mjs [--component CMP-xx] [--clean-install]');
const code = args[1] ?? 'CMP-01';
const { recipe, evidence: recipeEvidence } = loadRehearsalRecipe(root, code);
for (const tool of cleanInstall ? [] : ['tsc', 'vite']) {
  if (!fs.existsSync(path.join(modules, '.bin', tool))) throw new Error(`Missing ${tool}; install the workspace dependencies first.`);
}
const target = fs.mkdtempSync(path.join(os.tmpdir(), `forge-${recipe.fixture}-`));
const write = (name, text) => fs.writeFileSync(path.join(target, name), text);
fs.mkdirSync(path.join(target, 'src'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, '_methodology/components/index.json'), 'utf8'));
const component = catalog.components.find((entry) => entry.code === code);
if (!component) throw new Error(`${code} is missing from the component catalog`);
const exported = exportComponentSource(root, component, path.join(target, 'component-source'));
// The fixture keeps its local import while resolving the actual exported source tree.
const adapter = `export { ${(recipe.exports ?? [recipe.symbol]).join(', ')} } from '../component-source/source/packages/web/src/common/${recipe.entry ?? recipe.symbol}';\n`;
write(`src/${recipe.symbol}.ts`, adapter);
const files = [
  [`_methodology/examples/${recipe.fixture}/main.tsx`, 'src/main.tsx'],
  [`_methodology/examples/${recipe.fixture}/host.css`, 'src/host.css'],
];
const sources = [...exported.files.map(({ source, sha256 }) => ({ source, sha256 })), ...files.map(([source, destination]) => {
  const bytes = fs.readFileSync(path.join(root, source));
  write(destination, bytes);
  return { source, sha256: createHash('sha256').update(bytes).digest('hex') };
}), recipeEvidence, ...[
  '_methodology/scripts/rehearse-query-bar.mjs',
  '_methodology/scripts/rehearsal-recipe.mjs',
  '_methodology/scripts/export-component-source.mjs',
  '_methodology/scripts/inspect-component-dependencies.mjs',
  'packages/web/package.json',
].map(source => ({ source, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, source))).digest('hex') }))];
if (!cleanInstall) fs.symlinkSync(modules, path.join(target, 'node_modules'), 'dir');
const sourcePackage = JSON.parse(fs.readFileSync(path.join(web, 'package.json'), 'utf8'));
const pick = (keys, values) => Object.fromEntries(keys.map(key => {
  if (!values[key]) throw new Error(`Missing dependency declaration: ${key}`);
  return [key, values[key]];
}));
write('package.json', JSON.stringify({ name: `${recipe.fixture}-rehearsal`, version: '0.0.0', private: true, type: 'module',
  scripts: { build: 'tsc --noEmit && vite build', dev: 'vite --host 127.0.0.1' },
  dependencies: pick(recipe.dependencies ?? ['react', 'react-dom', '@tabler/icons-react'], sourcePackage.dependencies),
  devDependencies: pick(['typescript', 'vite', '@types/react', '@types/react-dom'], sourcePackage.devDependencies),
}, null, 2));
write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true, types: ['react', 'react-dom'] }, include: ['src'] }, null, 2));
write('index.html', `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" href="data:,"><title>${recipe.title}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
console.log(`Rehearsal directory: ${target}`);
const results = [];
const commands = [
  ...(cleanInstall ? [['npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', path.join(target, '.npm-cache')]]] : []),
  ['tsc', ['--noEmit']], ['vite', ['build']],
];
for (const [tool, args] of commands) {
  const executable = tool === 'npm' ? 'npm' : path.join(target, 'node_modules/.bin', tool);
  const timeoutMs = tool === 'vite' ? 180000 : 60000;
  const startedAt = Date.now();
  const run = spawnSync(executable, args, { cwd: target, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 });
  write(`${tool}.log`, (run.stdout ?? '') + (run.stderr ?? '') + (run.error ? `\n${run.error.message}` : ''));
  results.push({ command: `${tool} ${args.join(' ')}`, exitCode: run.status, signal: run.signal, durationMs: Date.now() - startedAt, timeoutMs, errorCode: run.error?.code ?? null });
  console.log(`${tool}: ${run.status === 0 ? 'PASS' : 'FAIL'}; log: ${path.join(target, `${tool}.log`)}`);
  if (run.status !== 0) break;
}
const declared = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'));
const installedVersions = Object.fromEntries(Object.keys({ ...declared.dependencies, ...declared.devDependencies }).map(name => {
  const file = path.join(target, 'node_modules', name, 'package.json');
  return [name, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).version : null];
}));
const lock = path.join(target, 'package-lock.json');
write('result.json', JSON.stringify({ createdAt: new Date().toISOString(), component: code, cleanInstall, nodeVersion: process.version, architecture: process.arch, platform: process.platform, installedVersions,
  lockSha256: fs.existsSync(lock) ? createHash('sha256').update(fs.readFileSync(lock)).digest('hex') : null,
  sources, exportManifest: 'component-source/manifest.json', adapterSha256: createHash('sha256').update(adapter).digest('hex'), results, limitations: [
  cleanInstall ? 'Fresh installation requested with lifecycle scripts disabled; inspect npm exit status and recorded versions. This is not a dependency security audit.' : 'Existing workspace node_modules is linked; clean installation and dependency closure are not verified.',
  'The component source comes from the source exporter; unresolved external contracts and CSS assets remain subject to its manifest limits. Host styles are supplied by this fixture.',
  'No browser layout, backend integration, or independent business adoption is claimed.',
] }, null, 2));
if (results.length !== commands.length || results.some(result => result.exitCode !== 0)) process.exitCode = 1;
