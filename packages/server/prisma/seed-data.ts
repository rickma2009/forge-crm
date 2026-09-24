import type { SeedDefinition } from '../src/rbac/seed-definition';

type Menu = SeedDefinition['menus'][number];

const page = (menuCode: string, menuName: string, routePath: string, iconKey: string, parentCode: string | null, sortNo: number): Omit<Menu, 'systemCode'> => ({
  menuCode, menuName, nodeType: 'PAGE', parentCode, routePath, iconKey, sortNo,
});
const group = (menuCode: string, menuName: string, iconKey: string, sortNo: number): Omit<Menu, 'systemCode'> => ({
  menuCode, menuName, nodeType: 'GROUP', parentCode: null, routePath: null, iconKey, sortNo,
});

const portalMenus: Array<Omit<Menu, 'systemCode'>> = [
  group('basic-info', '基本信息', 'info', 10),
  page('customer-directory', '客户管理', '/showcase/customers', 'user', 'basic-info', 10),
  page('item-directory', '物料产品管理', '/showcase/items', 'box', 'basic-info', 20),
  page('competitor-directory', '竞争对象', '/showcase/competitors', 'users', 'basic-info', 30),
  group('opportunity-management', '商机管理', 'briefcase', 20),
  page('opportunity-directory', '商机信息', '/showcase/opportunities', 'briefcase', 'opportunity-management', 10),
  page('quotation-directory', '报价管理', '/showcase/quotations', 'table', 'opportunity-management', 15),
  page('opportunity-stage-admin', '商机阶段', '/showcase/opportunity-stages', 'data', 'opportunity-management', 20),
  group('inventory-management', '库存管理', 'box', 30),
  page('inbound-order-directory', '入库单', '/showcase/inbound-orders', 'table', 'inventory-management', 10),
  page('inventory-balance-directory', '库存明细', '/showcase/inventory-balances', 'list', 'inventory-management', 20),
  group('style-scenes', '样式场景', 'palette', 900),
  page('style-scene-list', '场景清单', '/showcase/style-scenes', 'list', 'style-scenes', 10),
  group('system', '系统管理', 'settings', 1000),
  page('system-organization', '组织架构', '/showcase/system/organization', 'data', 'system', 5),
  page('system-employees', '员工管理', '/showcase/system/employees', 'user', 'system', 7),
  page('system-users', '用户管理', '/showcase/system/users', 'user', 'system', 10),
  page('system-roles', '角色管理', '/showcase/system/roles', 'role', 'system', 20),
  page('system-policies', '权限策略', '/showcase/system/policies', 'lock', 'system', 30),
  page('system-menus', '资源菜单', '/showcase/system/menus', 'menu', 'system', 40),
  page('system-logs', '操作日志', '/showcase/system/logs', 'log', 'system', 50),
  page('system-resources', '资源目录', '/showcase/system/resources', 'resource', 'system', 60),
  page('system-dictionaries', '数据字典', '/showcase/system/dictionaries', 'data', 'system', 70),
  page('system-list-views', '列表视图', '/showcase/system/list-views', 'table', 'system', 80),
  page('legal-entity-admin', '法人管理', '/showcase/system/legal-entities', 'resource', 'system', 90),
  page('system-parameters', '参数设置', '/showcase/system/parameters', 'settings', 'system', 110),
  page('warehouse-admin', '仓库管理', '/showcase/system/warehouses', 'box', 'system', 100),
];

