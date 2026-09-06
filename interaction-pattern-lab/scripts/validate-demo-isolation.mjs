import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoots = ['packages/web/src/demos', 'packages/web/src/showcase', 'packages/web/src/ui-assets/scenarios'].map((directory) => path.join(projectRoot, directory));
const forbidden = [
  { label: '网络请求', pattern: /\b(?:fetch|XMLHttpRequest|WebSocket)\s*(?:\(|\.)/, allow: new Set(['packages/web/src/showcase/gateway.ts']) },
  { label: '浏览器持久化', pattern: /\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie/, allow: new Set(['packages/web/src/showcase/gateway.ts']) },
  { label: '随机数', pattern: /\bMath\.random\s*\(/, scenarioOnly: true },
  { label: '当前时间', pattern: /\bDate\.now\s*\(/, scenarioOnly: true },
  { label: '服务端导入', pattern: /\bfrom\s+['"][^'"]*(?:@interaction-pattern-lab\/server|\/server(?:\/|$))[^'"]*['"]|\bimport\s+['"][^'"]*(?:@interaction-pattern-lab\/server|\/server(?:\/|$))[^'"]*['"]/, scenarioOnly: true },
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

const files = sourceRoots.flatMap(listCodeFiles);
assert.ok(files.length > 0, 'Demo/Showcase/Scenario 隔离检查未找到可扫描源码');

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(projectRoot, file);
  for (const rule of forbidden) {
    if (rule.scenarioOnly && !relativeFile.startsWith('packages/web/src/ui-assets/scenarios/')) continue;
    if (rule.allow?.has(relativeFile)) continue;
    assert.ok(!rule.pattern.test(source), `${relativeFile} 包含禁止的${rule.label}`);
  }
}

console.log(`PASS  ${files.length} 个 Demo/Showcase/Scenario 源文件通过隔离检查；网络与 CSRF Cookie 仅允许在批准的 Gateway seam`);
