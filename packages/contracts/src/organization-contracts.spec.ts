import { describe, expect, it } from 'vitest';
import { organizationUnitListSchema, organizationUnitWriteSchema } from './index';

describe('organization unit contracts', () => {
  it('accepts a hierarchy response with computed depth', () => {
    const parsed = organizationUnitListSchema.parse({ items: [
      { id: '11111111-1111-4111-8111-111111111111', parentId: null, unitCode: 'demo-company', unitName: '示范集团', unitType: 'COMPANY', sortNo: 10, status: 'ACTIVE', effectiveAt: '2026-01-01T00:00:00.000Z', expiresAt: null, remark: null, depth: 0, version: 1, updatedAt: '2026-09-22T00:00:00.000Z' },
      { id: '22222222-2222-4222-8222-222222222222', parentId: '11111111-1111-4111-8111-111111111111', unitCode: 'sales-division', unitName: '销售事业部', unitType: 'DIVISION', sortNo: 10, status: 'ACTIVE', effectiveAt: '2026-01-01T00:00:00.000Z', expiresAt: null, remark: null, depth: 1, version: 1, updatedAt: '2026-09-22T00:00:00.000Z' },
    ] });

    expect(parsed.items.map((item) => [item.unitCode, item.depth])).toEqual([['demo-company', 0], ['sales-division', 1]]);
  });

  it('rejects a half-open validity interval whose end is not after its start', () => {
    const result = organizationUnitWriteSchema.safeParse({ unitCode: 'sales', unitName: '销售部', unitType: 'DEPARTMENT', sortNo: 10, status: 'ACTIVE', effectiveAt: '2026-01-02T00:00:00.000Z', expiresAt: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(false);
  });
});
