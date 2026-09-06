import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const indexPath = path.join(root, '_methodology/patterns/index.json');

test('TC-301: 企业交互资产登记册包含六类 103 个唯一分类项', () => {
  const registry = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  assert.equal(registry.version, 1);
  assert.equal(registry.assets.length, 103);
  assert.equal(new Set(registry.assets.map((asset) => asset.assetId)).size, 103);
  assert.deepEqual(
    Object.fromEntries(Object.entries(Object.groupBy(registry.assets, (asset) => asset.kind)).map(([kind, assets]) => [kind, assets.length])),
    { PAGE: 25, ACT: 33, VIEW: 16, STATE: 12, SPECIAL: 10, SCENE: 7 },
  );
});

test('TC-305: 三个已有证据资产保持各自成熟度，其余分类项不继承成熟度', () => {
  const registry = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const byId = new Map(registry.assets.map((asset) => [asset.assetId, asset]));
  assert.equal(byId.get('EPM-PAGE-001').maturity, 'interaction-verified');
  assert.equal(byId.get('EPM-PAGE-002').maturity, 'interaction-verified');
  assert.equal(byId.get('EPM-SCENE-001').maturity, 'implementation-verified');
  assert.equal(byId.get('EPM-PAGE-010').maturity, 'idea');
  assert.equal(byId.get('EPM-ACT-042').maturity, 'idea');
  assert.equal(byId.get('EPM-SPECIAL-002').maturity, 'idea');
});

test('TC-1017: 主从单据候选资产登记完整且不高于验证场工程证据', () => {
  const registry = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const byId = new Map(registry.assets.map((asset) => [asset.assetId, asset]));
  const expectedArtifacts = [
    '_methodology/templates/ui/master-detail-document/README.md',
    '_methodology/templates/ui/master-detail-document/schema-form.schema.example.json',
    '_methodology/templates/ui/master-detail-document/editable-line-grid.schema.example.json',
    '_methodology/templates/ui/master-detail-document/state-matrix.md',
    '_methodology/templates/ui/master-detail-document/acceptance-checklist.md',
    '_methodology/templates/ui/master-detail-document/master-detail-document.tokens.css',
  ];
  assert.equal(byId.get('EPM-PAGE-013').maturity, 'implementation-verified');
  for (const artifact of expectedArtifacts) assert.ok(byId.get('EPM-PAGE-013').artifacts.includes(artifact), `缺少候选资产: ${artifact}`);
  assert.ok(byId.get('EPM-PAGE-013').evidence.includes('interaction-pattern-lab:010-master-detail-document-assets-dual-scenario'));
});
