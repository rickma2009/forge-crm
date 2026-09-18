import { expect, it } from 'vitest';
import { showcaseRegistry, showcaseRendererKeys } from './registry';

it('registers the BOM route with implementation traceability and recorded QA evidence', () => {
  expect(showcaseRegistry.pages.find(page => page.id === 'scenario-bom')).toMatchObject({
    path: '/showcase/scenarios/bom', coverage: 'interactive-slice', rendererKey: 'bom-scenario',
    traceability: {
      directSourceRefs: ['REQSRC-029', 'REQSRC-030'], extractionRefs: ['UID-001'],
      assetRefs: ['EPM-PAGE-012', 'EPM-PAGE-013', 'EPM-ACT-043', 'EPM-ACT-044'],
      implementationRefs: ['packages/web/src/ui-assets/scenarios/bom/BomScenario.tsx', 'packages/web/src/ui-assets/templates/master-detail-document/MasterDetailDocument.tsx'],
      qaRefs: ['.specify/specs/010-master-detail-document-assets/implementation-evidence.md'], qaStatus: 'recorded',
    },
  });
  expect(showcaseRendererKeys.has('bom-scenario')).toBe(true);
});
