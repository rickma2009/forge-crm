import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  showcaseIconKeys,
  showcaseRegistry,
  showcaseRendererKeys,
  validateShowcaseRegistry,
} from './registry';
import type { PageRendererKey, ShowcaseRegistry } from './types';

const staticRendererKeys = [
  'overview',
  'resource-catalog',
  'customer-directory',
  'dictionary-admin',
  'list-view-admin',
  'sales-order-prototype',
  'personal-workbench',
  'master-detail-workbench',
  'bom-scenario',
  'description',
] as const satisfies readonly PageRendererKey[];

const projectRoot = path.resolve(process.cwd(), '../..');
const methodIndex = JSON.parse(fs.readFileSync(path.resolve(projectRoot, '../_methodology/patterns/index.json'), 'utf8')) as {
  assets: { assetId: string }[];
};
const traceabilityEvidence = {
  assetIds: new Set(methodIndex.assets.map((asset) => asset.assetId)),
  implementationRefExists: (reference: string) => fs.existsSync(path.resolve(projectRoot, reference)),
  qaRefExists: (reference: string) => fs.existsSync(path.resolve(projectRoot, reference)),
};

function mutatedRegistry(mutate: (draft: ShowcaseRegistry) => void) {
  const draft = structuredClone(showcaseRegistry);
  mutate(draft);
  return validateShowcaseRegistry(draft, {
    iconKeys: showcaseIconKeys,
    rendererKeys: showcaseRendererKeys,
    traceabilityEvidence,
  });
}

