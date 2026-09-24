import { InventoryService } from './inventory.service';
import { DatabaseService } from '../database/database.service';
const id = '11111111-1111-4111-8111-111111111111';
const input = { legalEntityId: id, warehouseCode: 'TEST', warehouseName: '测试仓', warehouseType: 'SAMPLE', warehouseNature: 'OWNED' };
function setup() {
  const db = { sysApplication: { findFirst: jest.fn().mockResolvedValue({ id, tenantId: id }) }, sysDictionaryItem: { findFirst: jest.fn().mockResolvedValue({ id }) }, orgLegalEntity: { findFirst: jest.fn().mockResolvedValue({ id }) }, scmWarehouse: { create: jest.fn().mockResolvedValue(input), findFirst: jest.fn().mockResolvedValue({ warehouseType: 'WIP', warehouseNature: 'PHYSICAL' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(input) } };
  return { db, service: new InventoryService(db as unknown as DatabaseService) };
}
describe('warehouse dictionary boundary', () => {
  it('validates both dictionary values in the current system before creating', async () => {
    const { db, service } = setup(); await service.createWarehouse('scope-a', 'admin', input);
    expect(db.sysDictionaryItem.findFirst).toHaveBeenCalledWith({ where: { itemValue: 'SAMPLE', status: 'ACTIVE', dictionary: { systemCode: 'scope-a', dictCode: 'warehouse_type', status: 'ACTIVE' } }, select: { id: true } });
    expect(db.sysDictionaryItem.findFirst).toHaveBeenCalledTimes(2);
    expect(db.scmWarehouse.create).toHaveBeenCalled();
  });
  it.each(['warehouseType', 'warehouseNature'])('rejects absent, disabled or out-of-scope %s values', async (field) => {
    const { db, service } = setup(); db.sysDictionaryItem.findFirst.mockImplementation(async ({ where }: { where: { itemValue: string } }) => where.itemValue === 'INVALID' ? null : { id });
    await expect(service.createWarehouse('scope-a', 'admin', { ...input, [field]: 'INVALID' })).rejects.toThrow('不存在或已停用');
    expect(db.scmWarehouse.create).not.toHaveBeenCalled();
  });
  it('preserves unchanged retired values when editing other fields', async () => {
    const { db, service } = setup(); await service.updateWarehouse('scope-a', id, 'admin', { version: 1, warehouseName: '新名称', warehouseType: 'WIP', warehouseNature: 'PHYSICAL' });
    expect(db.sysDictionaryItem.findFirst).not.toHaveBeenCalled(); expect(db.scmWarehouse.updateMany).toHaveBeenCalled();
  });
  it('rejects changing a classification to an invalid value', async () => {
    const { db, service } = setup(); db.sysDictionaryItem.findFirst.mockResolvedValue(null);
    await expect(service.updateWarehouse('scope-a', id, 'admin', { version: 1, warehouseNature: 'other' })).rejects.toThrow('仓库性质');
    expect(db.scmWarehouse.updateMany).not.toHaveBeenCalled();
  });
});
