import { expandOrganizationBindings } from './subject-membership';

describe('organization role binding expansion', () => {
  const nodes = [{ id: 'company', parentId: null }, { id: 'sales', parentId: 'company' }, { id: 'north', parentId: 'sales' }];
  it('matches only the same organization unless descendants are explicit', () => {
    expect(expandOrganizationBindings(nodes, ['north'], [{ roleId: 'local', orgId: 'sales', includeDescendants: false }, { roleId: 'regional', orgId: 'sales', includeDescendants: true }])).toEqual(['regional']);
  });
  it('does not inherit through an absent/inactive ancestor and rejects cycles', () => {
    expect(expandOrganizationBindings([{ id: 'north', parentId: 'missing' }], ['north'], [{ roleId: 'r', orgId: 'missing', includeDescendants: true }])).toEqual([]);
    expect(() => expandOrganizationBindings([{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }], ['a'], [{ roleId: 'r', orgId: 'b', includeDescendants: true }])).toThrow();
  });
});
