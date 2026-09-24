import { describe, expect, it } from 'vitest';
import {
  inboundOrderSchema,
  inventoryBalanceListSchema,
  inboundOrderWriteSchema,
  inventoryCommandSchema,
  itemWriteSchema,
  nextInboundStatus,
  normalizeBatch,
} from './inventory';

describe('inventory contracts', () => {
  it('accepts an immutable enterprise item code and rejects lowercase codes', () => {
    expect(itemWriteSchema.parse({ itemCode: 'P-2026_001', itemName: '控制板', itemType: 'PRODUCT', baseUnit: '件' }).itemCode).toBe('P-2026_001');
    expect(() => itemWriteSchema.parse({ itemCode: 'p001', itemName: '控制板', itemType: 'PRODUCT', baseUnit: '件' })).toThrow();
  });

  it('normalizes an absent batch to the one canonical empty value', () => {
    expect(normalizeBatch(undefined)).toBe('');
    expect(normalizeBatch('  LOT-01 ')).toBe('LOT-01');
  });

  it('permits only post, reverse and void transitions', () => {
    expect(nextInboundStatus('DRAFT', 'post')).toBe('POSTED');
    expect(nextInboundStatus('POSTED', 'reverse')).toBe('REVERSED');
    expect(nextInboundStatus('DRAFT', 'void')).toBe('VOIDED');
    expect(() => nextInboundStatus('POSTED', 'post')).toThrow('不允许');
  });

  it('requires a positive actual quantity and decimal strings', () => {
    const base = { legalEntityId: crypto.randomUUID(), warehouseId: crypto.randomUUID(), documentDate: '2026-09-24', inboundType: 'FINISHED_GOODS', reasonCode: 'NORMAL', remark: null, version: 0, lines: [{ lineNo: 10, itemCode: 'P001', batchNo: null, originalQty: '2.0000', actualQty: '2.0000', amount: '20.00', remark: null }] };
    expect(inboundOrderWriteSchema.parse(base).lines).toHaveLength(1);
    expect(() => inboundOrderWriteSchema.parse({ ...base, lines: [{ ...base.lines[0], actualQty: '0' }] })).toThrow();
  });

  it('requires an idempotency key for posting commands', () => {
    expect(inventoryCommandSchema.parse({ version: 1, requestKey: crypto.randomUUID() }).version).toBe(1);
  });
});

describe('inventory response contracts', () => {
  it('accepts an inbound order detail with decimal strings', () => {
    expect(inboundOrderSchema.parse({
      id: '11111111-1111-4111-8111-111111111111', orderNo: 'RK2026092400001', documentDate: '2026-09-24',
      inboundType: 'FINISHED_GOODS', status: 'DRAFT', legalEntityId: '22222222-2222-4222-8222-222222222222', legalEntityName: '部件法人',
      warehouseId: '33333333-3333-4333-8333-333333333333', warehouseName: '成品仓', factoryCode: null, reasonCode: 'FINISHED_GOODS',
      currencyCode: 'CNY', remark: null, postedAt: null, reversedAt: null, version: 1,
      createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z',
      lines: [{ id: '44444444-4444-4444-8444-444444444444', lineNo: 1, itemCode: 'P001', itemName: '产品', batchNo: null, originalQty: null, actualQty: '1.0000', baseUnit: '件', amount: '10.00', remark: null }],
    }).orderNo).toBe('RK2026092400001');
  });

  it('accepts a read-only inventory balance page', () => {
    const result = inventoryBalanceListSchema.parse({
      items: [{ id: '55555555-5555-4555-8555-555555555555', legalEntityId: '22222222-2222-4222-8222-222222222222', warehouseId: '33333333-3333-4333-8333-333333333333', itemCode: 'P001', itemName: '产品', itemType: 'PRODUCT', batchNo: null, baseUnit: '件', quantity: '1.0000', amount: '10.00', currencyCode: 'CNY', version: 1, updatedAt: '2026-09-24T00:00:00.000Z' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    expect(result.items[0]?.quantity).toBe('1.0000');
  });
});
