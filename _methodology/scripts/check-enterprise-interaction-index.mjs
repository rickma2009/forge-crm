import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildEnterpriseInteractionIndex, indexRelativePath, serializeEnterpriseInteractionIndex } from './enterprise-interaction-index.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const indexPath = path.join(root, indexRelativePath);
const registry = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const expected = serializeEnterpriseInteractionIndex(buildEnterpriseInteractionIndex(root));
const actual = fs.readFileSync(indexPath, 'utf8');

assert.equal(actual, expected, '登记册必须由分类源确定性生成且不含手工漂移');
assert.equal(registry.assets.length, 103, '登记册必须包含 103 项');
assert.equal(new Set(registry.assets.map((asset) => asset.assetId)).size, 103, '资产编号必须唯一');

const expectedCounts = { PAGE: 25, ACT: 33, VIEW: 16, STATE: 12, SPECIAL: 10, SCENE: 7 };
for (const [kind, count] of Object.entries(expectedCounts)) {
  assert.equal(registry.assets.filter((asset) => asset.kind === kind).length, count, `${kind} 数量错误`);
}

const allowedMaturity = new Set(['idea', 'candidate', 'implementation-verified', 'interaction-verified', 'project-adopted', 'business-validated', 'released', 'deprecated']);
for (const asset of registry.assets) {
  assert.ok(asset.group && asset.name && asset.nextEvidence, `${asset.assetId} 缺少必填信息`);
  assert.ok(allowedMaturity.has(asset.maturity), `${asset.assetId} 成熟度非法`);
  assert.ok(fs.existsSync(path.join(root, asset.definitionRef.path)), `${asset.assetId} 定义来源不存在`);
  for (const artifact of asset.artifacts) assert.ok(fs.existsSync(path.join(root, artifact)), `${asset.assetId} 资产引用不存在: ${artifact}`);
  if (asset.maturity !== 'idea' && asset.maturity !== 'candidate') {
    assert.ok(asset.evidence.length > 0 && asset.artifacts.length > 0, `${asset.assetId} 的成熟度缺少证据`);
  }
}

console.log('PASS  企业交互资产登记册 103 项、六类计数、成熟度与引用均有效');
