import { activeItemSetIsComplete, formatInboundNumber, postingLineError } from './inventory-domain';

describe('inventory domain', () => {
  it('formats the approved daily inbound number', () => {
    expect(formatInboundNumber('2026-09-24', 1)).toBe('RK2026092400001');
    expect(() => formatInboundNumber('2026-09-24', 100000)).toThrow('流水');
  });

  it('requires a batch only for batch-managed items', () => {
    expect(postingLineError({ batchManaged: true, batchNo: '', originalQty: null, actualQty: '1.0000', amount: '2.00', reasonCode: 'NORMAL', remark: null })).toContain('批次');
    expect(postingLineError({ batchManaged: false, batchNo: '', originalQty: '1.0000', actualQty: '1.0000', amount: '2.00', reasonCode: 'NORMAL', remark: null })).toBeNull();
  });

  it('requires a reason for quantity differences and zero amount', () => {
    expect(postingLineError({ batchManaged: false, batchNo: '', originalQty: '2.0000', actualQty: '1.0000', amount: '2.00', reasonCode: '', remark: null })).toContain('差异');
    expect(postingLineError({ batchManaged: false, batchNo: '', originalQty: '1.0000', actualQty: '1.0000', amount: '0.00', reasonCode: '', remark: null })).toContain('零金额');
  });

  it('accepts repeated item codes when every distinct item remains active', () => {
    expect(activeItemSetIsComplete(1, ['P001', 'P001'])).toBe(true);
    expect(activeItemSetIsComplete(1, ['P001', 'P002'])).toBe(false);
  });
});
