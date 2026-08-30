import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoot = path.join(projectRoot, 'src/demos');
const forbidden = [
  { label: '网络请求', pattern: /\b(?:fetch|XMLHttpRequest|WebSocket)\s*(?:\(|\.)/ },
  { label: '浏览器持久化', pattern: /\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie/ },
  { label: '远端 URL', pattern: /https?:\/\// },
  { label: '凭据形态', pattern: /\b(?:Bearer\s+[A-Za-z0-9._-]+|api[_-]?key\s*[:=]|token\s*[:=])/i },
];

function listCodeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listCodeFiles(target);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [target] : [];
  });
}

const files = listCodeFiles(sourceRoot);
assert.ok(files.length > 0, 'Demo 隔离检查未找到可扫描源码');

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const rule of forbidden) {
    assert.ok(!rule.pattern.test(source), `${path.relative(projectRoot, file)} 包含禁止的${rule.label}`);
  }
}

console.log(`PASS  ${files.length} 个 Demo 源文件无网络、持久化、远端 URL 或凭据调用`);
