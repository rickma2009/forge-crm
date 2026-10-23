import { D, documentNo, movingAverageIssue, priceOrder, shipmentAmount } from './sales-domain';

describe('sales monetary and stock rules', () => {
  it('allocates header discount to cents and reconciles order total', () => {
    const priced = priceOrder([
      { quantity: '1', unitPrice: '0.03', discount: '1', taxRate: '0.13' },
      { quantity: '1', unitPrice: '0.03', discount: '1', taxRate: '0.13' },
    ], '0.5');
    expect(priced.netAmount.toFixed(2)).toBe('0.03');
    expect(priced.lines.map((line) => line.finalAmount.toFixed(2))).toEqual(['0.02', '0.01']);
  });
  it('gives the final shipment the rounding remainder', () => {
    expect(shipmentAmount(D('10.00'), D(3), D(0), D(0), D(1)).toFixed(2)).toBe('3.33');
    expect(shipmentAmount(D('10.00'), D(3), D(2), D('6.66'), D(1)).toFixed(2)).toBe('3.34');
  });
  it('calculates issue cost and rejects quantities above the supplied balance', () => {
    expect(movingAverageIssue(D(3), D('10.00'), D(1)).cost.toFixed(2)).toBe('3.33');
    expect(movingAverageIssue(D(3), D('10.00'), D(3)).remainingAmount.toFixed(2)).toBe('0.00');
    expect(() => movingAverageIssue(D(3), D('10.00'), D(4))).toThrow('库存不足');
  });
  it('uses registered daily document numbers', () => {
    expect(documentNo('SO', '2026-10-03', 1)).toBe('SO2026100300001');
    expect(documentNo('XSCK', '2026-10-03', 50)).toBe('XSCK2026100300050');
  });
});
