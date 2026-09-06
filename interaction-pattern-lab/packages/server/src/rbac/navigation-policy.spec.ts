import { buildAuthorizedNavigation, type AuthorizationRow } from './navigation-policy';

const row = (overrides: Partial<AuthorizationRow>): AuthorizationRow => ({
  menuId: 'menu-overview',
  menuCode: 'overview',
  menuName: '概览',
  nodeType: 'PAGE',
  parentId: null,
  routePath: '/showcase/overview',
  iconKey: 'overview',
  sortNo: 10,
  menuGranted: true,
  actionCode: null,
  actionName: null,
  actionType: null,
  actionSortNo: null,
  actionGranted: false,
  ...overrides,
});

describe('authorized navigation public policy', () => {
  it('returns only directly granted pages and their ancestors in one ordered tree', () => {
    const result = buildAuthorizedNavigation('demo-portal', [
      row({ menuId: 'group-assets', menuCode: 'assets', menuName: '资产目录', nodeType: 'GROUP', routePath: null, menuGranted: false }),
      row({ menuId: 'page-assets', menuCode: 'asset-list', menuName: '资源目录', parentId: 'group-assets', routePath: '/showcase/system/resources' }),
      row({ menuId: 'page-hidden', menuCode: 'users', menuName: '用户管理', routePath: '/showcase/system/users', menuGranted: false }),
    ]);

    expect(result.items).toEqual([{ menuCode: 'assets', label: '资产目录', nodeType: 'GROUP', routePath: null, iconKey: 'overview', sortNo: 10, children: [{ menuCode: 'asset-list', label: '资源目录', nodeType: 'PAGE', routePath: '/showcase/system/resources', iconKey: 'overview', sortNo: 10, allowedActions: [], children: [] }] }]);
  });

  it('requires both page menu and action grants', () => {
    const result = buildAuthorizedNavigation('demo-portal', [
      row({ actionCode: 'view', actionName: '查看', actionType: 'VIEW', actionSortNo: 10, actionGranted: true }),
      row({ actionCode: 'export', actionName: '导出', actionType: 'EXPORT', actionSortNo: 20, actionGranted: false }),
      row({ menuId: 'menu-hidden', menuCode: 'hidden', menuName: '隐藏页', routePath: '/hidden', menuGranted: false, actionCode: 'manage', actionName: '维护', actionType: 'UPDATE', actionSortNo: 10, actionGranted: true }),
    ]);

    expect(result.items[0]?.allowedActions?.map((action) => action.actionCode)).toEqual(['view']);
    expect(result.items.some((node) => node.menuCode === 'hidden')).toBe(false);
    expect(result.permissionVersion).toMatch(/^[a-f0-9]{64}$/);
  });
});
