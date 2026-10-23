import { InventoryService } from './inventory.service';
import type { DatabaseService } from '../database/database.service';
function fixture() { const db = { sysApplication: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant' }) }, mdItem: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(100) } }; return { db, service: new InventoryService(db as unknown as DatabaseService) }; }
describe('item server grid', () => {
  it('retains tenant and tree scope while applying column filters and stable sorting', async () => {
    const { db, service } = fixture(), category = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await service.listItems('demo', { page: 3, pageSize: 25, majorCategoryId: category, columnFilters: JSON.stringify({ itemType: 'PRODUCT', model: 'ARM', batchManaged: 'true' }), orderBy: 'itemCode', order: 'asc' });
    expect(db.mdItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant', majorCategoryId: category, AND: [{ itemType: 'PRODUCT' }, { model: { contains: 'ARM', mode: 'insensitive' } }, { batchManaged: true }] }), orderBy: [{ itemCode: 'asc' }, { id: 'asc' }], skip: 50, take: 25 }));
    expect(db.mdItem.count.mock.calls[0][0].where).toEqual(db.mdItem.findMany.mock.calls[0][0].where);
  });
  it('rejects unknown filters and bad enum values', async () => { const { db, service } = fixture(); for (const columnFilters of [{ tenantId: 'other' }, { itemType: 'BAD' }]) await expect(service.listItems('demo', { columnFilters: JSON.stringify(columnFilters) })).rejects.toThrow('无效'); expect(db.mdItem.findMany).not.toHaveBeenCalled(); });
});
