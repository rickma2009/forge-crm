import { assertRoleParent, assertRolePeriod } from './role-tree';

describe('role hierarchy public invariants', () => {
  const roles = [{ id: 'a', parentId: null }, { id: 'b', parentId: 'a' }, { id: 'c', parentId: 'b' }];
  it('rejects descendant and missing parents while allowing a root move', () => {
    expect(() => assertRoleParent(roles, 'a', 'c')).toThrow();
    expect(() => assertRoleParent(roles, 'c', 'missing')).toThrow();
    expect(() => assertRoleParent(roles, 'c', null)).not.toThrow();
  });
  it('rejects equal or inverted role periods and permits open-ended periods', () => {
    expect(() => assertRolePeriod(new Date('2026-01-01'), new Date('2026-01-01'))).toThrow();
    expect(() => assertRolePeriod(new Date('2026-02-01'), new Date('2026-01-01'))).toThrow();
    expect(() => assertRolePeriod(new Date('2026-01-01'), null)).not.toThrow();
  });
});
