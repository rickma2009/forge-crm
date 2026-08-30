import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const catalogPath = resolve(projectRoot, 'src/catalog/patterns.data.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const allowedStatuses = new Set([
  'idea',
  'candidate',
  'implementation-verified',
  'interaction-verified',
  'project-adopted',
  'business-validated',
  'released',
  'deprecated'
]);
const ids = new Set();
const errors = [];

for (const pattern of catalog) {
  if (ids.has(pattern.id)) errors.push(`${pattern.id}: 编号重复`);
  ids.add(pattern.id);
  if (!allowedStatuses.has(pattern.validationStatus)) errors.push(`${pattern.id}: 验证状态非法`);
  for (const key of ['problem', 'appliesWhen', 'avoidWhen', 'behaviors', 'states', 'risks']) {
    const value = pattern.summary?.[key];
    if (!value || (Array.isArray(value) && value.length === 0)) errors.push(`${pattern.id}: summary.${key} 缺失`);
  }
  for (const source of pattern.sources ?? []) {
    try { await readFile(resolve(projectRoot, source)); }
    catch { errors.push(`${pattern.id}: 来源不存在 ${source}`); }
  }
  try {
    const bytes = await readFile(resolve(projectRoot, pattern.sourceFingerprint.path));
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== pattern.sourceFingerprint.sha256) errors.push(`${pattern.id}: 来源指纹不匹配`);
  } catch {
    errors.push(`${pattern.id}: 指纹来源不可读取`);
  }
}

if (catalog.length !== 2) errors.push(`首片应有 2 个模式，实际 ${catalog.length}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`PASS  模式投影 ${catalog.length} 项，来源存在且指纹一致`);
