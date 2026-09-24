import { describe, expect, it } from 'vitest';
import { quotationLineAmount, quotationTotal, suggestedPrice, validateTiers, quotationExpired, decimalUnits } from './quotation';

describe('quotation money and tier invariants', () => {
  it('rounds each line HALF_UP before summing', () => {
    expect(quotationLineAmount('3', '0.05', '10')).toBe('0.14');
    expect(quotationTotal(['0.14', '0.14'])).toBe('0.28');
    expect(quotationLineAmount('1', '9999999999999999.99', '0')).toBe('9999999999999999.99');
  });
  it('rejects unsupported decimals rather than silently rounding inputs', () => {
    for (const value of ['-1', '1e3', 'NaN', '1.001', '']) expect(() => decimalUnits(value, 2)).toThrow();
    expect(() => quotationLineAmount('0', '1', '0')).toThrow();
    expect(() => quotationLineAmount('1', '1', '100.01')).toThrow();
    expect(quotationLineAmount('2', '1', '100')).toBe('0.00');
    expect(() => quotationTotal(['9999999999999999.99', '0.01'])).toThrow();
  });
  const tiers = [{ from: '0', to: '10', price: '100' }, { from: '10', to: null, price: '90' }];
  it('matches individual decimal quantities with left-closed bounds', () => {
    expect(suggestedPrice('120', tiers, '9.9999')).toEqual({ price: '100.00', source: 'TIER', from: '0', to: '10' });
    expect(suggestedPrice('120', tiers, '10').price).toBe('90.00');
    expect(suggestedPrice('120', [], '6').price).toBe('120.00');
    expect(suggestedPrice('120', tiers, '6').price).toBe('100.00');
  });
  it('rejects gaps, overlap and an uncovered tail', () => {
    expect(() => validateTiers([{ from: '1', to: null, price: '1' }])).toThrow();
    expect(() => validateTiers([{ from: '0', to: '10', price: '1' }])).toThrow();
    for (const from of ['9', '11']) expect(() => validateTiers([tiers[0], { from, to: null, price: '1' }])).toThrow();
  });
  it('expires at Shanghai midnight after the inclusive date', () => {
    expect(quotationExpired('2026-09-23', new Date('2026-09-23T15:59:59Z'))).toBe(false);
    expect(quotationExpired('2026-09-23', new Date('2026-09-23T16:00:00Z'))).toBe(true);
  });
});

it('requires a single creation mode and rejects caller-supplied system fields', async () => {
  const { quotationCreateSchema } = await import('./quotation');
  const id = '00000000-0000-4000-8000-000000000001';
  expect(quotationCreateSchema.safeParse({ mode: 'OPPORTUNITY', opportunityId: id, opportunityVersion: 1, requestKey: id }).success).toBe(true);
  expect(quotationCreateSchema.safeParse({ mode: 'INDEPENDENT', customerId: id, requestKey: id }).success).toBe(true);
  expect(quotationCreateSchema.safeParse({ mode: 'OPPORTUNITY', opportunityId: id, opportunityVersion: 1, customerId: id, requestKey: id }).success).toBe(false);
  expect(quotationCreateSchema.safeParse({ mode: 'INDEPENDENT', customerId: id, quoteCode: 'MY-NUMBER', requestKey: id }).success).toBe(false);
});

it('requires the opportunity version reviewed before creation', async () => {
  const { quotationCreateSchema } = await import('./quotation');
  const id = '00000000-0000-4000-8000-000000000001';
  expect(quotationCreateSchema.safeParse({ mode: 'OPPORTUNITY', opportunityId: id, requestKey: id }).success).toBe(false);
});
