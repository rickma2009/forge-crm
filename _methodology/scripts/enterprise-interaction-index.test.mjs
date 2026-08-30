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

test('TC-305: 两个既有资产保持不同成熟度，其余分类项不继承成熟度', () => {
  const registry = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const byId = new Map(registry.assets.map((asset) => [asset.assetId, asset]));
  assert.equal(byId.get('EPM-PAGE-001').maturity, 'interaction-verified');
  assert.equal(byId.get('EPM-SCENE-001').maturity, 'implementation-verified');
  assert.equal(byId.get('EPM-PAGE-010').maturity, 'idea');
  assert.equal(byId.get('EPM-ACT-042').maturity, 'idea');
  assert.equal(byId.get('EPM-SPECIAL-002').maturity, 'idea');
});
