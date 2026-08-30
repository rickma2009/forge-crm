import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const rootFiles = [
  '.env.example',
  'ENGINEERING.md',
  'compose.yaml',
  'eslint.config.mjs',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
];
const ignoredDirectories = new Set(['node_modules', 'dist', 'coverage', '.turbo']);

function collectFiles(baseDir, relativeDir, output) {
  const absoluteDir = path.join(baseDir, relativeDir);
  if (!fs.existsSync(absoluteDir)) return;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const relative = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) collectFiles(baseDir, relative, output);
    if (entry.isFile()) output.push(relative);
  }
}

export function engineeringFingerprint(projectDir) {
  const files = rootFiles.filter((relative) => fs.existsSync(path.join(projectDir, relative)));
  collectFiles(projectDir, 'packages', files);
  collectFiles(projectDir, 'scripts', files);
  const hash = crypto.createHash('sha256');
  for (const relative of [...new Set(files)].sort()) {
    hash.update(`${relative}\0`);
    hash.update(fs.readFileSync(path.join(projectDir, relative)));
    hash.update('\0');
  }
  return hash.digest('hex');
}
