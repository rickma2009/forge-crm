import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const coreRoots = ['packages/web/src/ui-assets/components', 'packages/web/src/ui-assets/templates'].map((directory) => path.join(projectRoot, directory));
const forbidden = [
  { label: 'BOM领域词', pattern: /\b(?:bom|bill\s+of\s+materials)\b/i },
  { label: '产品领域词', pattern: /产品(?:名称|编码)|\b(?:bom)?product(?:Name|Code)\b/i },
  { label: '场景导入', pattern: /\bfrom\s+['"][^'"]*(?:scenarios\/|ui-assets\/scenarios\/)|\bimport\s*\(\s*['"][^'"]*(?:scenarios\/|ui-assets\/scenarios\/)/ },
];

function listCodeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listCodeFiles(target);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [target] : [];
  });
}

function violations(source) {
  return forbidden.filter((rule) => rule.pattern.test(source)).map((rule) => rule.label);
}

const mutationProbe = "import { BomScenario } from '../scenarios/bom/BomScenario'; const bomProductCode = 'MAT-AX-07';";
assert.deepEqual(violations(mutationProbe), ['BOM领域词', '产品领域词', '场景导入'], '边界负向 probe 必须同时触发领域词与场景导入检查');

const files = coreRoots.flatMap(listCodeFiles);
assert.ok(files.length > 0, '核心目录边界检查未找到可扫描源码');
for (const file of files) {
  const found = violations(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(found, [], `${path.relative(projectRoot, file)} 包含禁止的${found.join('、')}`);
}

console.log(`PASS  ${files.length} 个核心组件/模板源码保持中立；BOM 与销售订单场景仅单向消费核心 API`);
