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

test('TC-305: 两个既有证据资产保持各自成熟度，本任务不得提升或夹带 P002', () => {
  const registry = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const byId = new Map(registry.assets.map((asset) => [asset.assetId, asset]));
  assert.equal(byId.get('EPM-PAGE-001').maturity, 'interaction-verified');
  assert.equal(byId.get('EPM-SCENE-001').maturity, 'implementation-verified');
  assert.equal(byId.get('EPM-PAGE-002').maturity, 'idea');
  assert.deepEqual(byId.get('EPM-PAGE-002').artifacts, []);
  assert.deepEqual(byId.get('EPM-PAGE-002').evidence, []);
  assert.equal(byId.get('EPM-PAGE-010').maturity, 'idea');
  assert.equal(byId.get('EPM-ACT-042').maturity, 'idea');
  assert.equal(byId.get('EPM-SPECIAL-002').maturity, 'idea');
});

test('TC-1017: 主从单据候选资产保持 idea 且登记可定位的验证场候选证据卡', () => {
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
  const masterDetail = byId.get('EPM-PAGE-013');
  assert.equal(masterDetail.maturity, 'idea');
  for (const artifact of expectedArtifacts) assert.ok(byId.get('EPM-PAGE-013').artifacts.includes(artifact), `缺少候选资产: ${artifact}`);
  assert.deepEqual(masterDetail.evidence, []);
  assert.deepEqual(masterDetail.evidenceCards, [{
    evidenceId: 'EVID-VAL-010-MASTER-DETAIL',
    state: 'in-lab-candidate',
    sourceRefs: [
      'interaction-pattern-lab/.specify/sources/REQSRC-029-sales-order-bom-template-research-20260905/source.md',
      'interaction-pattern-lab/.specify/sources/REQSRC-030-enterprise-workbench-master-detail-request-20260905/source.md',
      'interaction-pattern-lab/.specify/sources/REQSRC-034-master-detail-document-assets-architecture-gate-approval-20260905/source.md',
    ],
    implementationRefs: [
      'interaction-pattern-lab/packages/web/src/ui-assets/scenarios/sales-order/SalesOrderScenario.tsx',
      'interaction-pattern-lab/packages/web/src/ui-assets/scenarios/bom/BomScenario.tsx',
    ],
    artifactRefs: expectedArtifacts,
    validation: {
      project: 'interaction-pattern-lab',
      slice: '010-master-detail-document-assets',
      environment: 'deterministic in-memory interaction validation lab',
      versionPoint: '70caa49',
      result: 'VAL-010 records dual-scenario implementation, automated checks and responsive browser QA; maturity remains idea.',
      unknowns: [
        'real-project adoption',
        'business validation',
        'Release approval',
      ],
    },
  }]);
});
