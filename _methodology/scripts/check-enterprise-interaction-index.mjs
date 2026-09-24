import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildEnterpriseInteractionIndex, indexRelativePath, serializeEnterpriseInteractionIndex } from './enterprise-interaction-index.mjs';
import { validateJsonSchema } from './json-schema-subset.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const indexPath = path.join(root, indexRelativePath);
const registry = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, '_methodology/patterns/index.schema.json'), 'utf8'));
const expected = serializeEnterpriseInteractionIndex(buildEnterpriseInteractionIndex(root));
const actual = fs.readFileSync(indexPath, 'utf8');

assert.equal(actual, expected, '登记册必须由分类源确定性生成且不含手工漂移');
assert.deepEqual(validateJsonSchema(schema, registry), [], '登记册必须符合 index.schema.json');
const invalidProbe = structuredClone(registry);
delete invalidProbe.assets[0].name;
assert.ok(validateJsonSchema(schema, invalidProbe).length > 0, 'Schema 负向探针必须拒绝缺失字段');
const invalidEvidenceCardProbe = structuredClone(registry);
delete invalidEvidenceCardProbe.assets.find((asset) => asset.assetId === 'EPM-PAGE-013').evidenceCards[0].validation.versionPoint;
assert.ok(validateJsonSchema(schema, invalidEvidenceCardProbe).length > 0, 'Schema 负向探针必须拒绝不完整证据卡');
assert.equal(registry.assets.length, 103, '登记册必须包含 103 项');
assert.equal(new Set(registry.assets.map((asset) => asset.assetId)).size, 103, '资产编号必须唯一');

const expectedCounts = { PAGE: 25, ACT: 33, VIEW: 16, STATE: 12, SPECIAL: 10, SCENE: 7 };
for (const [kind, count] of Object.entries(expectedCounts)) {
  assert.equal(registry.assets.filter((asset) => asset.kind === kind).length, count, `${kind} 数量错误`);
}

const allowedMaturity = new Set(['idea', 'candidate', 'implementation-verified', 'interaction-verified', 'project-adopted', 'business-validated', 'released', 'deprecated']);
function assertProjectRelativeExistingPath(assetId, evidenceId, ref, kind) {
  assert.ok(!path.isAbsolute(ref) && !ref.startsWith('../') && !ref.includes('/../'), `${assetId}/${evidenceId} 的 ${kind} 必须为仓库项目相对路径: ${ref}`);
  assert.ok(fs.existsSync(path.join(root, ref)), `${assetId}/${evidenceId} 的 ${kind} 不存在: ${ref}`);
}

for (const asset of registry.assets) {
  assert.ok(asset.group && asset.name && asset.nextEvidence, `${asset.assetId} 缺少必填信息`);
  assert.ok(allowedMaturity.has(asset.maturity), `${asset.assetId} 成熟度非法`);
  assert.ok(fs.existsSync(path.join(root, asset.definitionRef.path)), `${asset.assetId} 定义来源不存在`);
  for (const artifact of asset.artifacts) assert.ok(fs.existsSync(path.join(root, artifact)), `${asset.assetId} 资产引用不存在: ${artifact}`);
  for (const card of asset.evidenceCards) {
    assert.ok(/^EVID-[A-Z0-9-]+$/.test(card.evidenceId), `${asset.assetId} 证据卡编号非法`);
    assert.equal(card.state, 'in-lab-candidate', `${asset.assetId}/${card.evidenceId} 证据状态越界`);
    assert.ok(card.archivedSourceRefs.some((ref) => ref.includes('/REQSRC-')), `${asset.assetId}/${card.evidenceId} 缺少 REQSRC 来源`);
    for (const ref of card.archivedSourceRefs) {
      assert.ok(!path.isAbsolute(ref) && !ref.startsWith('../') && !ref.includes('/../'), `${asset.assetId}/${card.evidenceId} 的 archivedSourceRef 必须为历史项目相对路径: ${ref}`);
    }
    for (const ref of card.implementationRefs) assertProjectRelativeExistingPath(asset.assetId, card.evidenceId, ref, 'implementationRef');
    for (const ref of card.artifactRefs) assertProjectRelativeExistingPath(asset.assetId, card.evidenceId, ref, 'artifactRef');
    assert.ok(fs.existsSync(path.join(root, card.validation.project)), `${asset.assetId}/${card.evidenceId} 验证项目不存在`);
    assert.ok(card.validation.slice && card.validation.environment && card.validation.versionPoint && card.validation.result, `${asset.assetId}/${card.evidenceId} 验证元数据不完整`);
    assert.ok(card.validation.unknowns.length > 0, `${asset.assetId}/${card.evidenceId} 必须列出未知项`);
  }
  if (asset.maturity !== 'idea' && asset.maturity !== 'candidate') {
    assert.ok(asset.evidence.length > 0 && asset.artifacts.length > 0, `${asset.assetId} 的成熟度缺少证据`);
  }
}

const masterDetail = registry.assets.find((asset) => asset.assetId === 'EPM-PAGE-013');
assert.equal(masterDetail.maturity, 'idea', 'VAL-010 只能登记候选证据，不得提升 P013 成熟度');
assert.equal(masterDetail.evidenceCards.length, 1, 'P013 必须有一张可验证的 VAL-010 候选证据卡');
assert.deepEqual(masterDetail.evidenceCards[0].artifactRefs, masterDetail.artifacts, 'P013 证据卡必须覆盖全部候选产物');
const workbench = registry.assets.find((asset) => asset.assetId === 'EPM-PAGE-002');
assert.equal(workbench.maturity, 'idea', 'P002 不属于 TASK-1011 成熟度提升范围');
assert.deepEqual(workbench.artifacts, [], 'P002 不得引用未随 TASK-1011 提交的资产');
assert.deepEqual(workbench.evidence, [], 'P002 不得在 TASK-1011 中登记越界证据');

console.log('PASS  企业交互资产登记册 103 项、六类计数、成熟度与引用均有效');
