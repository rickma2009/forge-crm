import { businessListDefaultConfig, resolvedListViewsSchema } from '@forge-crm/contracts';
import { ListViewService } from './list-view.service';
import type { DatabaseService } from '../database/database.service';
import { resolveEffectiveRoleIds } from '../rbac/role-scope';

jest.mock('../rbac/role-scope', () => ({ resolveEffectiveRoleIds: jest.fn(async () => ['role']) }));
const id = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const config = businessListDefaultConfig('product-directory');
const system = { id, viewCode: 'object-default', viewName: '产品默认视图', isDefault: true, allowPersonalOverride: true, version: 1, config };
const personal = { id: userId, baseViewId: id, viewName: '我的视图', isDefault: true, config, version: 1 };
function fixture() {
  const db = {
    sysApplication: { findFirst: jest.fn(async () => ({ id: 'app' })) },
    uiSystemListView: { findMany: jest.fn().mockResolvedValue([system]) },
    uiUserListView: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), updateMany: jest.fn(), create: jest.fn().mockResolvedValue(personal) },
    uiUserListViewPreference: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation((fn) => fn(db));
  return { db, service: new ListViewService(db as unknown as DatabaseService) };
}
describe('object-scoped list views', () => {
  beforeEach(() => { jest.mocked(resolveEffectiveRoleIds).mockResolvedValue(['role']); });
  it('chooses the system default, then restores an explicit personal reference', async () => {
    const { db, service } = fixture();
    const first = await service.resolve(userId, 'demo', 'product-directory', 'view');
    expect(resolvedListViewsSchema.parse(first).selectedViewKey).toBe(`system:${id}`);
    db.uiUserListView.findMany.mockResolvedValue([personal]); db.uiUserListViewPreference.findUnique.mockResolvedValue({ selectedViewKey: `user:${userId}` });
    expect((await service.resolve(userId, 'demo', 'product-directory', 'view')).selectedViewKey).toBe(`user:${userId}`);
    expect(db.uiUserListView.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { userId, systemCode: 'demo', pageCode: 'product-directory', actionCode: 'view', baseViewId: { in: [id] } } }));
  });
  it('explains fallback after an invalid reference and never uses an arbitrary first view', async () => {
    const { db, service } = fixture();
    db.uiUserListViewPreference.findUnique.mockResolvedValue({ selectedViewKey: 'user:removed' });
    const result = await service.resolve(userId, 'demo', 'product-directory', 'view');
    expect(result.fallbackNotice).toContain('失效'); expect(result.selectedViewKey).toBe(`system:${id}`);
    db.uiSystemListView.findMany.mockResolvedValue([{ ...system, isDefault: false }]);
    await expect(service.resolve(userId, 'demo', 'product-directory', 'view')).rejects.toThrow('默认视图');
  });
  it('does not expose the registered baseline without an effective role', async () => {
    jest.mocked(resolveEffectiveRoleIds).mockResolvedValue([]);
    const { db, service } = fixture(); await expect(service.resolve(userId, 'demo', 'product-directory', 'view')).rejects.toThrow('有效角色');
    expect(db.uiSystemListView.findMany).not.toHaveBeenCalled();
  });
  it('saves the personal default and selected reference in one transaction', async () => {
    const { db, service } = fixture();
    await service.createPersonal(userId, 'demo', 'product-directory', 'view', { baseViewId: id, viewName: '个人', isDefault: true, config });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.uiUserListViewPreference.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { applicationId: 'app', selectedViewKey: `user:${userId}` } }));
  });
  it('rejects foreign object fields and removal of the detail entry', async () => {
    const { db, service } = fixture();
    const write = (next: unknown) => service.createPersonal(userId, 'demo', 'product-directory', 'view', { baseViewId: id, viewName: '个人', isDefault: true, config: next });
    await expect(write({ ...config, columns: [{ ...config.columns[0], key: 'quoteCode' }] })).rejects.toThrow('基线之外');
    await expect(write({ ...config, columns: config.columns.map((column) => ({ ...column, visible: column.key !== 'productCode' })) })).rejects.toThrow('详情入口');
    expect(db.uiUserListView.create).not.toHaveBeenCalled();
  });
});
