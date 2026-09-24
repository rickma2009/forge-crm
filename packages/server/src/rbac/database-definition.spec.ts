import { databaseRowsToSeedDefinition } from './database-definition';
import { validateSeedDefinition } from './seed-definition';

describe('database definition projection', () => {
  it('exposes stale active records to the full invariant validator', () => {
    const definition = databaseRowsToSeedDefinition({
      systems: ['demo-portal'],
      menus: [{ id: 'menu-1', systemCode: 'demo-portal', menuCode: 'customer-directory', menuName: '客户管理', nodeType: 'PAGE', parentId: null, routePath: '/showcase/customers' }],
      actions: [{ id: 'action-1', menuId: 'menu-1', actionCode: 'export', actionName: '导出', actionType: 'EXPORT' }],
      roles: [{ id: 'role-1', systemCode: 'demo-portal', roleCode: 'system-manager', roleName: '系统管理员', isSystem: true }],
      grants: [{ roleId: 'role-1', permission: { permissionCode: 'navigation.customer-directory.access' } }],
    });

    expect(validateSeedDefinition(definition)).toContain('SYSTEM_MANAGER_ACTION_GRANT_MISSING:demo-portal:customer-directory:export');
  });
});
