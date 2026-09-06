import fs from 'node:fs';
import path from 'node:path';

export const taxonomyRelativePath = '_methodology/08-企业管理系统交互模式分类方法.md';
export const indexRelativePath = '_methodology/patterns/index.json';

const maturityOverrides = new Map([
  ['EPM-PAGE-001', 'interaction-verified'],
  ['EPM-SCENE-001', 'implementation-verified'],
]);

const masterDetailArtifacts = [
  '_methodology/templates/ui/master-detail-document/README.md',
  '_methodology/templates/ui/master-detail-document/schema-form.schema.example.json',
  '_methodology/templates/ui/master-detail-document/editable-line-grid.schema.example.json',
  '_methodology/templates/ui/master-detail-document/state-matrix.md',
  '_methodology/templates/ui/master-detail-document/acceptance-checklist.md',
  '_methodology/templates/ui/master-detail-document/master-detail-document.tokens.css',
];

const artifactOverrides = new Map([
  ['EPM-PAGE-001', [
    '_methodology/patterns/enterprise-two-level-navigation-shell.md',
    '_methodology/templates/ui/enterprise-navigation-shell/README.md',
    '_methodology/examples/002-golden-interaction-enterprise-navigation-shell/README.md',
  ]],
  ['EPM-PAGE-013', masterDetailArtifacts],
  ['EPM-SCENE-001', [
    '_methodology/patterns/record-management-workspace.md',
    '_methodology/templates/ui/record-management-workspace/README.md',
    '_methodology/examples/003-golden-interaction-record-management-workspace/README.md',
  ]],
]);

const evidenceOverrides = new Map([
  ['EPM-PAGE-001', ['interaction-pattern-lab:001-pattern-catalog-preview', 'mcrm:003-enterprise-navigation-shell']],
  ['EPM-SCENE-001', ['interaction-pattern-lab:001-pattern-catalog-preview', 'mcrm:004-customer-record-workspace']],
]);

const evidenceCardOverrides = new Map([
  ['EPM-PAGE-013', [{
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
    artifactRefs: masterDetailArtifacts,
    validation: {
      project: 'interaction-pattern-lab',
      slice: '010-master-detail-document-assets',
      environment: 'deterministic in-memory interaction validation lab',
      versionPoint: 'bf68ffd',
      result: 'VAL-010 records dual-scenario in-lab candidate evidence; maturity remains idea.',
      unknowns: ['real-project adoption', 'business validation', 'browser QA', 'Release approval'],
    },
  }]],
]);

function cleanCell(value) {
  return value.trim().replace(/^`|`$/g, '').replace(/\s+/g, ' ');
}

export function buildEnterpriseInteractionIndex(root) {
  const taxonomyPath = path.join(root, taxonomyRelativePath);
  const lines = fs.readFileSync(taxonomyPath, 'utf8').split(/\r?\n/);
  const assets = [];
  let group = '';
  let inCatalog = false;

  for (const line of lines) {
    if (/^## 4\./.test(line)) inCatalog = true;
    if (/^## 10\./.test(line)) break;
    if (!inCatalog) continue;
    if (/^## 7\./.test(line)) group = '特殊操作';
    if (/^## 9\./.test(line)) group = '组合场景';
    if (/^### /.test(line)) group = line.replace(/^###\s+\d+(?:\.\d+)?\s*/, '').trim();

    const cells = line.split('|').slice(1, -1).map(cleanCell);
    const match = cells[0]?.match(/^(EPM-(PAGE|ACT|VIEW|STATE|SPECIAL|SCENE)-\d{3})$/);
    if (!match) continue;

    const assetId = match[1];
    const maturity = maturityOverrides.get(assetId) ?? 'idea';
    assets.push({
      assetId,
      kind: match[2],
      group,
      name: cells[1],
      maturity,
      definition: cells.slice(2).filter(Boolean),
      definitionRef: { path: taxonomyRelativePath, section: group },
      artifacts: artifactOverrides.get(assetId) ?? [],
      evidence: evidenceOverrides.get(assetId) ?? [],
      evidenceCards: evidenceCardOverrides.get(assetId) ?? [],
      nextEvidence: maturity === 'interaction-verified'
        ? '在第二个独立真实项目采用并复核边界'
        : maturity === 'implementation-verified'
          ? '补真实浏览器关键路径证据并复核交互边界'
          : '形成候选卡，明确适用边界、失败行为与验收草案',
    });
  }

  return {
    version: 1,
    taxonomyRef: taxonomyRelativePath,
    generatedBy: '_methodology/scripts/sync-enterprise-interaction-index.mjs',
    assets,
  };
}

export function serializeEnterpriseInteractionIndex(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
}
