import { pricePurchase, allocateReceipt } from './purchasing-domain';
import { D } from '../sales/sales-domain';
describe('purchase money precision', () => {
    it('allocates header-discount pennies exactly with deterministic ties', () => { const p = pricePurchase([1, 2].map(() => ({ quantity: '1', unitPrice: '0.03', discount: '1', taxRate: '0.13' })), '0.5'); expect(p.netAmount.toFixed(2)).toBe('0.03'); expect(p.lines.map(l => l.finalAmount.toFixed(2))).toEqual(['0.02', '0.01']); });
    it('retains cents above JavaScript safe integer precision and rejects numeric overflow', () => { const p = pricePurchase([{ quantity: '1', unitPrice: '90000000000000.01', discount: '1', taxRate: '0.13' }], '1'); expect(p.netAmount.toFixed(2)).toBe('90000000000000.01'); expect(p.lines[0].finalAmount.toFixed(2)).toBe('90000000000000.01'); expect(() => pricePurchase([{ quantity: '1000000000', unitPrice: '1000000000', discount: '1', taxRate: '0.13' }], '1')).toThrow('超过'); });
    it('allocates last receipt tail and prevents repeated rounding exceeding total', () => { expect(allocateReceipt(D(10), D(3), D(2), D('6.66'), D(1)).toFixed(2)).toBe('3.34'); expect(allocateReceipt(D('0.02'), D(1), D('0.8'), D('0.02'), D('0.2')).toFixed(2)).toBe('0.00'); });
});
