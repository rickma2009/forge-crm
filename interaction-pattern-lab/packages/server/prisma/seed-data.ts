import type { SeedDefinition } from '../src/rbac/seed-definition';

type Menu = SeedDefinition['menus'][number];

const page = (menuCode: string, menuName: string, routePath: string, iconKey: string, parentCode: string | null, sortNo: number): Omit<Menu, 'systemCode'> => ({
  menuCode, menuName, nodeType: 'PAGE', parentCode, routePath, iconKey, sortNo,
});
const group = (menuCode: string, menuName: string, iconKey: string, sortNo): Omit<Menu, 'systemCode'> => ({
  menuCode, menuName, nodeType: 'GROUP', parentCode: null, routePath: null, iconKey, sortNo,
});

const portalMenus: Array<Omit<Menu, 'systemCode'>> = [
  page('overview', '概览', '/showcase/overview', 'overview', null, 10),
  group('foundations', '基础规范', 'foundation', 20),
  page('foundation-colors', '颜色与主题', '/showcase/foundations/colors', 'palette', 'foundations', 10),
  page('foundation-typography', '字体与排版', '/showcase/foundations/typography', 'text', 'foundations', 20),
  page('foundation-spacing', '间距与布局', '/showcase/foundations/spacing', 'layout', 'foundations', 30),
  page('foundation-icons', '图标与状态色', '/showcase/foundations/icons', 'icons', 'foundations', 40),
  group('components', '基础组件', 'components', 30),
  page('component-actions', '按钮与操作', '/showcase/components/actions', 'action', 'components', 10),
  page('component-forms', '表单控件', '/showcase/components/forms', 'form', 'components', 20),
  page('component-data', '数据展示', '/showcase/components/data-display', 'table', 'components', 30),
  page('component-feedback', '反馈组件', '/showcase/components/feedback', 'feedback', 'components', 40),
  group('templates', '页面模板', 'pages', 40),
  page('template-list', '查询列表', '/showcase/templates/record-list', 'list', 'templates', 10),
  page('template-filter', '高级筛选列表', '/showcase/templates/advanced-filter', 'filter', 'templates', 20),
  page('template-form', '新增编辑表单', '/showcase/templates/edit-form', 'form', 'templates', 30),
  page('template-detail', '业务详情', '/showcase/templates/record-detail', 'detail', 'templates', 40),
  page('template-master-detail', '主从工作区', '/showcase/templates/master-detail', 'split', 'templates', 50),
  page('template-workbench', '工作台', '/showcase/templates/workbench', 'workbench', 'templates', 60),
  page('interaction-patterns', '交互模式', '/showcase/interactions', 'interaction', null, 50),
  page('page-states', '页面状态', '/showcase/states', 'state', null, 60),
  page('scenarios', '组合场景', '/showcase/scenarios', 'scenario', null, 70),
  group('business-demo', '业务数据演示', 'workbench', 80),
  page('customer-directory', '客户列表', '/showcase/customers', 'user', 'business-demo', 10),
  group('system', '系统管理', 'settings', 1000),
  page('system-users', '用户管理', '/showcase/system/users', 'user', 'system', 10),
  page('system-roles', '角色管理', '/showcase/system/roles', 'role', 'system', 20),
  page('system-policies', '权限策略', '/showcase/system/policies', 'lock', 'system', 30),
  page('system-menus', '菜单管理', '/showcase/system/menus', 'menu', 'system', 40),
  page('system-logs', '操作日志', '/showcase/system/logs', 'log', 'system', 50),
  page('system-resources', '资源目录', '/showcase/system/resources', 'resource', 'system', 60),
  page('system-dictionaries', '数据字典', '/showcase/system/dictionaries', 'data', 'system', 70),
  page('system-list-views', '列表视图', '/showcase/system/list-views', 'table', 'system', 80),
];

const secondaryMenus: Array<Omit<Menu, 'systemCode'>> = [
  page('overview', '概览', '/showcase/overview', 'overview', null, 10),
  group('system', '系统管理', 'settings', 1000),
  page('system-resources', '资源目录', '/showcase/system/resources', 'resource', 'system', 10),
];

const menus: SeedDefinition['menus'] = [
  ...portalMenus.map((menu) => ({ ...menu, systemCode: 'demo-portal' })),
  ...secondaryMenus.map((menu) => ({ ...menu, systemCode: 'secondary-demo' })),
];
const actions: SeedDefinition['actions'] = [
  ...menus.filter((menu) => menu.nodeType === 'PAGE').map((menu) => ({ systemCode: menu.systemCode, menuCode: menu.menuCode, actionCode: 'view', actionName: '查看', actionType: 'VIEW', sortNo: 10 })),
  { systemCode: 'demo-portal', menuCode: 'system-resources', actionCode: 'manage', actionName: '维护资源', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-resources', actionCode: 'export', actionName: '导出清单', actionType: 'EXPORT', sortNo: 30 },
  { systemCode: 'demo-portal', menuCode: 'system-dictionaries', actionCode: 'manage', actionName: '维护字典', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-list-views', actionCode: 'manage', actionName: '维护系统视图', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'customer-directory', actionCode: 'create', actionName: '新增客户', actionType: 'CREATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'customer-directory', actionCode: 'update', actionName: '编辑客户', actionType: 'UPDATE', sortNo: 30 },
];
const roles: SeedDefinition['roles'] = [
  { systemCode: 'demo-portal', roleCode: 'system-manager', roleName: '系统管理员', isSystem: true },
  { systemCode: 'demo-portal', roleCode: 'viewer', roleName: '受限演示角色', isSystem: false },
  { systemCode: 'secondary-demo', roleCode: 'system-manager', roleName: '系统管理员', isSystem: true },
];
const systemManagerGrants = roles.filter((role) => role.isSystem).flatMap((role) => [
  ...menus.filter((menu) => menu.systemCode === role.systemCode).map((menu) => ({ systemCode: role.systemCode, roleCode: role.roleCode, menuCode: menu.menuCode, actionCode: null })),
  ...actions.filter((action) => action.systemCode === role.systemCode).map((action) => ({ systemCode: role.systemCode, roleCode: role.roleCode, menuCode: action.menuCode, actionCode: action.actionCode })),
]);
const viewerMenuCodes = new Set([
  ...portalMenus.filter((menu) => !['system-users', 'system-roles', 'system-policies', 'system-menus', 'system-logs', 'system-dictionaries', 'system-list-views'].includes(menu.menuCode)).map((menu) => menu.menuCode),
]);
const viewerGrants = [
  ...menus.filter((menu) => menu.systemCode === 'demo-portal' && viewerMenuCodes.has(menu.menuCode)).map((menu) => ({ systemCode: 'demo-portal', roleCode: 'viewer', menuCode: menu.menuCode, actionCode: null })),
  ...actions.filter((action) => action.systemCode === 'demo-portal' && viewerMenuCodes.has(action.menuCode) && action.actionCode === 'view').map((action) => ({ systemCode: 'demo-portal', roleCode: 'viewer', menuCode: action.menuCode, actionCode: action.actionCode })),
];

export const seedDefinition: SeedDefinition = {
  systems: ['demo-portal', 'secondary-demo'],
  menus,
  actions,
  roles,
  grants: [...systemManagerGrants, ...viewerGrants],
};
