import { SalesPostingService } from './sales-posting.service';
import { D } from '../sales/sales-domain';

const scope = { id: 'application-a', tenantId: 'tenant-a' };
const document = { id: 'outbound-a', outboundNo: 'XSCK-TEST', legalEntityId: 'entity-a', warehouseId: 'warehouse-a', currencyCode: 'CNY' };
const line = { id: 'line-a', lineNo: 3, itemId: 'item-a', itemCode: 'P001', itemName: '演练物料', baseUnit: '件', batchNo: 'B001', quantity: D(2), costAmount: D(25), remark: '' };
const dimension = { tenantId: scope.tenantId, legalEntityId: document.legalEntityId, warehouseId: document.warehouseId, itemCode: line.itemCode, batchNo: line.batchNo };
function fixture() {
  return {
    mdItem: { findFirst: jest.fn().mockResolvedValue({ itemCode: 'P001', batchManaged: true }) },
    scmInventoryBalance: {
      findUnique: jest.fn().mockResolvedValue({ id: 'balance-a', quantity: D(8), amount: D(80), version: 4 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }), upsert: jest.fn().mockResolvedValue({}),
    },
    scmInventoryTxn: { create: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue({ id: 'original-issue' }) },
  };
}

describe('sales inventory posting boundary (mock transaction)', () => {
  const service = new SalesPostingService();
  it('uses the full stock dimension and preserves source line identity in the negative movement', async () => {
    const tx = fixture();
    expect((await service.post(tx as never, scope, document, line, 'reviewer')).toFixed(2)).toBe('20.00');
    expect(tx.scmInventoryBalance.findUnique).toHaveBeenCalledWith({ where: { tenantId_legalEntityId_warehouseId_itemCode_batchNo: dimension } });
    const update = tx.scmInventoryBalance.updateMany.mock.calls[0][0];
    expect(update.where).toMatchObject({ id: 'balance-a', version: 4 });
    expect(update.data.quantity.toString()).toBe('6'); expect(update.data.amount.toString()).toBe('60');
    const movement = tx.scmInventoryTxn.create.mock.calls[0][0].data;
    expect(movement).toMatchObject({ tenantId: 'tenant-a', applicationId: 'application-a', legalEntityId: 'entity-a', warehouseId: 'warehouse-a', batchNo: 'B001', sourceOrderId: document.id, sourceLineId: line.id, lineNo: 3, movementType: 'OUTBOUND' });
    expect(movement.quantity.toString()).toBe('-2'); expect(movement.amount.toString()).toBe('-20');
  });
  it('does not write balances or movements when stock is insufficient', async () => {
    const tx = fixture();
    await expect(service.post(tx as never, scope, document, { ...line, quantity: D(9) }, 'reviewer')).rejects.toThrow('库存不足');
    expect(tx.scmInventoryBalance.updateMany).not.toHaveBeenCalled(); expect(tx.scmInventoryTxn.create).not.toHaveBeenCalled();
  });
  it('does not append a movement after the optimistic stock update loses a race', async () => {
    const tx = fixture(); tx.scmInventoryBalance.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.post(tx as never, scope, document, line, 'reviewer')).rejects.toThrow('库存并发变化');
    expect(tx.scmInventoryTxn.create).not.toHaveBeenCalled();
  });
  it.each([{ batchManaged: true, batchNo: '' }, { batchManaged: false, batchNo: 'B001' }])('rejects incompatible batch flags: %j', async ({ batchManaged, batchNo }) => {
    const tx = fixture(); tx.mdItem.findFirst.mockResolvedValue({ itemCode: 'P001', batchManaged });
    await expect(service.post(tx as never, scope, document, { ...line, batchNo }, 'reviewer')).rejects.toThrow('批次无效');
    expect(tx.scmInventoryBalance.findUnique).not.toHaveBeenCalled(); expect(tx.scmInventoryTxn.create).not.toHaveBeenCalled();
  });
  it('reverses the stored issue cost instead of recalculating from current average cost', async () => {
    const tx = fixture(); await service.reverse(tx as never, scope, document, line, 'reviewer');
    expect(tx.scmInventoryTxn.findUnique).toHaveBeenCalledWith({ where: { sourceLineId_movementType: { sourceLineId: line.id, movementType: 'OUTBOUND' } } });
    expect(tx.scmInventoryBalance.findUnique).not.toHaveBeenCalled();
    const balance = tx.scmInventoryBalance.upsert.mock.calls[0][0];
    expect(balance.where).toEqual({ tenantId_legalEntityId_warehouseId_itemCode_batchNo: dimension });
    expect(balance.update.quantity.increment.toString()).toBe('2'); expect(balance.update.amount.increment.toString()).toBe('25');
    const movement = tx.scmInventoryTxn.create.mock.calls[0][0].data;
    expect(movement.movementType).toBe('OUTBOUND_REVERSAL'); expect(movement.amount.toString()).toBe('25');
  });
  it('rejects a reversal without its original issue movement', async () => {
    const tx = fixture(); tx.scmInventoryTxn.findUnique.mockResolvedValue(null);
    await expect(service.reverse(tx as never, scope, document, line, 'reviewer')).rejects.toThrow('原销售出库流水不存在');
    expect(tx.scmInventoryBalance.upsert).not.toHaveBeenCalled(); expect(tx.scmInventoryTxn.create).not.toHaveBeenCalled();
  });
});
