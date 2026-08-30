import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const scanRoots = [
  path.join(root, 'README.md'),
  path.join(root, '_methodology'),
  path.join(root, '_ref', 'README.md'),
];
const markdownFiles = [];

function collect(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile() && target.endsWith('.md')) markdownFiles.push(target);
  if (!stat.isDirectory()) return;
  for (const entry of fs.readdirSync(target)) collect(path.join(target, entry));
}

for (const target of scanRoots) collect(target);

const failures = [];
const linkPattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
for (const file of markdownFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(linkPattern)) {
    const raw = match[1].trim().replace(/^<|>$/g, '');
    if (!raw || raw.startsWith('#') || /^[a-z]+:/i.test(raw)) continue;
    const withoutAnchor = decodeURIComponent(raw.split('#')[0]);
    const resolved = path.resolve(path.dirname(file), withoutAnchor);
    if (!fs.existsSync(resolved)) {
      failures.push(`${path.relative(root, file)} -> ${raw}`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  失效链接: ${failure}`);
  process.exit(1);
}

console.log(`PASS  Markdown 本地链接有效（${markdownFiles.length} 个文件）`);
