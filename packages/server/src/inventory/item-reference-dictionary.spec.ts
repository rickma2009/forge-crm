import { InventoryService } from './inventory.service';
import type { DatabaseService } from '../database/database.service';

const id = '11111111-1111-4111-8111-111111111111';
const baseItem = { id, tenantId: 'tenant', itemCode: 'ITEM-1', itemName: '控制板', itemType: 'PRODUCT', itemSource: 'PURCHASED', itemLifecycle: 'SAMPLE', majorCategoryId: null, middleCategoryId: null, minorCategoryId: null, model: null, productLine: null, baseUnit: '件', batchManaged: false, status: 'ACTIVE', remark: null, version: 1, createdBy: 'admin', updatedBy: 'admin', createdAt: new Date('2026-10-05T00:00:00Z'), updatedAt: new Date('2026-10-05T00:00:00Z') };
function setup() {
  const db = {
    sysApplication: { findFirst: jest.fn().mockResolvedValue({ id, tenantId: 'tenant' }) },
    sysDictionaryItem: { findFirst: jest.fn().mockResolvedValue({ id }), findMany: jest.fn().mockResolvedValue([]) },
    sysDictionary: { findMany: jest.fn().mockResolvedValue([
      { dictCode: 'item_source', status: 'ACTIVE', items: [{ itemValue: 'PURCHASED', itemName: '外购', status: 'ACTIVE' }] },
      { dictCode: 'item_lifecycle', status: 'ACTIVE', items: [{ itemValue: 'SAMPLE', itemName: '样品', status: 'ACTIVE' }] },
    ]) },
    mdItem: { create: jest.fn().mockResolvedValue(baseItem), findFirst: jest.fn().mockResolvedValue({ itemSource: 'PURCHASED', itemLifecycle: 'SAMPLE' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(baseItem) },
  };
  return { db, service: new InventoryService(db as unknown as DatabaseService) };
}

describe('item reference dictionaries', () => {
  it('stores stable codes and returns current dictionary labels', async () => {
    const { db, service } = setup();
    const result = await service.createItem('scope-a', 'admin', { itemCode: 'ITEM-1', itemName: '控制板', itemType: 'PRODUCT', itemSource: 'PURCHASED', itemLifecycle: 'SAMPLE', baseUnit: '件' });
    expect(db.mdItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ itemSource: 'PURCHASED', itemLifecycle: 'SAMPLE' }) }));
    expect(result).toMatchObject({ itemSource: 'PURCHASED', itemSourceName: '外购', itemLifecycle: 'SAMPLE', itemLifecycleName: '样品' });
  });

  it.each([
    ['itemSource', 'INVALID', 'item_source'],
    ['itemLifecycle', 'INVALID', 'item_lifecycle'],
  ])('rejects invalid or unavailable %s references', async (field, value, dictCode) => {
    const { db, service } = setup();
    db.sysDictionaryItem.findFirst.mockResolvedValue(null);
    await expect(service.createItem('scope-a', 'admin', { itemCode: 'ITEM-1', itemName: '控制板', itemType: 'PRODUCT', [field]: value, baseUnit: '件' })).rejects.toThrow('字典值不存在或已停用');
    expect(db.sysDictionaryItem.findFirst).toHaveBeenCalledWith({ where: { itemValue: value, status: 'ACTIVE', dictionary: { systemCode: 'scope-a', dictCode, status: 'ACTIVE' } } });
    expect(db.mdItem.create).not.toHaveBeenCalled();
  });

  it('preserves an unchanged retired reference while updating other fields', async () => {
    const { db, service } = setup();
    db.mdItem.findFirst.mockResolvedValue({ itemSource: 'PURCHASED', itemLifecycle: 'SAMPLE' });
    await service.updateItem('scope-a', id, 'admin', { version: 1, itemSource: 'PURCHASED', itemLifecycle: 'SAMPLE', itemName: '新名称' });
    expect(db.sysDictionaryItem.findFirst).not.toHaveBeenCalled();
    expect(db.mdItem.updateMany).toHaveBeenCalled();
  });
});
