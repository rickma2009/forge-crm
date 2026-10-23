import { describe, expect, it } from 'vitest';
import { interactionTemplateSchema, styleSceneDetailSchema, styleSceneSummarySchema, styleSceneTaxonomySchema } from './index';

const summary = {
  id: '00000000-0000-4000-8000-000000000026',
  assetCode: 'PAGE-001',
  category: 'PAGE',
  subCategory: '目录类',
  sceneName: '查询列表',
  description: '标准查询列表',
  maturity: 'released',
  status: 'DONE',
  pagePath: '/showcase/items',
  note: null,
  doneAt: '2026-09-28T00:00:00.000Z',
  sortNo: 10,
  version: 1,
} as const;

describe('style scene catalog contracts', () => {
  it('parses a summary without detail json', () => {
    expect(styleSceneSummarySchema.parse(summary)).toEqual(summary);
    expect(styleSceneSummarySchema.safeParse({ ...summary, definition: [] }).success).toBe(false);
    expect(styleSceneSummarySchema.parse({ ...summary, assetCode: null, maturity: null })).toMatchObject({ assetCode: null, maturity: null });
  });

  it('parses a complete catalog detail', () => {
    const detail = {
      ...summary,
      definition: ['默认单行查询', '结果使用企业表格'],
      definitionRef: { path: '_methodology/patterns/catalog.md', section: '查询列表' },
      artifacts: ['packages/web/src/common/RecordQueryBar.tsx'],
      evidence: ['packages/web/src/common/RecordQueryBar.test.tsx'],
      evidenceCards: [{
        evidenceId: 'EVID-026', state: 'released', archivedSourceRefs: [], implementationRefs: ['packages/web/src/common/RecordQueryBar.tsx'], artifactRefs: [],
        validation: { project: 'forge-crm', slice: '026', environment: 'test', versionPoint: 'dca65f0', result: 'passed', unknowns: [] },
      }],
      nextEvidence: '业务项目复用记录',
    };
    expect(styleSceneDetailSchema.parse(detail)).toEqual(detail);
    expect(styleSceneDetailSchema.safeParse({ ...detail, extra: true }).success).toBe(false);
  });

  it('supports optional legacy metadata and validates all six feedback states', () => {
    const template = { availability: 'pending', suitableFor: [], regions: [], steps: [], config: [], components: [], tags: [], thumbnail: null, previewKind: null, demoPath: null, applications: [], referencePrompt: '参考模板', version: '2026-09-28', relatedTemplates: [] };
    expect(interactionTemplateSchema.safeParse(template).success).toBe(true);
    const screenshot = { ...template, previewSource: { name: '客户管理', path: '/showcase/customers', capturedAt: '2026-09-28', scope: '查询与网格' }, applications: [{ name: '客户管理', path: '/showcase/customers', pageType: '列表页面' }] };
    expect(interactionTemplateSchema.safeParse(screenshot).success).toBe(true);
    expect(interactionTemplateSchema.parse({ ...screenshot, sourcePaths: ['packages/web/src/common/BusinessDirectory.tsx'], usageSnippet: '<BusinessDirectory />' })).toMatchObject({ sourcePaths: ['packages/web/src/common/BusinessDirectory.tsx'], usageSnippet: '<BusinessDirectory />' });
    expect(interactionTemplateSchema.safeParse({ ...screenshot, previewSource: { ...screenshot.previewSource, path: 'https://example.com' } }).success).toBe(false);
    const rules = { viewEdit: ['默认查看'], saving: ['手动保存'], feedback: { loading: '加载', processing: '处理', success: '成功', failure: '失败', empty: '空', forbidden: '权限不足' } };
    expect(interactionTemplateSchema.parse({ ...template, aliases: ['旧名称'], behaviorRules: rules })).toMatchObject({ aliases: ['旧名称'], behaviorRules: rules });
    expect(interactionTemplateSchema.safeParse({ ...template, behaviorRules: { ...rules, feedback: { loading: '加载' } } }).success).toBe(false);
  });

  it('parses taxonomy with an ungrouped type', () => {
    const taxonomy = { types: [
      { category: 'PAGE', count: 3, groups: [{ subCategory: '目录类', count: 2 }] },
      { category: 'SPECIAL', count: 1, groups: [] },
    ] };
    expect(styleSceneTaxonomySchema.parse(taxonomy)).toEqual(taxonomy);
  });

  it('rejects malformed evidence cards', () => {
    const malformed = {
      ...summary,
      definition: [], definitionRef: null, artifacts: [], evidence: [], nextEvidence: null,
      evidenceCards: [{ evidenceId: 'EVID-026', state: 'released', validation: { result: 'passed' } }],
    };
    expect(styleSceneDetailSchema.safeParse(malformed).success).toBe(false);
  });
});