const menus: SeedDefinition['menus'] = [
  ...portalMenus.map((menu) => ({ ...menu, systemCode: 'demo-portal' })),
];
const actions: SeedDefinition['actions'] = [
  { systemCode: 'demo-portal', menuCode: 'system-parameters', actionCode: 'manage', actionName: '设置参数', actionType: 'UPDATE', sortNo: 20 },
  ...['create', 'edit', 'submit', 'feedback', 'copy', 'export', 'writeback'].map((actionCode, index) => ({ systemCode: 'demo-portal', menuCode: 'quotation-directory', actionCode, actionName: ({ create: '新建报价', edit: '修改草稿', submit: '提交报价', feedback: '登记反馈', copy: '复制报价', export: '导出PDF', writeback: '回写金额' } as Record<string, string>)[actionCode], actionType: 'UPDATE' as const, sortNo: 20 + index })),
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'create', actionName: '新增物料', actionType: 'CREATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'update', actionName: '修改物料', actionType: 'UPDATE', sortNo: 30 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'delete', actionName: '删除物料', actionType: 'DELETE', sortNo: 40 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'price-view', actionName: '查看物料定价', actionType: 'VIEW', sortNo: 50 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'price-manage', actionName: '维护物料定价', actionType: 'UPDATE', sortNo: 60 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'attachment-view', actionName: '查看物料附件', actionType: 'VIEW', sortNo: 70 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'attachment-upload', actionName: '上传物料附件', actionType: 'CREATE', sortNo: 80 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'attachment-update', actionName: '修改物料附件', actionType: 'UPDATE', sortNo: 90 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'attachment-download', actionName: '下载物料附件', actionType: 'EXPORT', sortNo: 100 },
  { systemCode: 'demo-portal', menuCode: 'item-directory', actionCode: 'attachment-delete', actionName: '删除物料附件', actionType: 'DELETE', sortNo: 110 },
  ...menus.filter((menu) => menu.nodeType === 'PAGE').map((menu) => ({ systemCode: menu.systemCode, menuCode: menu.menuCode, actionCode: 'view', actionName: '查看', actionType: 'VIEW', sortNo: 10 })),
  { systemCode: 'demo-portal', menuCode: 'system-resources', actionCode: 'manage', actionName: '维护资源', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-resources', actionCode: 'export', actionName: '导出清单', actionType: 'EXPORT', sortNo: 30 },
  { systemCode: 'demo-portal', menuCode: 'system-menus', actionCode: 'manage', actionName: '维护资源菜单', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-menus', actionCode: 'export', actionName: '导出菜单 SQL', actionType: 'EXPORT', sortNo: 30 },
  { systemCode: 'demo-portal', menuCode: 'system-dictionaries', actionCode: 'manage', actionName: '维护字典', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-list-views', actionCode: 'manage', actionName: '维护系统视图', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'style-scene-list', actionCode: 'manage', actionName: '维护场景', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'customer-directory', actionCode: 'create', actionName: '新增客户', actionType: 'CREATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'customer-directory', actionCode: 'update', actionName: '编辑客户', actionType: 'UPDATE', sortNo: 30 },
  { systemCode: 'demo-portal', menuCode: 'inbound-order-directory', actionCode: 'create', actionName: '新建入库单', actionType: 'CREATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'inbound-order-directory', actionCode: 'update', actionName: '修改入库单', actionType: 'UPDATE', sortNo: 30 },
  { systemCode: 'demo-portal', menuCode: 'inbound-order-directory', actionCode: 'void', actionName: '作废入库单', actionType: 'DELETE', sortNo: 40 },
  { systemCode: 'demo-portal', menuCode: 'inbound-order-directory', actionCode: 'post', actionName: '审核过账', actionType: 'APPROVE', sortNo: 50 },
  { systemCode: 'demo-portal', menuCode: 'inbound-order-directory', actionCode: 'reverse', actionName: '冲销入库单', actionType: 'UPDATE', sortNo: 60 },
  { systemCode: 'demo-portal', menuCode: 'inventory-balance-directory', actionCode: 'export', actionName: '导出库存明细', actionType: 'EXPORT', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'legal-entity-admin', actionCode: 'manage', actionName: '维护法人', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'warehouse-admin', actionCode: 'manage', actionName: '维护仓库', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'competitor-directory', actionCode: 'manage', actionName: '维护竞争对象', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'opportunity-directory', actionCode: 'create', actionName: '新增商机', actionType: 'CREATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'opportunity-directory', actionCode: 'update', actionName: '编辑商机', actionType: 'UPDATE', sortNo: 30 },
  { systemCode: 'demo-portal', menuCode: 'opportunity-directory', actionCode: 'follow-up', actionName: '维护跟进', actionType: 'UPDATE', sortNo: 40 },
  { systemCode: 'demo-portal', menuCode: 'opportunity-directory', actionCode: 'analyze', actionName: '新增分析', actionType: 'CREATE', sortNo: 50 },
  { systemCode: 'demo-portal', menuCode: 'opportunity-stage-admin', actionCode: 'manage', actionName: '维护商机阶段', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-users', actionCode: 'manage', actionName: '管理用户', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-organization', actionCode: 'manage', actionName: '维护组织架构', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-employees', actionCode: 'manage', actionName: '维护员工', actionType: 'UPDATE', sortNo: 20 },
  { systemCode: 'demo-portal', menuCode: 'system-roles', actionCode: 'manage', actionName: '管理角色', actionType: 'UPDATE', sortNo: 20 },
];
const roles: SeedDefinition['roles'] = [
  { systemCode: 'demo-portal', roleCode: 'system-manager', roleName: '系统管理员', isSystem: true },
  { systemCode: 'demo-portal', roleCode: 'viewer', roleName: '受限演示角色', isSystem: false },
];
const systemManagerGrants = roles.filter((role) => role.isSystem).flatMap((role) => [
  ...menus.filter((menu) => menu.systemCode === role.systemCode).map((menu) => ({ systemCode: role.systemCode, roleCode: role.roleCode, menuCode: menu.menuCode, actionCode: null })),
  ...actions.filter((action) => action.systemCode === role.systemCode).map((action) => ({ systemCode: role.systemCode, roleCode: role.roleCode, menuCode: action.menuCode, actionCode: action.actionCode })),
]);
const viewerMenuCodes = new Set([
  ...portalMenus.filter((menu) => !['system-parameters', 'system-organization', 'system-employees', 'system-menus', 'system-logs', 'system-dictionaries', 'system-list-views', 'style-scene-list'].includes(menu.menuCode)).map((menu) => menu.menuCode),
]);
const viewerGrants = [
  ...menus.filter((menu) => menu.systemCode === 'demo-portal' && viewerMenuCodes.has(menu.menuCode)).map((menu) => ({ systemCode: 'demo-portal', roleCode: 'viewer', menuCode: menu.menuCode, actionCode: null })),
  ...actions.filter((action) => action.systemCode === 'demo-portal' && viewerMenuCodes.has(action.menuCode) && action.actionCode === 'view').map((action) => ({ systemCode: 'demo-portal', roleCode: 'viewer', menuCode: action.menuCode, actionCode: action.actionCode })),
];

export const seedDefinition: SeedDefinition = {
  systems: ['demo-portal'],
  menus,
  actions,
  roles,
  grants: [...systemManagerGrants, ...viewerGrants],
};
