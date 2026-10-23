import { orderOrganizationTree, wouldCreateOrganizationCycle } from './organization.service';

const row = (id: string, parentId: string | null, unitCode: string, sortNo: number) => ({
  id, parentId, unitCode, unitName: unitCode, unitType: 'DEPARTMENT' as const, isSalesOrg: false, isRdOrg: false, isPlatformOrg: false, managerEmployeeId: null, sortNo, status: 'ACTIVE' as const,
  effectiveAt: new Date('2026-01-01T00:00:00.000Z'), expiresAt: null, remark: null, version: 1, updatedAt: new Date('2026-09-22T00:00:00.000Z'),
});

describe('organization hierarchy rules', () => {
  it('orders parents before children and computes depth without persisting it', () => {
    const root = row('root', null, 'root', 20);
    const childB = row('child-b', 'root', 'child-b', 20);
    const childA = row('child-a', 'root', 'child-a', 10);
    const result = orderOrganizationTree([childB, root, childA]);
    expect(result.map((item) => [item.unitCode, item.depth])).toEqual([['root', 0], ['child-a', 1], ['child-b', 1]]);
  });

  it('rejects moving a unit below one of its descendants', () => {
    const parents = new Map([['root', null], ['division', 'root'], ['team', 'division']]);
    expect(wouldCreateOrganizationCycle('root', 'team', parents)).toBe(true);
    expect(wouldCreateOrganizationCycle('team', 'root', parents)).toBe(false);
  });
});