describe('showcase registry contract', () => {
  it('registers the sales-order editing template as an interactive prototype', () => {
    const page = showcaseRegistry.pages.find((item) => item.id === 'template-form');
    expect(page).toMatchObject({
      path: '/showcase/templates/edit-form',
      coverage: 'interactive-slice',
      rendererKey: 'sales-order-prototype',
    });
  });

  it('registers workbench templates as distinct interactive variants', () => {
    expect(showcaseRegistry.pages.find((item) => item.id === 'template-workbench')).toMatchObject({
      path: '/showcase/templates/workbench',
      coverage: 'interactive-slice',
      rendererKey: 'personal-workbench',
    });
    expect(showcaseRegistry.pages.find((item) => item.id === 'template-master-detail')).toMatchObject({
      path: '/showcase/templates/master-detail',
      coverage: 'interactive-slice',
      rendererKey: 'master-detail-workbench',
    });
  });

  it('TC-1001: gives the three interactive templates direct sources, extracted evidence, assets, implementation, and honest QA status', () => {
    expect(showcaseRegistry.pages.filter((page) => ['template-form', 'template-workbench', 'template-master-detail'].includes(page.id))).toMatchObject([
      {
        id: 'template-form',
        traceability: {
          directSourceRefs: ['REQSRC-029', 'REQSRC-030'],
          extractionRefs: ['UID-001'],
          assetRefs: ['EPM-PAGE-012', 'EPM-PAGE-013', 'EPM-ACT-010', 'EPM-ACT-011', 'EPM-ACT-012', 'EPM-ACT-013'],
          implementationRefs: [
            'packages/web/src/ui-assets/scenarios/sales-order/SalesOrderScenario.tsx',
            'packages/web/src/ui-assets/templates/master-detail-document/MasterDetailDocument.tsx',
          ],
          qaRefs: ['.specify/specs/010-master-detail-document-assets/implementation-evidence.md'],
          qaStatus: 'recorded',
        },
      },
      {
        id: 'template-master-detail',
        traceability: {
          directSourceRefs: ['REQSRC-030'],
          extractionRefs: ['UID-001'],
          assetRefs: ['EPM-PAGE-013'],
          implementationRefs: ['packages/web/src/showcase/EnterpriseWorkbenchPrototype.tsx'],
          qaRefs: [],
          qaStatus: 'not-run',
        },
      },
      {
        id: 'template-workbench',
        traceability: {
          directSourceRefs: ['REQSRC-030'],
          extractionRefs: ['UID-001'],
          assetRefs: ['EPM-PAGE-002'],
          implementationRefs: ['packages/web/src/showcase/EnterpriseWorkbenchPrototype.tsx'],
          qaRefs: [],
          qaStatus: 'not-run',
        },
      },
    ]);
  });

  it('TC-404/411: accepts the complete neutral registry and its adapter keys', () => {
    expect(validateShowcaseRegistry(showcaseRegistry, {
      iconKeys: showcaseIconKeys,
      rendererKeys: showcaseRendererKeys,
      traceabilityEvidence,
    })).toEqual([]);
  });

  it('keeps the static renderer-key union synchronized with the runtime registry keys', () => {
    expect([...showcaseRendererKeys].sort()).toEqual([...staticRendererKeys].sort());
  });

  it('TC-1002: reports a page that references an EPM asset absent from the method index', () => {
    expect(mutatedRegistry((draft) => {
      const page = draft.pages.find((candidate) => candidate.id === 'template-form') as unknown as { traceability?: { assetRefs: string[] } };
      page.traceability = { assetRefs: ['EPM-PAGE-999'] };
    })).toContain('UNKNOWN_EPM_ASSET:template-form:EPM-PAGE-999');
  });

  it('TC-1002: reports a page whose implementation reference cannot be resolved from the project root', () => {
    expect(mutatedRegistry((draft) => {
      const page = draft.pages.find((candidate) => candidate.id === 'template-form') as unknown as { traceability?: { implementationRefs: string[] } };
      page.traceability = { implementationRefs: ['packages/web/src/showcase/missing.tsx'] };
    })).toContain('MISSING_IMPLEMENTATION_REF:template-form:packages/web/src/showcase/missing.tsx');
  });

  it('TC-1002: reports recorded QA whose evidence file cannot be resolved from the project root', () => {
    expect(mutatedRegistry((draft) => {
      const page = draft.pages.find((candidate) => candidate.id === 'template-form');
      if (page?.traceability) page.traceability.qaRefs = ['.specify/specs/010-master-detail-document-assets/missing-evidence.md'];
    })).toContain('MISSING_QA_REF:template-form:.specify/specs/010-master-detail-document-assets/missing-evidence.md');
  });

  it('TC-1002: reports a registered page with no navigation entry', () => {
    expect(mutatedRegistry((draft) => {
      draft.navigation.items = draft.navigation.items.filter((node) => node.pageId !== 'overview');
    })).toContain('UNREFERENCED_PAGE:overview');
  });

  it('TC-1002: rejects a page coverage value that would otherwise vanish from both overview counts', () => {
    expect(mutatedRegistry((draft) => {
      // @ts-expect-error — mutation test deliberately violates the coverage contract.
      draft.pages[0].coverage = 'prototype-only';
    })).toContain('INVALID_PAGE_COVERAGE:overview:prototype-only');
  });

  it.each([
    ['duplicate path', (draft: ShowcaseRegistry) => { draft.pages[1].path = draft.pages[0].path; }, 'DUPLICATE_PAGE_PATH:'],
    ['unknown page capability', (draft: ShowcaseRegistry) => { draft.pages[0].viewCapability = 'showcase.missing.view'; }, 'UNKNOWN_PAGE_CAPABILITY:'],
    ['unknown renderer', (draft: ShowcaseRegistry) => {
      // @ts-expect-error — mutation test deliberately violates the typed adapter contract.
      draft.pages[0].rendererKey = 'missing';
    }, 'UNKNOWN_RENDERER:'],
    ['unknown icon', (draft: ShowcaseRegistry) => { draft.pages[0].iconKey = 'missing'; }, 'UNKNOWN_PAGE_ICON:'],
    ['viewer privilege escalation', (draft: ShowcaseRegistry) => {
      const viewer = draft.roles.find((role) => role.id === 'viewer');
      if (viewer) viewer.capabilities = [...(viewer.capabilities ?? []), 'showcase.user.view'];
    }, 'VIEWER_FORBIDDEN_CAPABILITY:'],
    ['missing navigation label', (draft: ShowcaseRegistry) => { draft.navigation.items[0].label = ''; }, 'NAV_FIELDS_REQUIRED:'],
    ['unknown navigation target', (draft: ShowcaseRegistry) => { draft.navigation.items[0].pageId = 'missing-page'; }, 'UNKNOWN_NAV_PAGE:'],
    ['source-only term leakage', (draft: ShowcaseRegistry) => { draft.system.name = 'gf_scm'; }, 'SOURCE_TERM_FORBIDDEN:'],
  ])('TC-418/EDGE-401: blocks %s', (_label, mutate, expectedPrefix) => {
    expect(mutatedRegistry(mutate).some((error) => error.startsWith(expectedPrefix))).toBe(true);
  });
});
