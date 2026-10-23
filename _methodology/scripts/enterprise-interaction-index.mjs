import fs from 'node:fs';
import path from 'node:path';

export const taxonomyRelativePath = '_methodology/08-企业管理系统交互模式分类方法.md';
export const indexRelativePath = '_methodology/patterns/index.json';

const maturityOverrides = new Map([
  ['EPM-PAGE-001', 'interaction-verified'],
  ['EPM-SCENE-001', 'implementation-verified'],
  ...Array.from({ length: 10 }, (_, index) => [`EPM-COMPONENT-${String(index + 1).padStart(3, '0')}`, 'implementation-verified']),
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
  ['EPM-COMPONENT-001', ['packages/web/src/common/RecordQueryBar.tsx']],
  ['EPM-COMPONENT-002', ['packages/web/src/common/ListViewSelector.tsx']],
  ['EPM-COMPONENT-003', ['packages/web/src/common/TreeWorkspace.tsx']],
  ['EPM-COMPONENT-004', ['packages/web/src/common/DetailWorkspace.tsx']],
  ['EPM-COMPONENT-005', ['packages/web/src/common/route-tabs/RouteTabs.tsx', 'packages/web/src/common/route-tabs/useRouteTabs.ts']],
  ['EPM-COMPONENT-006', ['packages/web/src/ui-assets/components/schema-form/SchemaForm.tsx']],
  ['EPM-COMPONENT-007', ['packages/web/src/ui-assets/components/editable-line-grid/EditableLineGrid.tsx']],
  ['EPM-COMPONENT-008', ['packages/web/src/common/ProductPickerDialog.tsx']],
  ['EPM-COMPONENT-009', ['packages/web/src/ui-assets/components/validation-summary/ValidationSummary.tsx']],
  ['EPM-COMPONENT-010', ['packages/web/src/ui-assets/components/async-state/AsyncOutcome.tsx']],
]);

const evidenceOverrides = new Map([
  ['EPM-PAGE-001', ['interaction-pattern-lab:001-pattern-catalog-preview', 'mcrm:003-enterprise-navigation-shell']],
  ['EPM-SCENE-001', ['interaction-pattern-lab:001-pattern-catalog-preview', 'mcrm:004-customer-record-workspace']],
  ...Array.from({ length: 10 }, (_, index) => [`EPM-COMPONENT-${String(index + 1).padStart(3, '0')}`, ['forge-crm:implemented-and-automated']]),
]);

const demoPathOverrides = new Map([
  ['EPM-PAGE-010', '/showcase/items'],
  ['EPM-PAGE-011', '/showcase/products'],
  ['EPM-PAGE-013', '/showcase/inbound-orders'],
  ['EPM-PAGE-014', '/showcase/items'],
  ['EPM-PAGE-030', '/showcase/system/parameters'],
  ['EPM-PAGE-032', '/showcase/system/roles'],
  ['EPM-ACT-001', '/showcase/items'],
  ['EPM-ACT-002', '/showcase/items'],
  ['EPM-ACT-004', '/showcase/customers'],
  ['EPM-ACT-043', '/showcase/quotations'],
  ['EPM-VIEW-002', '/showcase/customers'],
  ['EPM-VIEW-005', '/showcase/quotations'],
  ['EPM-VIEW-010', '/showcase/customers'],
  ['EPM-VIEW-013', '/showcase/items'],
  ['EPM-SCENE-001', '/showcase/customers'],
  ['EPM-COMPONENT-001', '/showcase/items'],
  ['EPM-COMPONENT-002', '/showcase/customers'],
  ['EPM-COMPONENT-003', '/showcase/items'],
  ['EPM-COMPONENT-004', '/showcase/products'],
  ['EPM-COMPONENT-005', '/showcase/customers'],
  ['EPM-COMPONENT-006', '/showcase/inbound-orders'],
  ['EPM-COMPONENT-007', '/showcase/inbound-orders'],
  ['EPM-COMPONENT-008', '/showcase/quotations'],
  ['EPM-COMPONENT-009', '/showcase/inbound-orders'],
  ['EPM-COMPONENT-010', '/showcase/inbound-orders'],
]);

const evidenceCardOverrides = new Map([
  ['EPM-PAGE-013', [{
    evidenceId: 'EVID-VAL-010-MASTER-DETAIL',
    state: 'in-lab-candidate',
    archivedSourceRefs: [
      'interaction-pattern-lab/.specify/sources/REQSRC-029-sales-order-bom-template-research-20260905/source.md',
      'interaction-pattern-lab/.specify/sources/REQSRC-030-enterprise-workbench-master-detail-request-20260905/source.md',
      'interaction-pattern-lab/.specify/sources/REQSRC-034-master-detail-document-assets-architecture-gate-approval-20260905/source.md',
      'interaction-pattern-lab/.specify/sources/REQSRC-035-slice-010-release-gate-approval-20260906/source.md',
    ],
    implementationRefs: [
      'packages/web/src/ui-assets/scenarios/sales-order/SalesOrderScenario.tsx',
      'packages/web/src/ui-assets/scenarios/bom/BomScenario.tsx',
    ],
    artifactRefs: masterDetailArtifacts,
    validation: {
      project: '.',
      slice: '010-master-detail-document-assets',
      environment: 'deterministic in-memory interaction validation lab',
      versionPoint: '7243bb4 / REQSRC-035',
      result: 'VAL-010 completed dual-scenario implementation, automated checks, responsive and keyboard browser QA, and validation-lab Release; maturity remains idea.',
      unknowns: ['real-project adoption', 'business validation'],
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
    if (/^### /.test(line)) group = line.replace(/^###\s+(?:\d+(?:\.\d+)?\s+)?/, '').trim();

    const cells = line.split('|').slice(1, -1).map(cleanCell);
    const match = cells[0]?.match(/^(EPM-(PAGE|ACT|VIEW|STATE|SPECIAL|COMPONENT|SCENE)-\d{3})$/);
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
      demoPath: demoPathOverrides.get(assetId) ?? null,
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
