import { workbenchMonth, WorkbenchService } from './workbench.service';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../rbac/authorization.service';

describe('workbench scoped metrics', () => {
  it('uses Shanghai month boundaries including the year rollover', () => {
    const period = workbenchMonth(new Date('2026-12-31T16:00:00Z'));
    expect(period.month).toBe('2027-01');
    expect(period.start.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(period.end.toISOString()).toBe('2027-02-01T00:00:00.000Z');
    expect(workbenchMonth(new Date('2026-09-30T15:59:59Z')).month).toBe('2026-09');
  });
  function fixture(menus: string[]) {
    const tx = { sdOpp: { aggregate: jest.fn().mockResolvedValue({ _count: { _all: 2, expectedAmount: 1 }, _sum: { expectedAmount: { toFixed: () => '150000.00' } } }), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) }, scmInventoryBalance: { groupBy: jest.fn().mockResolvedValue([{ currencyCode: 'CNY', _sum: { amount: { toFixed: () => '38000.00' } } }, { currencyCode: 'USD', _sum: { amount: { toFixed: () => '900.00' } } }]) }, sysPersonalTodo: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };
    const db = { sysApplication: { findFirst: jest.fn().mockResolvedValue({ id: 'app-1', tenantId: 'tenant-1' }) }, $transaction: jest.fn(async (run) => run(tx)) };
    const auth = { navigation: jest.fn().mockResolvedValue({ items: menus.map((menuCode) => ({ menuCode, children: [], allowedActions: [{ actionCode: 'view' }] })) }) };
    return { tx, db, service: new WorkbenchService({ visibleOpen: async () => ({items:[],total:0}) } as unknown as import("../personal-todo/personal-todo.service").PersonalTodoService, db as unknown as DatabaseService, auth as unknown as AuthorizationService) };
  }
  it('does not query unauthorized sources or misrepresent them as zero', async () => {
    const { service, tx } = fixture([]);
    const result = await service.get('demo-portal', 'user-1');
    expect(result.following).toBeNull(); expect(result.signed).toBeNull(); expect(result.inventory).toBeNull();
    expect(tx.sdOpp.aggregate).not.toHaveBeenCalled(); expect(tx.sdOpp.findMany).not.toHaveBeenCalled(); expect(tx.scmInventoryBalance.groupBy).not.toHaveBeenCalled();
  });
  it('filters lifecycle metrics by the correct dates, isolates scope and keeps currencies separate', async () => {
    const { service, tx, db } = fixture(['opportunity-directory', 'inventory-balance-directory']);
    const result = await service.get('demo-portal', 'user-1');
    expect(tx.sdOpp.aggregate.mock.calls[0][0].where).toMatchObject({ applicationId: 'app-1', tenantId: 'tenant-1', status: 'ACTIVE', businessStatus: { in: ['INITIAL', 'FOLLOWING'] }, expectedSignDate: { gte: expect.any(Date), lt: expect.any(Date) } });
    expect(tx.sdOpp.aggregate.mock.calls[1][0].where).toMatchObject({ businessStatus: 'SIGNED', signedDate: { gte: expect.any(Date), lt: expect.any(Date) } });
    expect(tx.sdOpp.findMany.mock.calls[0][0].where.ownerUserId).toBe('user-1');
    expect(tx.sdOpp.findMany.mock.calls[1][0].where).toMatchObject({ ownerUserId: 'user-1', expectedSignDate: { lt: expect.any(Date) } });
    expect(tx.scmInventoryBalance.groupBy.mock.calls[0][0].where).toEqual({ tenantId: 'tenant-1' });
    expect(result.inventory).toEqual([{ currency: 'CNY', amount: '38000.00' }, { currency: 'USD', amount: '900.00' }]);
    expect(result.following?.missingAmount).toBe(1);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
  });
});
