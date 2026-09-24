import { validateSeedDefinition, type SeedDefinition } from './seed-definition';

const valid: SeedDefinition = {
  systems: ['demo-portal', 'secondary-demo'],
  menus: [
    { systemCode: 'demo-portal', menuCode: 'customer-directory', nodeType: 'PAGE', parentCode: null, routePath: '/showcase/customers' },
    { systemCode: 'secondary-demo', menuCode: 'customer-directory', nodeType: 'PAGE', parentCode: null, routePath: '/showcase/customers' },
  ],
  actions: [{ systemCode: 'demo-portal', menuCode: 'customer-directory', actionCode: 'view' }],
  roles: [
    { systemCode: 'demo-portal', roleCode: 'system-manager', isSystem: true },
    { systemCode: 'secondary-demo', roleCode: 'system-manager', isSystem: true },
  ],
  grants: [
    { systemCode: 'demo-portal', roleCode: 'system-manager', menuCode: 'customer-directory', actionCode: null },
    { systemCode: 'demo-portal', roleCode: 'system-manager', menuCode: 'customer-directory', actionCode: 'view' },
    { systemCode: 'secondary-demo', roleCode: 'system-manager', menuCode: 'customer-directory', actionCode: null },
  ],
};

describe('seed definition validation', () => {
  it('accepts one system manager per system with explicit grants', () => {
    expect(validateSeedDefinition(valid)).toEqual([]);
  });

  it('rejects actions without menu grants, cross-system references and menu cycles', () => {
    const invalid: SeedDefinition = structuredClone(valid);
    invalid.grants = [{ systemCode: 'demo-portal', roleCode: 'system-manager', menuCode: 'customer-directory', actionCode: 'view' }];
    invalid.menus.push({ systemCode: 'demo-portal', menuCode: 'a', nodeType: 'GROUP', parentCode: 'b', routePath: null });
    invalid.menus.push({ systemCode: 'demo-portal', menuCode: 'b', nodeType: 'GROUP', parentCode: 'a', routePath: null });
    invalid.actions.push({ systemCode: 'secondary-demo', menuCode: 'missing', actionCode: 'view' });

    expect(validateSeedDefinition(invalid)).toEqual(expect.arrayContaining([
      'ACTION_REQUIRES_MENU_GRANT:demo-portal:system-manager:customer-directory:view',
      'MENU_PARENT_CYCLE:demo-portal:a',
      'ACTION_MENU_NOT_FOUND:secondary-demo:missing:view',
    ]));
  });

  it('rejects a child attached to a page', () => {
    const invalid: SeedDefinition = structuredClone(valid);
    invalid.menus.push({ systemCode: 'demo-portal', menuCode: 'child-of-page', nodeType: 'PAGE', parentCode: 'customer-directory', routePath: '/showcase/child' });
    expect(validateSeedDefinition(invalid)).toEqual(expect.arrayContaining([
      'MENU_PARENT_NOT_GROUP:demo-portal:child-of-page:customer-directory',
    ]));
  });
});
