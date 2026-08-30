import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildPatternProjection, projectRoot, projectionPath, serializePatternProjection } from './pattern-projection.mjs';

const expected = serializePatternProjection(buildPatternProjection());
const actual = fs.readFileSync(projectionPath, 'utf8');
assert.equal(actual, expected, 'Lab 资产投影必须由方法论登记册与 validation-slices manifest 确定性生成');

const projection = JSON.parse(actual);
assert.equal(projection.patterns.length, 103, 'Lab 必须投影全部 103 个分类项');
assert.equal(new Set(projection.patterns.map((pattern) => pattern.id)).size, 103, '投影编号必须唯一');

const assetIds = new Set(projection.patterns.map((pattern) => pattern.id));
const validationIds = new Set();
for (const validation of projection.validations) {
  assert.ok(!validationIds.has(validation.validationId), `${validation.validationId} 重复`);
  validationIds.add(validation.validationId);
  assert.ok(assetIds.has(validation.primaryAssetId), `${validation.validationId} 主资产不存在`);
  assert.ok(fs.existsSync(path.join(projectRoot, validation.specRef)), `${validation.validationId} Spec 不存在`);
  for (const assetId of validation.coveredAssetIds) assert.ok(assetIds.has(assetId), `${validation.validationId} 覆盖不存在的 ${assetId}`);
}

for (const pattern of projection.patterns) {
  assert.ok(pattern.maturity && pattern.nextEvidence, `${pattern.id} 缺少成熟度或下一证据`);
  for (const source of pattern.sources) assert.ok(fs.existsSync(path.resolve(projectRoot, '..', source)), `${pattern.id} 来源不存在: ${source}`);
}

console.log(`PASS  Lab 投影 ${projection.patterns.length} 项、${projection.validations.length} 个验证切片，来源与覆盖关系有效`);
