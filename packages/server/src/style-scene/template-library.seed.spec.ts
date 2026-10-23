import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadComponentLibrary, loadTemplateLibrary, seedComponentLibrary, seedTemplateLibrary } from './template-library.seed';

describe('template library database registration', () => {
  const root = resolve(process.cwd(), '../..');
  it('refreshes catalog content without erasing accumulated review state on repeat registration', async () => {
    const records = new Map<string, Record<string, unknown>>();
    const upsert = jest.fn(async ({ where, create, update }) => {
      const { systemCode, assetCode } = where.systemCode_assetCode;
      const key = `${systemCode}:${assetCode}`;
      const row = records.has(key) ? { ...records.get(key), ...update } : { ...create };
      records.set(key, row);
      return row;
    });
    const db = { styleScene: { upsert } } as never;
    await seedTemplateLibrary(db, 'secondary-demo', root);
    await seedComponentLibrary(db, 'secondary-demo', root);
    const review = { evidenceJson: ['review-record'], evidenceCardsJson: [{ title: 'adoption evidence' }],
      maturity: 'implementation-verified', status: 'WIP', nextEvidence: '待目标项目验收', pagePath: '/review/example',
      note: '人工说明', doneAt: new Date('2026-10-01T00:00:00Z') };
    for (const code of ['TPL-01-01', 'CMP-01']) {
      Object.assign(records.get(`secondary-demo:${code}`)!, review, { description: '旧版说明', templateJson: {} });
    }
    const unrelated = { description: '另一系统', evidenceJson: ['keep'] };
    records.set('other-system:CMP-01', unrelated);
    await seedTemplateLibrary(db, 'secondary-demo', root);
    await seedComponentLibrary(db, 'secondary-demo', root);
    expect(records.size).toBe(58);
    for (const code of ['TPL-01-01', 'CMP-01']) {
      const row = records.get(`secondary-demo:${code}`)!;
      expect(row).toMatchObject(review);
      expect(row.description).not.toBe('旧版说明');
      expect(row.templateJson).not.toEqual({});
    }
    expect(records.get('other-system:CMP-01')).toBe(unrelated);
  });
  it('registers eight categories and 42 direct templates without overstating availability', () => {
    const rows = loadTemplateLibrary(root);
    expect(rows).toHaveLength(42); expect(new Set(rows.map((row) => row.category)).size).toBe(8);
    expect(rows.filter((row) => row.metadata.availability !== 'pending').map((row) => row.code)).toEqual([
      'TPL-01-01', 'TPL-01-02', 'TPL-02-01', 'TPL-02-02', 'TPL-02-03', 'TPL-03-01', 'TPL-03-03',
      'TPL-04-02', 'TPL-04-06', 'TPL-05-01', 'TPL-05-02', 'TPL-05-03', 'TPL-05-05',
      'TPL-06-03', 'TPL-07-01', 'TPL-07-02', 'TPL-07-04', 'TPL-07-05', 'TPL-08-01', 'TPL-08-04', 'TPL-08-05',
    ]);
    expect(rows.filter((row) => row.metadata.demoPath)).toHaveLength(2);
    const employee = rows.find((row) => row.code === 'TPL-01-01')!;
    expect(employee.metadata).toMatchObject({ previewKind: 'screenshot', previewSource: { path: '/showcase/system/employees', capturedAt: '2026-09-29' }, applications: [{ name: '员工管理', path: '/showcase/system/employees', pageType: '列表页面' }] });
    expect(employee.metadata.components).not.toContain('ListViewSelector');
    const customer = rows.find((row) => row.code === 'TPL-01-02')!;
    expect(customer.metadata.components).toContain('ListViewSelector');
    expect(customer.metadata).toMatchObject({ availability: 'preview', previewKind: 'screenshot', previewSource: { path: '/showcase/customers', capturedAt: '2026-09-28' }, applications: [{ name: '客户管理', path: '/showcase/customers', pageType: '列表页面' }] });
    const agent = rows.find(row => row.code === 'TPL-08-04')!; expect(agent.metadata.components).toContain('AgentRuntime + AgentProvider'); expect(agent.metadata.previewSource?.scope).toContain('尚未执行任务'); expect(rows.find(row => row.code === 'TPL-08-05')?.metadata.availability).toBe('preview');
    for (const template of [employee, customer, agent]) expect(readFileSync(resolve(root, 'packages/web/public' + template.metadata.thumbnail)).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(rows.filter((row) => row.metadata.thumbnail && row.metadata.availability === 'pending').every((row) => row.metadata.previewKind === 'diagram')).toBe(true);
    expect(rows.filter((row) => row.metadata.previewKind === 'screenshot').every((row) => row.metadata.previewSource && readFileSync(resolve(root, 'packages/web/public' + row.metadata.thumbnail)).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))).toBe(true);
    expect(rows.filter((row) => row.metadata.applications.length)).toHaveLength(32);
    const registeredPaths = new Set<string>();
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) { value.forEach(visit); return; }
      if (!value || typeof value !== 'object') return;
      const record = value as Record<string, unknown>;
      if (typeof record.path === 'string') registeredPaths.add(record.path);
      Object.values(record).forEach(visit);
    };
    visit(JSON.parse(readFileSync(resolve(root, 'packages/web/src/showcase/registry/showcase-registry.data.json'), 'utf8')));
    for (const row of rows) {
      for (const application of row.metadata.applications) expect(registeredPaths.has(application.path)).toBe(true);
      if (row.metadata.previewSource) expect(registeredPaths.has(row.metadata.previewSource.path)).toBe(true);
    }
    for (const code of ['TPL-03-04', 'TPL-04-05', 'TPL-05-04', 'TPL-05-06', 'TPL-06-04', 'TPL-06-05', 'TPL-08-02', 'TPL-08-03', 'TPL-08-07']) {
      const item = rows.find((row) => row.code === code)!;
      expect(item.metadata.applications.length).toBeGreaterThan(0);
      expect(item.metadata.availability).toBe('pending');
      expect(item.metadata.regions.length && item.metadata.steps.length && item.metadata.config.length).toBeTruthy();
    }
  });
  it('covers the missing modes, retains renamed aliases, and resolves shared rules with task-specific exceptions', () => {
    const rows = loadTemplateLibrary(root);
    for (const code of ['TPL-01-05', 'TPL-03-05', 'TPL-04-06', 'TPL-05-06', 'TPL-07-05', 'TPL-08-07']) expect(rows.some((row) => row.code === code)).toBe(true);
    expect(rows.find((row) => row.code === 'TPL-07-01')?.metadata.aliases).toContain('指标看板');
    expect(rows.find((row) => row.code === 'TPL-03-03')?.metadata.aliases).toContain('主从单据录入');
    expect(rows.every((row) => Object.keys(row.metadata.behaviorRules?.feedback ?? {}).length === 6)).toBe(true);
    const ai = rows.find((row) => row.code === 'TPL-08-07')?.metadata.behaviorRules;
    expect(ai?.saving.join(' ')).toContain('关闭弹窗后生成任务仍继续');
    expect(ai?.feedback.success).toContain('待确认');
    expect(rows.find((row) => row.code === 'TPL-07-05')?.metadata.behaviorRules?.viewEdit.join(' ')).toContain('不是默认开放能力');
  });
  it('does not repopulate the retired discussion catalog during initialization', () => {
    const seed = readFileSync(resolve(root, 'packages/server/prisma/seed.ts'), 'utf8');
    expect(seed).not.toContain('seedInteractionCatalog');
    expect(seed).toContain('await seedTemplateLibrary(');
  });
  it('upserts only TPL records in the selected system', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    await expect(seedTemplateLibrary({ styleScene: { upsert } } as never, 'secondary-demo', root)).resolves.toBe(42);
    expect(upsert.mock.calls.every(([args]) => args.where.systemCode_assetCode.systemCode === 'secondary-demo' && args.where.systemCode_assetCode.assetCode.startsWith('TPL-'))).toBe(true);
    expect(upsert.mock.calls[0][0].create).toMatchObject({ status: 'TODO', maturity: 'candidate', subCategory: null });
  });
  it('registers real shared components with implementation paths and page screenshots', async () => {
    const components = loadComponentLibrary(root);
    expect(components).toHaveLength(15);
    expect(new Set(components.map((component) => component.code)).size).toBe(15);
    expect(components.every((component) => component.metadata.previewKind === 'screenshot')).toBe(true);
    expect(components.every((component) => component.metadata.sourcePaths?.length && component.metadata.usageSnippet)).toBe(true);
    for (const component of components) {
      const prompt = component.metadata.referencePrompt;
      expect(prompt).toContain(component.code);
      expect(prompt).toContain('以目标项目自己的 AGENTS');
      expect(prompt).toContain('独立演示通过不能代替真实页面检查');
      expect(prompt).not.toMatch(/\{\{\w+\}\}/);
      for (const value of [...component.sourcePaths, ...component.steps, ...component.config, ...component.dependencies]) expect(prompt).toContain(value);
      expect(readFileSync(resolve(root, 'packages/web/public' + component.metadata.thumbnail)).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    const upsert = jest.fn().mockResolvedValue({});
    await expect(seedComponentLibrary({ styleScene: { upsert } } as never, 'secondary-demo', root)).resolves.toBe(15);
    expect(upsert.mock.calls.every(([args]) => args.where.systemCode_assetCode.systemCode === 'secondary-demo' && args.where.systemCode_assetCode.assetCode.startsWith('CMP-'))).toBe(true);
    expect(upsert.mock.calls[0][0].create).toMatchObject({ category: '插件组件', status: 'DONE', sceneName: components[0].name });
  });
});
