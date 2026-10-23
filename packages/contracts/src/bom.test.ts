import { describe, expect, it } from 'vitest';
import { bomSaveSchema } from './bom';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const c = '33333333-3333-4333-8333-333333333333';
const line = { lineCode: 'L010', itemId: a, quantity: '2.0000', sortNo: 10, childBomId: null, alternatives: [{ itemId: b, priority: 1, ratio: '1' }] };

describe('BOM draft input', () => {
  it('accepts a direct component with a line-scoped alternative', () => {
    expect(bomSaveSchema.parse({ rowVersion: 1, baseQuantity: '1', lines: [line] }).lines[0].alternatives).toHaveLength(1);
  });
  it('rejects duplicate line codes, replacement material and priorities', () => {
    expect(bomSaveSchema.safeParse({ rowVersion: 1, baseQuantity: '1', lines: [line, { ...line, itemId: c }] }).success).toBe(false);
    expect(bomSaveSchema.safeParse({ rowVersion: 1, baseQuantity: '1', lines: [{ ...line, alternatives: [{ itemId: a, priority: 1, ratio: '1' }] }] }).success).toBe(false);
    expect(bomSaveSchema.safeParse({ rowVersion: 1, baseQuantity: '1', lines: [{ ...line, alternatives: [{ itemId: b, priority: 1, ratio: '1' }, { itemId: c, priority: 1, ratio: '1' }] }] }).success).toBe(false);
  });
  it('rejects nonpositive or over-precise quantities', () => {
    for (const quantity of ['0', '-1', '1.00001', '1e2']) expect(bomSaveSchema.safeParse({ rowVersion: 1, baseQuantity: '1', lines: [{ ...line, quantity }] }).success).toBe(false);
  });
});
