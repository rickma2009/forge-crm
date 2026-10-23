import type { AuthenticatedRequest } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../rbac/authorization.service';
import { StyleSceneController } from './style-scene.controller';
import { StyleSceneService } from './style-scene.service';

const baseRow = {
  id: '00000000-0000-4000-8000-000000000026', systemCode: 'demo-portal', assetCode: 'EPM-PAGE-001',
  category: 'PAGE', subCategory: '系统与任务入口类', sceneName: '应用壳层', description: '标准应用壳层',
  maturity: 'interaction-verified', definitionJson: ['导航', '顶栏'],
  definitionRefJson: { path: '_methodology/guide.md', section: '应用壳层' }, artifactsJson: ['a.tsx'], evidenceJson: ['a.test.tsx'], evidenceCardsJson: [], nextEvidence: '独立项目验证',
  status: 'DONE' as const, pagePath: null, note: null, doneAt: new Date('2026-09-28T00:00:00.000Z'), sortNo: 10, version: 1,
  createdBy: 'seed', updatedBy: 'seed', createdAt: new Date('2026-09-28T00:00:00.000Z'), updatedAt: new Date('2026-09-28T00:00:00.000Z'),
};

function serviceWith(styleScene: Record<string, jest.Mock>) {
  return new StyleSceneService({ styleScene } as unknown as DatabaseService);
}

describe('style scene catalog reads', () => {
  it('filters summaries across type, group, maturity, status and all keyword fields', async () => {
    const findMany = jest.fn().mockResolvedValue([baseRow]);
    const count = jest.fn().mockResolvedValue(1);
    const result = await serviceWith({ findMany, count }).list('demo-portal', {
      page: '2', pageSize: '5', keyword: 'shell', category: 'PAGE', subCategory: '系统与任务入口类', maturity: 'interaction-verified', status: 'DONE',
    });
    expect(result.items).toEqual([expect.objectContaining({ assetCode: 'EPM-PAGE-001', maturity: 'interaction-verified' })]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ systemCode: 'demo-portal', category: 'PAGE', subCategory: '系统与任务入口类', maturity: 'interaction-verified', status: 'DONE', OR: [
        { assetCode: { contains: 'shell', mode: 'insensitive' } },
        { sceneName: { contains: 'shell', mode: 'insensitive' } },
        { description: { contains: 'shell', mode: 'insensitive' } },
      ] }),
      orderBy: [{ sortNo: 'asc' }, { assetCode: 'asc' }, { createdAt: 'asc' }], skip: 5, take: 5,
    }));
  });

  it('restricts the template catalog by asset prefix and selected system while preserving old reads', async () => {
    const findMany = jest.fn().mockResolvedValue([]), count = jest.fn().mockResolvedValue(0);
    await serviceWith({ findMany, count }).list('secondary-demo', { catalog: 'templates' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { systemCode: 'secondary-demo', assetCode: { startsWith: 'TPL-' } } }));
    expect(count).toHaveBeenCalledWith({ where: { systemCode: 'secondary-demo', assetCode: { startsWith: 'TPL-' } } });
  });

  it('lists page templates and reusable components together only for the library catalog', async () => {
    const findMany = jest.fn().mockResolvedValue([]), count = jest.fn().mockResolvedValue(0);
    await serviceWith({ findMany, count }).list('demo-portal', { catalog: 'library' });
    const where = { systemCode: 'demo-portal', OR: [{ assetCode: { startsWith: 'TPL-' } }, { assetCode: { startsWith: 'CMP-' } }] };
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(count).toHaveBeenCalledWith({ where });
  });

  it('aggregates taxonomy independently from list pagination and omits fake children for ungrouped records', async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { category: 'PAGE', subCategory: '目录类', _count: { _all: 2 }, _min: { sortNo: 20 } },
      { category: 'PAGE', subCategory: null, _count: { _all: 1 }, _min: { sortNo: 10 } },
      { category: 'SPECIAL', subCategory: null, _count: { _all: 1 }, _min: { sortNo: 30 } },
    ]);
    await expect(serviceWith({ groupBy }).taxonomy('demo-portal')).resolves.toEqual({ types: [
      { category: 'PAGE', count: 3, groups: [{ subCategory: '目录类', count: 2 }] },
      { category: 'SPECIAL', count: 1, groups: [] },
    ] });
    expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { systemCode: 'demo-portal' } }));
  });

  it('returns a historical detail with empty structured values', async () => {
    const historical = { ...baseRow, assetCode: null, maturity: null, definitionJson: null, definitionRefJson: null, artifactsJson: null, evidenceJson: null, evidenceCardsJson: null, nextEvidence: null };
    const detail = await serviceWith({ findFirst: jest.fn().mockResolvedValue(historical) }).detail('demo-portal', historical.id);
    expect(detail).toMatchObject({ assetCode: null, maturity: null, definition: [], definitionRef: null, artifacts: [], evidence: [], evidenceCards: [], nextEvidence: null });
  });

  it('returns not found when the id is outside the selected system', async () => {
    const service = serviceWith({ findFirst: jest.fn().mockResolvedValue(null) });
    await expect(service.detail('demo-portal', 'other-system-row')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('diagnoses malformed stored json without exposing the raw payload', async () => {
    const service = serviceWith({ findFirst: jest.fn().mockResolvedValue({ ...baseRow, definitionJson: { secret: 'RAW_DATABASE_VALUE' } }) });
    try {
      await service.detail('demo-portal', baseRow.id);
      throw new Error('expected detail to reject');
    } catch (error) {
      expect(error).toMatchObject({ status: 500, code: 'DATA_INVALID' });
      expect(String((error as Error).message)).not.toContain('RAW_DATABASE_VALUE');
    }
  });
});

describe('style scene catalog access boundary', () => {
  const request = { currentUser: { id: 'viewer-id', account: 'viewer', displayName: 'Viewer' } } as AuthenticatedRequest;
  it('uses navigation access for taxonomy and detail without page or action assertions', async () => {
    const scenes = { taxonomy: jest.fn().mockResolvedValue({ types: [] }), detail: jest.fn().mockResolvedValue(baseRow) };
    const authorization = { navigation: jest.fn().mockResolvedValue({}) , assertAction: jest.fn() };
    const controller = new StyleSceneController(scenes as unknown as StyleSceneService, authorization as unknown as AuthorizationService);
    await controller.taxonomy(request, 'demo-portal');
    await controller.detail(request, 'demo-portal', baseRow.id);
    expect(authorization.navigation).toHaveBeenCalledTimes(2);
    expect(authorization.assertAction).not.toHaveBeenCalled();
  });
});
