import { warehouseDictionarySeeds } from '../src/dictionary/warehouse-dictionaries.seed';
import { initializeParameters } from '../src/system-parameter/parameter-defaults';
import { initializeBusinessListViews } from '../src/list-view/business-list-defaults';
import { hash } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client';
import { databaseRowsToSeedDefinition } from '../src/rbac/database-definition';
import { validateSeedDefinition } from '../src/rbac/seed-definition';
import { seedDefinition } from './seed-data';
import { contactProjectRoleSeed } from '../src/dictionary/contact-project-role.seed';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

async function main(): Promise<void> {
  const rawSystems = required('SYSTEM_CODES').split(',').map((value) => value.trim());
  if (rawSystems.some((value) => !value)) throw new Error('SYSTEM_CODES_EMPTY_ITEM');
  const parsedSystems = rawSystems.map((value) => systemCodeSchema.parse(value));
  if (new Set(parsedSystems).size !== parsedSystems.length) throw new Error('SYSTEM_CODES_DUPLICATE');
  const configuredSystems = new Set(parsedSystems);
  for (const systemCode of seedDefinition.systems) {
    if (!configuredSystems.has(systemCode)) throw new Error(`SYSTEM_CODE_NOT_ALLOWED:${systemCode}`);
  }
  const definitionErrors = validateSeedDefinition(seedDefinition);
  if (definitionErrors.length) throw new Error(`SEED_DEFINITION_INVALID\n${definitionErrors.join('\n')}`);

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: required('DATABASE_URL') }) });
  const adminPasswordHash = await hash(required('INITIAL_ADMIN_PASSWORD'));
  const viewerPasswordHash = await hash(required('INITIAL_VIEWER_PASSWORD'));

  try {
    await client.$transaction(async (database) => {
      const tenant = await database.sysTenant.upsert({
        where: { tenantCode: 'default' },
        update: { tenantName: '默认租户', status: 'ACTIVE' },
        create: { tenantCode: 'default', tenantName: '默认租户' },
      });
      const applications = new Map<string, string>();
      const roleGroups = new Map<string, string>();
      for (const systemCode of seedDefinition.systems) {
        const application = await database.sysApplication.upsert({
          where: { tenantId_applicationCode: { tenantId: tenant.id, applicationCode: systemCode } },
          update: { applicationName: systemCode === 'demo-portal' ? '演示门户' : systemCode, status: 'ACTIVE' },
          create: { tenantId: tenant.id, applicationCode: systemCode, applicationName: systemCode === 'demo-portal' ? '演示门户' : systemCode },
        });
        applications.set(systemCode, application.id);
        const group = await database.sysRoleGroup.upsert({
          where: { applicationId_groupCode: { applicationId: application.id, groupCode: 'default' } },
          update: { groupName: '默认角色组', status: 'ACTIVE' },
          create: { applicationId: application.id, groupCode: 'default', groupName: '默认角色组' },
        });
        roleGroups.set(systemCode, group.id);
      }
      const permissions = new Map<string, string>();
      const upsertPermission = async (systemCode: string, permissionCode: string, permissionName: string, resourceCode: string, actionCode: string): Promise<string> => {
        const applicationId = applications.get(systemCode);
        if (!applicationId) throw new Error(`SEED_APPLICATION_MISSING:${systemCode}`);
        const permission = await database.sysPermission.upsert({
          where: { applicationId_permissionCode: { applicationId, permissionCode } },
          update: { permissionName, resourceCode, actionCode, source: 'SYSTEM', status: 'ACTIVE' },
          create: { applicationId, permissionCode, permissionName, resourceCode, actionCode, source: 'SYSTEM' },
        });
        permissions.set(`${systemCode}:${permissionCode}`, permission.id);
        return permission.id;
      };
      const users = new Map<string, string>();
      for (const candidate of [
        { account: 'admin', displayName: '系统管理员', passwordHash: adminPasswordHash },
        { account: 'viewer', displayName: '受限演示用户', passwordHash: viewerPasswordHash },
      ]) {
        const user = await database.iamUser.upsert({
          where: {
            tenantId_normalizedAccount: {
              tenantId: tenant.id,
              normalizedAccount: candidate.account,
            },
          },
          update: { tenantId: tenant.id, account: candidate.account, displayName: candidate.displayName, passwordHash: candidate.passwordHash, status: 'ACTIVE', version: { increment: 1 } },
          create: { tenantId: tenant.id, account: candidate.account, normalizedAccount: candidate.account, displayName: candidate.displayName, passwordHash: candidate.passwordHash },
        });
        users.set(candidate.account, user.id);
      }

      const seedActorId = users.get('admin');
      if (!seedActorId) throw new Error('SEED_ADMIN_USER_MISSING');
      const pageResources = new Map<string, string>();
      for (const systemCode of seedDefinition.systems) {
        const applicationId = applications.get(systemCode);
        if (!applicationId) throw new Error(`SEED_APPLICATION_MISSING:${systemCode}`);
        const root = await database.sysPageResource.upsert({
          where: { applicationId_pageCode: { applicationId, pageCode: systemCode } },
          update: { pageName: systemCode === 'demo-portal' ? '演示门户' : systemCode, pageType: 'SYSTEM', parentId: null, routePath: null, autoAddMenu: false, status: 'ACTIVE', updatedBy: seedActorId, version: { increment: 1 } },
          create: { tenantId: tenant.id, applicationId, pageCode: systemCode, pageName: systemCode === 'demo-portal' ? '演示门户' : systemCode, pageType: 'SYSTEM', iconKey: 'portal', autoAddMenu: false, createdBy: seedActorId, updatedBy: seedActorId },
        });
        pageResources.set(`${systemCode}:$root`, root.id);
      }
      for (const candidate of seedDefinition.menus) {
        const applicationId = applications.get(candidate.systemCode);
        const parentId = candidate.parentCode ? pageResources.get(`${candidate.systemCode}:${candidate.parentCode}`) : pageResources.get(`${candidate.systemCode}:$root`);
        if (!applicationId || !parentId) throw new Error(`SEED_PAGE_RESOURCE_SCOPE_MISSING:${candidate.systemCode}:${candidate.menuCode}`);
        const resource = await database.sysPageResource.upsert({
          where: { applicationId_pageCode: { applicationId, pageCode: candidate.menuCode } },
          update: { parentId, pageName: candidate.menuName ?? candidate.menuCode, pageType: candidate.nodeType === 'GROUP' ? 'MODULE' : 'PAGE', routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'overview', sortNo: candidate.sortNo ?? 0, status: 'ACTIVE', updatedBy: seedActorId, version: { increment: 1 } },
          create: { tenantId: tenant.id, applicationId, parentId, pageCode: candidate.menuCode, pageName: candidate.menuName ?? candidate.menuCode, pageType: candidate.nodeType === 'GROUP' ? 'MODULE' : 'PAGE', routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'overview', sortNo: candidate.sortNo ?? 0, createdBy: seedActorId, updatedBy: seedActorId },
        });
        pageResources.set(`${candidate.systemCode}:${candidate.menuCode}`, resource.id);
      }

      const roles = new Map<string, string>();
      for (const candidate of seedDefinition.roles) {
        const applicationId = applications.get(candidate.systemCode);
        const roleGroupId = roleGroups.get(candidate.systemCode);
        if (!applicationId || !roleGroupId) throw new Error(`SEED_ROLE_SCOPE_MISSING:${candidate.systemCode}`);
        const role = await database.iamRole.upsert({
          where: { systemCode_roleCode: { systemCode: candidate.systemCode, roleCode: candidate.roleCode } },
          update: { tenantId: tenant.id, applicationId, roleGroupId, roleName: candidate.roleName ?? candidate.roleCode, roleType: candidate.isSystem ? 'SYSTEM' : 'BUSINESS', isSystem: candidate.isSystem, status: 'ACTIVE', version: { increment: 1 } },
          create: { tenantId: tenant.id, applicationId, roleGroupId, systemCode: candidate.systemCode, roleCode: candidate.roleCode, roleName: candidate.roleName ?? candidate.roleCode, roleType: candidate.isSystem ? 'SYSTEM' : 'BUSINESS', isSystem: candidate.isSystem },
        });
        roles.set(`${candidate.systemCode}:${candidate.roleCode}`, role.id);
      }

      const menus = new Map<string, string>();
      for (const candidate of seedDefinition.menus) {
        const applicationId = applications.get(candidate.systemCode);
        if (!applicationId) throw new Error(`SEED_MENU_SCOPE_MISSING:${candidate.systemCode}`);
        const accessPermissionId = await upsertPermission(candidate.systemCode, `navigation.${candidate.menuCode}.access`, `访问${candidate.menuName ?? candidate.menuCode}`, candidate.menuCode, 'access');
        const parentId = candidate.parentCode ? menus.get(`${candidate.systemCode}:${candidate.parentCode}`) : null;
        const pageResourceId = pageResources.get(`${candidate.systemCode}:${candidate.menuCode}`);
        if ((candidate.parentCode && !parentId) || !pageResourceId) throw new Error(`SEED_PARENT_NOT_READY:${candidate.systemCode}:${candidate.menuCode}`);
        const menu = await database.uiMenu.upsert({
          where: { systemCode_menuCode: { systemCode: candidate.systemCode, menuCode: candidate.menuCode } },
          update: { applicationId, accessPermissionId, pageResourceId, menuName: candidate.menuName ?? candidate.menuCode, nodeType: candidate.nodeType, parentId, routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'overview', sortNo: candidate.sortNo ?? 0, menuType: candidate.nodeType === 'GROUP' ? 'DIRECTORY' : 'PAGE', status: 'ACTIVE', version: { increment: 1 } },
          create: { applicationId, accessPermissionId, pageResourceId, systemCode: candidate.systemCode, menuCode: candidate.menuCode, menuName: candidate.menuName ?? candidate.menuCode, nodeType: candidate.nodeType, parentId, routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'overview', sortNo: candidate.sortNo ?? 0, menuType: candidate.nodeType === 'GROUP' ? 'DIRECTORY' : 'PAGE' },
        });
        menus.set(`${candidate.systemCode}:${candidate.menuCode}`, menu.id);
      }

      const activeMenuKeys = new Set(seedDefinition.menus.map((m) => `${m.systemCode}:${m.menuCode}`));
      const staleMenus = await database.uiMenu.findMany({ where: { systemCode: 'demo-portal', status: 'ACTIVE' } });
      for (const stale of staleMenus) {
        if (!activeMenuKeys.has(`demo-portal:${stale.menuCode}`)) {
          await database.uiMenu.update({ where: { id: stale.id }, data: { status: 'DISABLED' } });
        }
      }
      const demoApplicationForCleanup = applications.get('demo-portal');
      if (demoApplicationForCleanup) {
        await database.sysPermission.updateMany({
          where: { applicationId: demoApplicationForCleanup, resourceCode: { notIn: seedDefinition.menus.filter((menu) => menu.systemCode === 'demo-portal').map((menu) => menu.menuCode) }, OR: [{ permissionCode: { startsWith: 'navigation.' } }, { permissionCode: { startsWith: 'menu.' } }] },
          data: { status: 'DISABLED' },
        });
      }
      await database.iamRolePermission.deleteMany({ where: { role: { systemCode: 'secondary-demo' } } });
      await database.iamRoleUser.deleteMany({ where: { role: { systemCode: 'secondary-demo' } } });
      await database.iamRole.deleteMany({ where: { systemCode: 'secondary-demo' } });
      await database.uiMenuAction.deleteMany({ where: { menu: { systemCode: 'secondary-demo' } } });
      await database.uiMenu.deleteMany({ where: { systemCode: 'secondary-demo' } });

      const actions = new Map<string, string>();
      for (const candidate of seedDefinition.actions) {
        const menuId = menus.get(`${candidate.systemCode}:${candidate.menuCode}`);
        if (!menuId) throw new Error(`SEED_ACTION_MENU_MISSING:${candidate.systemCode}:${candidate.menuCode}`);
        const permissionId = await upsertPermission(candidate.systemCode, `menu.${candidate.menuCode}.${candidate.actionCode}`, candidate.actionName ?? candidate.actionCode, candidate.menuCode, candidate.actionCode);
        const action = await database.uiMenuAction.upsert({
          where: { menuId_actionCode: { menuId, actionCode: candidate.actionCode } },
          update: { permissionId, actionName: candidate.actionName ?? candidate.actionCode, actionType: candidate.actionType ?? 'CUSTOM', sortNo: candidate.sortNo ?? 0, status: 'ACTIVE', version: { increment: 1 } },
          create: { menuId, permissionId, actionCode: candidate.actionCode, actionName: candidate.actionName ?? candidate.actionCode, actionType: candidate.actionType ?? 'CUSTOM', sortNo: candidate.sortNo ?? 0 },
        });
        actions.set(`${candidate.systemCode}:${candidate.menuCode}:${candidate.actionCode}`, action.id);
        const pageId = pageResources.get(`${candidate.systemCode}:${candidate.menuCode}`);
        if (!pageId) throw new Error(`SEED_PAGE_RESOURCE_MISSING:${candidate.systemCode}:${candidate.menuCode}`);
        await database.sysPageButton.upsert({
          where: { pageId_buttonCode: { pageId, buttonCode: candidate.actionCode } },
          update: { buttonName: candidate.actionName ?? candidate.actionCode, buttonType: candidate.actionType === 'LINE' ? 'LINE' : 'TOOL', sortNo: candidate.sortNo ?? 0, status: 'ACTIVE', updatedBy: seedActorId, version: { increment: 1 } },
          create: { pageId, buttonCode: candidate.actionCode, buttonName: candidate.actionName ?? candidate.actionCode, buttonType: candidate.actionType === 'LINE' ? 'LINE' : 'TOOL', sortNo: candidate.sortNo ?? 0, createdBy: seedActorId, updatedBy: seedActorId },
        });
      }

      const accessPermissionSeeds = [
        ['access.user.view', '查看用户', 'user', 'view'], ['access.user.status.manage', '管理用户状态', 'user', 'status-manage'],
        ['access.role.view', '查看角色', 'role', 'view'], ['access.role.create', '创建角色', 'role', 'create'],
        ['access.role.update', '修改角色', 'role', 'update'], ['access.role.status.manage', '管理角色状态', 'role', 'status-manage'],
        ['access.role.member.manage', '管理角色成员', 'role-member', 'manage'], ['access.role.permission.assign', '分配角色权限', 'role-permission', 'assign'],
        ['access.permission.view', '查看权限目录', 'permission', 'view'],
        ['access.resource-menu.view', '查看资源菜单', 'resource-menu', 'view'],
        ['access.resource-menu.manage', '维护资源菜单', 'resource-menu', 'manage'],
        ['access.resource-menu.export', '导出资源菜单', 'resource-menu', 'export'],
        ['organization.unit.view', '查看组织架构', 'organization-unit', 'view'], ['organization.unit.manage', '维护组织架构', 'organization-unit', 'manage'],
        ['organization.employee.view', '查看员工', 'organization-employee', 'view'], ['organization.employee.manage', '维护员工', 'organization-employee', 'manage'],
      ] as const;
      for (const [code, name, resource, action] of accessPermissionSeeds) await upsertPermission('demo-portal', code, name, resource, action);

      const memberships = [
        { account: 'admin', systemCode: 'demo-portal', roleCode: 'system-manager' },
        { account: 'viewer', systemCode: 'demo-portal', roleCode: 'viewer' },
      ];
      for (const membership of memberships) {
        const userId = users.get(membership.account);
        const roleId = roles.get(`${membership.systemCode}:${membership.roleCode}`);
        if (!userId || !roleId) throw new Error('SEED_MEMBERSHIP_REFERENCE_MISSING');
        const existingMembership = await database.iamRoleUser.findFirst({ where: { roleId, userId, expiresAt: null } });
        if (existingMembership) {
          await database.iamRoleUser.update({ where: { id: existingMembership.id }, data: { status: 'ACTIVE' } });
        } else {
          await database.iamRoleUser.create({ data: { roleId, userId } });
        }
      }

      for (const grant of seedDefinition.grants) {
        const roleId = roles.get(`${grant.systemCode}:${grant.roleCode}`);
        const menuId = menus.get(`${grant.systemCode}:${grant.menuCode}`);
        const menuActionId = grant.actionCode ? actions.get(`${grant.systemCode}:${grant.menuCode}:${grant.actionCode}`) : null;
        if (!roleId || !menuId || (grant.actionCode && !menuActionId)) throw new Error('SEED_GRANT_REFERENCE_MISSING');
        const permissionCode = grant.actionCode ? `menu.${grant.menuCode}.${grant.actionCode}` : `navigation.${grant.menuCode}.access`;
        const permissionId = permissions.get(`${grant.systemCode}:${permissionCode}`);
        const applicationId = applications.get(grant.systemCode);
        if (!permissionId || !applicationId) throw new Error(`SEED_PERMISSION_REFERENCE_MISSING:${permissionCode}`);
        const existing = await database.iamRolePermission.findUnique({ where: { roleId_permissionId: { roleId, permissionId } } });
        if (existing) await database.iamRolePermission.update({ where: { id: existing.id }, data: { status: 'ACTIVE', revokedAt: null, revokedBy: null, version: { increment: 1 } } });
        else await database.iamRolePermission.create({ data: { applicationId, roleId, permissionId } });
      }
      const systemManagerRoleId = roles.get('demo-portal:system-manager');
      const demoApplicationId = applications.get('demo-portal');
      if (!systemManagerRoleId || !demoApplicationId) throw new Error('SEED_SYSTEM_MANAGER_SCOPE_MISSING');
      for (const [code] of accessPermissionSeeds) {
        const permissionId = permissions.get(`demo-portal:${code}`);
        if (!permissionId) throw new Error(`SEED_PERMISSION_REFERENCE_MISSING:${code}`);
        await database.iamRolePermission.upsert({
          where: { roleId_permissionId: { roleId: systemManagerRoleId, permissionId } },
          update: { status: 'ACTIVE', revokedAt: null, revokedBy: null },
          create: { applicationId: demoApplicationId, roleId: systemManagerRoleId, permissionId },
        });
      }
      const viewerRoleId = roles.get('demo-portal:viewer');
      if (!viewerRoleId) throw new Error('SEED_VIEWER_ROLE_MISSING');
      for (const code of ['access.user.view', 'access.role.view', 'access.permission.view']) {
        const permissionId = permissions.get(`demo-portal:${code}`);
        if (!permissionId) throw new Error(`SEED_PERMISSION_REFERENCE_MISSING:${code}`);
        await database.iamRolePermission.upsert({
          where: { roleId_permissionId: { roleId: viewerRoleId, permissionId } },
          update: { status: 'ACTIVE', revokedAt: null, revokedBy: null },
          create: { applicationId: demoApplicationId, roleId: viewerRoleId, permissionId },
        });
      }

      const adminUserId = users.get('admin');
      if (!adminUserId) throw new Error('SEED_ADMIN_USER_MISSING');
      const organizationSeeds = [
        { unitCode: 'component-bg', unitName: '部件BG', unitType: 'COMPANY' as const, parentCode: null, sortNo: 10 },
        { unitCode: 'tv-division', unitName: 'TV事业部', unitType: 'DIVISION' as const, parentCode: 'component-bg', sortNo: 10 },
        { unitCode: 'power-division', unitName: '电源事业部', unitType: 'DIVISION' as const, parentCode: 'component-bg', sortNo: 20 },
        { unitCode: 'finance-dept', unitName: '财务部', unitType: 'DEPARTMENT' as const, parentCode: 'component-bg', sortNo: 30 },
        { unitCode: 'supply-chain-dept', unitName: '供应链部', unitType: 'DEPARTMENT' as const, parentCode: 'component-bg', sortNo: 40 },
        { unitCode: 'tv-sales-one', unitName: '销售一部', unitType: 'DEPARTMENT' as const, parentCode: 'tv-division', sortNo: 10 },
        { unitCode: 'tv-sales-two', unitName: '销售二部', unitType: 'DEPARTMENT' as const, parentCode: 'tv-division', sortNo: 20 },
        { unitCode: 'tv-sales-admin', unitName: '销售管理部', unitType: 'DEPARTMENT' as const, parentCode: 'tv-division', sortNo: 30 },
        { unitCode: 'tv-rd-center', unitName: 'TV研发中心', unitType: 'DEPARTMENT' as const, parentCode: 'tv-division', sortNo: 40 },
      ];
      const organizationIds = new Map<string, string>();
      for (const seed of organizationSeeds) {
        const parentId = seed.parentCode ? organizationIds.get(seed.parentCode) : null;
        if (seed.parentCode && !parentId) throw new Error(`SEED_ORGANIZATION_PARENT_MISSING:${seed.parentCode}`);
        const unit = await database.orgUnit.upsert({
          where: { tenantId_unitCode: { tenantId: tenant.id, unitCode: seed.unitCode } },
          update: { parentId, unitName: seed.unitName, unitType: seed.unitType, sortNo: seed.sortNo, status: 'ACTIVE', updatedBy: adminUserId, version: { increment: 1 } },
          create: { tenantId: tenant.id, parentId, unitCode: seed.unitCode, unitName: seed.unitName, unitType: seed.unitType, sortNo: seed.sortNo, createdBy: adminUserId, updatedBy: adminUserId },
        });
        organizationIds.set(seed.unitCode, unit.id);
      }

      const positionSeeds = [
        ['bg-manager', 'BG负责人'], ['division-manager', '事业部总经理'], ['department-manager', '部门经理'],
        ['sales-manager', '销售经理'], ['sales-representative', '销售代表'], ['sales-operations', '销售运营'],
        ['rd-manager', '研发经理'], ['rd-engineer', '研发工程师'], ['finance-manager', '财务经理'],
        ['accountant', '会计'], ['supply-manager', '供应链经理'], ['procurement-specialist', '采购专员'],
      ] as const;
      const positionIds = new Map<string, string>();
      for (const [positionCode, positionName] of positionSeeds) {
        const position = await database.orgPosition.upsert({
          where: { tenantId_positionCode: { tenantId: tenant.id, positionCode } },
          update: { positionName, status: 'ACTIVE', updatedBy: adminUserId, version: { increment: 1 } },
          create: { tenantId: tenant.id, positionCode, positionName, createdBy: adminUserId, updatedBy: adminUserId },
        });
        positionIds.set(positionCode, position.id);
      }

      const employeeSeeds = [
        ['E0001', 'admin', '系统管理员', 'component-bg', 'bg-manager'],
        ['E1001', 'tv.manager', '马文博', 'tv-division', 'division-manager'],
        ['E1101', 'sales1.manager', '陈晓峰', 'tv-sales-one', 'sales-manager'],
        ['E1102', 'sales1.rep', '李佳怡', 'tv-sales-one', 'sales-representative'],
        ['E1201', 'sales2.manager', '赵海宁', 'tv-sales-two', 'sales-manager'],
        ['E1202', 'sales2.rep', '周若琳', 'tv-sales-two', 'sales-representative'],
        ['E1301', 'sales.ops', '吴思远', 'tv-sales-admin', 'sales-operations'],
        ['E1401', 'rd.manager', '何志强', 'tv-rd-center', 'rd-manager'],
        ['E1402', 'rd.engineer', '孙嘉明', 'tv-rd-center', 'rd-engineer'],
        ['E2001', 'power.manager', '郑凯', 'power-division', 'division-manager'],
        ['E3001', 'finance.manager', '林静', 'finance-dept', 'finance-manager'],
        ['E3002', 'finance.accountant', '许安琪', 'finance-dept', 'accountant'],
        ['E4001', 'supply.manager', '黄俊杰', 'supply-chain-dept', 'supply-manager'],
        ['E4002', 'supply.buyer', '梁欣', 'supply-chain-dept', 'procurement-specialist'],
      ] as const;
      for (const [employeeNo, account, employeeName, unitCode, positionCode] of employeeSeeds) {
        const orgUnitId = organizationIds.get(unitCode); const positionId = positionIds.get(positionCode);
        if (!orgUnitId || !positionId) throw new Error(`SEED_EMPLOYEE_SCOPE_MISSING:${employeeNo}`);
        const existingEmployment = await database.orgEmployment.findUnique({ where: { tenantId_employeeNo: { tenantId: tenant.id, employeeNo } } });
        const employee = existingEmployment
          ? await database.orgEmployee.update({ where: { id: existingEmployment.employeeId }, data: { employeeName, status: 'ACTIVE', updatedBy: adminUserId, version: { increment: 1 } } })
          : await database.orgEmployee.create({ data: { tenantId: tenant.id, employeeName, status: 'ACTIVE', createdBy: adminUserId, updatedBy: adminUserId } });
        if (existingEmployment) await database.orgEmployment.update({ where: { id: existingEmployment.id }, data: { status: 'ACTIVE', expiresAt: null, updatedBy: adminUserId, version: { increment: 1 } } });
        else await database.orgEmployment.create({ data: { tenantId: tenant.id, employeeId: employee.id, employeeNo, createdBy: adminUserId, updatedBy: adminUserId } });
        const user = await database.iamUser.upsert({
          where: { tenantId_normalizedAccount: { tenantId: tenant.id, normalizedAccount: account } },
          update: { employeeId: employee.id, account, displayName: employeeName, passwordHash: account === 'admin' ? adminPasswordHash : viewerPasswordHash, status: 'ACTIVE', version: { increment: 1 } },
          create: { tenantId: tenant.id, employeeId: employee.id, account, normalizedAccount: account, displayName: employeeName, passwordHash: viewerPasswordHash },
        });
        users.set(account, user.id);
        const currentAssignment = await database.orgEmployeeAssignment.findFirst({ where: { employeeId: employee.id, isPrimary: true, status: 'ACTIVE', expiresAt: null } });
        if (currentAssignment && (currentAssignment.orgUnitId !== orgUnitId || currentAssignment.positionId !== positionId)) await database.orgEmployeeAssignment.update({ where: { id: currentAssignment.id }, data: { status: 'DISABLED', expiresAt: new Date(), updatedBy: adminUserId, version: { increment: 1 } } });
        if (!currentAssignment || currentAssignment.orgUnitId !== orgUnitId || currentAssignment.positionId !== positionId) await database.orgEmployeeAssignment.create({ data: { tenantId: tenant.id, employeeId: employee.id, orgUnitId, positionId, positionNameSnapshot: positionSeeds.find(([code]) => code === positionCode)?.[1] ?? positionCode, createdBy: adminUserId, updatedBy: adminUserId } });
        await database.orgUserAssignment.updateMany({ where: { userId: user.id, tenantId: tenant.id, status: 'ACTIVE', orgUnitId: { not: orgUnitId } }, data: { status: 'DISABLED', expiresAt: new Date(), updatedBy: adminUserId, version: { increment: 1 } } });
        const userAssignment = await database.orgUserAssignment.findFirst({ where: { userId: user.id, orgUnitId, status: 'ACTIVE', expiresAt: null } });
        if (!userAssignment) await database.orgUserAssignment.create({ data: { tenantId: tenant.id, orgUnitId, userId: user.id, createdBy: adminUserId, updatedBy: adminUserId } });
        if (account !== 'admin') {
          const viewerRole = roles.get('demo-portal:viewer'); if (!viewerRole) throw new Error('SEED_VIEWER_ROLE_MISSING');
          const membership = await database.iamRoleUser.findFirst({ where: { roleId: viewerRole, userId: user.id, expiresAt: null } });
          if (membership) await database.iamRoleUser.update({ where: { id: membership.id }, data: { status: 'ACTIVE' } }); else await database.iamRoleUser.create({ data: { roleId: viewerRole, userId: user.id, grantedBy: adminUserId } });
        }
      }

      type DictionarySeed = { code: string; name: string; parentCode?: string; groupCode: string; description: string; sortNo: number; itemsEditable: boolean; items: ReadonlyArray<readonly [string, string, string, string?]> };
      const dictionarySeeds: DictionarySeed[] = [
        { code: 'product_line', name: '产品线', groupCode: 'product', description: '可报价产品线；存量值须人工映射', sortNo: 90, itemsEditable: true, items: [] },
        contactProjectRoleSeed,
        { code: 'customer_category', name: '客户类别', groupCode: 'customer', description: '客户主数据的业务类别', sortNo: 10, itemsEditable: true, items: [['potential', '潜在客户', 'blue'], ['formal', '正式客户', 'green'], ['partner', '合作伙伴', 'purple']] },
        { code: 'customer_status', name: '客户状态', groupCode: 'customer', description: '客户记录的当前使用状态', sortNo: 20, itemsEditable: true, items: [['active', '启用', 'green'], ['paused', '暂停', 'orange'], ['archived', '归档', 'gray']] },
        { code: 'customer_industry', name: '所属行业', groupCode: 'customer', description: '客户所属行业分类', sortNo: 30, itemsEditable: true, items: [['manufacturing', '制造', 'blue'], ['retail', '零售', 'orange'], ['technology', '科技', 'purple'], ['service', '服务', 'green'], ['other', '其他', 'gray']] },
        { code: 'customer_level', name: '客户等级', groupCode: 'customer', description: '客户分层等级', sortNo: 40, itemsEditable: true, items: [['a', 'A', 'red'], ['b', 'B', 'orange'], ['c', 'C', 'blue'], ['d', 'D', 'gray']] },
        { code: 'material_category', name: '物料类别', groupCode: 'material', description: '物料分类总类，可独立维护字典值并包含下级分类', sortNo: 100, itemsEditable: true, items: [] },
        { code: 'material_major_category', name: '物料大类', parentCode: 'material_category', groupCode: 'material', description: '物料一级分类', sortNo: 110, itemsEditable: true, items: [['raw_material', '原材料', 'blue'], ['finished_goods', '成品', 'green']] },
        { code: 'material_middle_category', name: '物料中类', parentCode: 'material_major_category', groupCode: 'material', description: '物料二级分类', sortNo: 120, itemsEditable: true, items: [['electronic', '电子类', 'purple', 'raw_material'], ['structural', '结构类', 'orange', 'finished_goods']] },
        { code: 'material_minor_category', name: '物料小类', parentCode: 'material_middle_category', groupCode: 'material', description: '物料三级分类', sortNo: 130, itemsEditable: true, items: [['resistor', '电阻', 'red', 'electronic'], ['connector', '连接器', 'gray', 'structural']] },
        { code: 'yes_no', name: '是否', groupCode: 'common', description: '系统初始化固定的是/否标准值', sortNo: 200, itemsEditable: false, items: [['1', '是', 'green'], ['0', '否', 'gray']] },
        ...warehouseDictionarySeeds,
        { code: 'inbound_reason', name: '入库原因', groupCode: 'inventory', description: '入库单业务原因', sortNo: 230, itemsEditable: true, items: [['PRODUCTION_COMPLETE', '生产完工', 'green'], ['FINISHED_GOODS', '成品收货', 'blue'], ['STOCK_GAIN', '盘盈', 'orange']] },
      ];
      const dictionaries = new Map<string, string>();
      const dictionaryItems = new Map<string, string>();
      for (const dictionarySeed of dictionarySeeds) {
        const dictionary = await database.sysDictionary.upsert({
          where: { systemCode_dictCode: { systemCode: 'demo-portal', dictCode: dictionarySeed.code } },
          update: { dictName: dictionarySeed.name, groupCode: dictionarySeed.groupCode, description: dictionarySeed.description, sortNo: dictionarySeed.sortNo, status: 'ACTIVE', itemsEditable: dictionarySeed.itemsEditable, updatedBy: 'seed', version: { increment: 1 } },
          create: { systemCode: 'demo-portal', dictCode: dictionarySeed.code, dictName: dictionarySeed.name, groupCode: dictionarySeed.groupCode, description: dictionarySeed.description, sortNo: dictionarySeed.sortNo, itemsEditable: dictionarySeed.itemsEditable, createdBy: 'seed', updatedBy: 'seed' },
        });
        dictionaries.set(dictionarySeed.code, dictionary.id);
      }
      for (const dictionarySeed of dictionarySeeds) {
        const dictionaryId = dictionaries.get(dictionarySeed.code);
        if (!dictionaryId) throw new Error(`SEED_DICTIONARY_REFERENCE_MISSING:${dictionarySeed.code}`);
        const parentId = dictionarySeed.parentCode ? dictionaries.get(dictionarySeed.parentCode) : null;
        if (dictionarySeed.parentCode && !parentId) throw new Error(`SEED_DICTIONARY_PARENT_MISSING:${dictionarySeed.parentCode}`);
        await database.sysDictionary.update({ where: { id: dictionaryId }, data: { parentId } });
        for (const [value, name, colorKey, parentValue] of dictionarySeed.items) {
          const parentItemId = parentValue && dictionarySeed.parentCode ? dictionaryItems.get(`${dictionarySeed.parentCode}:${parentValue}`) : null;
          const item = await database.sysDictionaryItem.upsert({
            where: { dictionaryId_itemValue: { dictionaryId, itemValue: value } },
            update: { parentItemId, itemName: name, itemCode: value, colorKey, sortNo: dictionarySeed.items.findIndex((item) => item[0] === value) * 10 + 10, status: 'ACTIVE', updatedBy: 'seed', version: { increment: 1 } },
            create: { dictionaryId, parentItemId, itemCode: value, itemValue: value, itemName: name, colorKey, sortNo: dictionarySeed.items.findIndex((item) => item[0] === value) * 10 + 10, createdBy: 'seed', updatedBy: 'seed' },
          });
          dictionaryItems.set(`${dictionarySeed.code}:${value}`, item.id);
        }
      }

      const customerViewConfig = {
        columns: [
          ['customerCode', true, true, false, 110, 'left'], ['customerName', true, true, false, 170, null], ['shortName', true, true, false, 110, null],
          ['categoryValue', true, true, false, 90, null], ['statusValue', true, true, false, 80, null], ['industryValue', true, true, true, 90, null],
          ['levelValue', true, true, true, 80, null], ['salesOwnerName', true, true, true, 90, null], ['address', true, false, false, 190, null], ['remark', false, false, false, 180, null],
        ].map(([key, visible, queryVisible, queryCollapsed, width, fixed]) => ({ key, visible, queryVisible, queryCollapsed, width, fixed })),
        pageSize: 20,
        filters: {},
        sort: { field: 'updatedAt', direction: 'desc' },
      };
      const systemView = await database.uiSystemListView.upsert({
        where: { systemCode_pageCode_actionCode_viewCode: { systemCode: 'demo-portal', pageCode: 'customer-directory', actionCode: 'view', viewCode: 'default' } },
        update: { applicationId: demoApplicationId, viewName: '客户默认视图', isDefault: true, allowPersonalOverride: true, priority: 10, status: 'ACTIVE', config: customerViewConfig, updatedBy: 'seed', version: { increment: 1 } },
        create: { applicationId: demoApplicationId, systemCode: 'demo-portal', pageCode: 'customer-directory', actionCode: 'view', viewCode: 'default', viewName: '客户默认视图', isDefault: true, allowPersonalOverride: true, priority: 10, config: customerViewConfig, createdBy: 'seed', updatedBy: 'seed' },
      });
      for (const roleCode of ['system-manager', 'viewer']) {
        const roleId = roles.get(`demo-portal:${roleCode}`);
        if (!roleId) throw new Error(`SEED_VIEW_ROLE_MISSING:${roleCode}`);
        await database.iamRoleListView.upsert({ where: { roleId_viewId: { roleId, viewId: systemView.id } }, update: { status: 'ACTIVE' }, create: { roleId, viewId: systemView.id } });
      }

      await initializeParameters(database, seedDefinition.systems);
      await initializeBusinessListViews(database, seedDefinition.systems);

      const customers = [
        ['C2026090001', '星海智能制造有限公司', '星海智造', 'formal', '广州市黄埔区创新大道 18 号', 'active', 'manufacturing', 'a', 'sales-lin', '林晓', '重点客户，关注年度框架合作'],
        ['C2026090002', '云杉科技服务有限公司', '云杉科技', 'potential', '深圳市南山区科技园 6 号', 'active', 'technology', 'b', 'sales-zhou', '周然', '处于方案交流阶段'],
        ['C2026090003', '远帆零售管理有限公司', '远帆零售', 'partner', '杭州市滨江区江南大道 88 号', 'paused', 'retail', 'c', 'sales-chen', '陈沐', '暂缓新增项目'],
      ];
      for (const [customerCode, customerName, shortName, categoryValue, address, statusValue, industryValue, levelValue, salesOwnerKey, salesOwnerName, remark] of customers) {
        await database.crmCustomer.upsert({
          where: { systemCode_customerCode: { systemCode: 'demo-portal', customerCode } },
          update: { customerName, shortName, categoryValue, address, statusValue, industryValue, levelValue, salesOwnerKey, salesOwnerName, remark, updatedBy: 'seed' },
          create: { systemCode: 'demo-portal', customerCode, customerName, shortName, categoryValue, address, statusValue, industryValue, levelValue, salesOwnerKey, salesOwnerName, remark, createdBy: 'seed', updatedBy: 'seed' },
        });
      }

      const opportunityApplicationId = applications.get('demo-portal');
      const opportunityOwnerId = users.get('admin');
      if (!opportunityApplicationId || !opportunityOwnerId) throw new Error('SEED_OPPORTUNITY_SCOPE_MISSING');
      const productSeeds = [
        ['P2026090001', '智能控制板', 'CB-100', '电子部件', '件'],
        ['P2026090002', '电源模组', 'PS-240', '电源产品', '套'],
        ['P2026090003', '显示模组', 'DP-55', '显示产品', '套'],
      ];
      const products = new Map<string, string>();
      const productCategories = { majorCategoryId: dictionaryItems.get('material_major_category:finished_goods'), middleCategoryId: dictionaryItems.get('material_middle_category:structural'), minorCategoryId: dictionaryItems.get('material_minor_category:connector') };
      const materialCategories = { majorCategoryId: dictionaryItems.get('material_major_category:raw_material'), middleCategoryId: dictionaryItems.get('material_middle_category:electronic'), minorCategoryId: dictionaryItems.get('material_minor_category:resistor') };
      for (const [productCode, productName, model, productLine, unit] of productSeeds) {
        const product = await database.mdProduct.upsert({
          where: { tenantId_productCode: { tenantId: tenant.id, productCode } },
          update: { productName, model, productLine, unit, status: 'ACTIVE', updatedBy: 'seed' },
          create: { tenantId: tenant.id, productCode, productName, model, productLine, unit, createdBy: 'seed', updatedBy: 'seed' },
        });
        products.set(productCode, product.id);
        await database.mdItem.upsert({
          where: { tenantId_itemCode: { tenantId: tenant.id, itemCode: productCode } },
          update: { itemName: productName, itemType: 'PRODUCT', ...productCategories, model, productLine, baseUnit: unit, status: 'ACTIVE', updatedBy: 'seed' },
          create: { id: product.id, tenantId: tenant.id, itemCode: productCode, itemName: productName, itemType: 'PRODUCT', ...productCategories, model, productLine, baseUnit: unit, createdBy: 'seed', updatedBy: 'seed' },
        });
      }
      await database.mdItem.upsert({
        where: { tenantId_itemCode: { tenantId: tenant.id, itemCode: 'RM-BOARD-001' } },
        update: { itemName: '控制板基板', itemType: 'MATERIAL', ...materialCategories, baseUnit: '片', batchManaged: true, status: 'ACTIVE', updatedBy: 'seed' },
        create: { tenantId: tenant.id, itemCode: 'RM-BOARD-001', itemName: '控制板基板', itemType: 'MATERIAL', ...materialCategories, baseUnit: '片', batchManaged: true, createdBy: 'seed', updatedBy: 'seed' },
      });

      const legalOrgId = organizationIds.get('component-bg');
      if (!legalOrgId) throw new Error('SEED_LEGAL_ORGANIZATION_MISSING');
      const legalEntity = await database.orgLegalEntity.upsert({
        where: { tenantId_entityCode: { tenantId: tenant.id, entityCode: 'DEMO_LE' } },
        update: { orgUnitId: legalOrgId, entityName: '演示法人', currencyCode: 'CNY', status: 'ACTIVE', sortNo: 10, updatedBy: 'seed' },
        create: { tenantId: tenant.id, orgUnitId: legalOrgId, entityCode: 'DEMO_LE', entityName: '演示法人', currencyCode: 'CNY', sortNo: 10, createdBy: 'seed', updatedBy: 'seed' },
      });
      const finishedWarehouse = await database.scmWarehouse.upsert({
        where: { tenantId_warehouseCode: { tenantId: tenant.id, warehouseCode: 'FG_WH' } },
        update: { legalEntityId: legalEntity.id, warehouseName: '成品仓', warehouseType: 'FINISHED_GOODS', warehouseNature: 'OWNED', status: 'ACTIVE', sortNo: 10, updatedBy: 'seed' },
        create: { tenantId: tenant.id, legalEntityId: legalEntity.id, warehouseCode: 'FG_WH', warehouseName: '成品仓', warehouseType: 'FINISHED_GOODS', warehouseNature: 'OWNED', sortNo: 10, createdBy: 'seed', updatedBy: 'seed' },
      });
      await database.scmWarehouse.upsert({
        where: { tenantId_warehouseCode: { tenantId: tenant.id, warehouseCode: 'RM_WH' } },
        update: { legalEntityId: legalEntity.id, warehouseName: '原材料仓', warehouseType: 'RAW_MATERIAL', warehouseNature: 'OWNED', status: 'ACTIVE', sortNo: 20, updatedBy: 'seed' },
        create: { tenantId: tenant.id, legalEntityId: legalEntity.id, warehouseCode: 'RM_WH', warehouseName: '原材料仓', warehouseType: 'RAW_MATERIAL', warehouseNature: 'OWNED', sortNo: 20, createdBy: 'seed', updatedBy: 'seed' },
      });
      const seededItem = await database.mdItem.findUniqueOrThrow({ where: { tenantId_itemCode: { tenantId: tenant.id, itemCode: 'P2026090001' } } });
      const seededOrder = await database.scmInboundOrder.upsert({
        where: { tenantId_orderNo: { tenantId: tenant.id, orderNo: 'RK2026092400001' } },
        update: { legalEntityId: legalEntity.id, warehouseId: finishedWarehouse.id, status: 'POSTED', updatedBy: 'seed' },
        create: { tenantId: tenant.id, applicationId: opportunityApplicationId, orderNo: 'RK2026092400001', documentDate: new Date('2026-09-24'), creatorId: opportunityOwnerId, inboundType: 'FINISHED_GOODS', status: 'POSTED', postedAt: new Date('2026-09-24T08:00:00Z'), postedBy: opportunityOwnerId, legalEntityId: legalEntity.id, warehouseId: finishedWarehouse.id, reasonCode: 'FINISHED_GOODS', currencyCode: 'CNY', remark: '初始化演示库存', createdBy: 'seed', updatedBy: 'seed' },
      });
      await database.scmDocumentCounter.upsert({
        where: { tenantId_documentType_businessDate: { tenantId: tenant.id, documentType: 'INBOUND', businessDate: new Date('2026-09-24') } },
        update: {},
        create: { tenantId: tenant.id, documentType: 'INBOUND', businessDate: new Date('2026-09-24'), currentValue: 1 },
      });
      const seededLine = await database.scmInboundLine.upsert({
        where: { orderId_lineNo: { orderId: seededOrder.id, lineNo: 10 } },
        update: { itemId: seededItem.id, itemCode: seededItem.itemCode, itemName: seededItem.itemName, actualQty: 10, baseUnit: seededItem.baseUnit, amount: 2800, updatedBy: 'seed' },
        create: { orderId: seededOrder.id, tenantId: tenant.id, lineNo: 10, itemId: seededItem.id, itemCode: seededItem.itemCode, itemName: seededItem.itemName, actualQty: 10, baseUnit: seededItem.baseUnit, amount: 2800, createdBy: 'seed', updatedBy: 'seed' },
      });
      await database.scmInventoryBalance.upsert({
        where: { tenantId_legalEntityId_warehouseId_itemCode_batchNo: { tenantId: tenant.id, legalEntityId: legalEntity.id, warehouseId: finishedWarehouse.id, itemCode: seededItem.itemCode, batchNo: '' } },
        update: { quantity: 10, amount: 2800, baseUnit: seededItem.baseUnit, currencyCode: 'CNY' },
        create: { tenantId: tenant.id, legalEntityId: legalEntity.id, warehouseId: finishedWarehouse.id, itemCode: seededItem.itemCode, batchNo: '', baseUnit: seededItem.baseUnit, quantity: 10, amount: 2800, currencyCode: 'CNY' },
      });
      await database.scmInventoryTxn.upsert({
        where: { sourceLineId_movementType: { sourceLineId: seededLine.id, movementType: 'INBOUND' } },
        update: { quantity: 10, amount: 2800, itemName: seededItem.itemName, remark: '初始化演示库存' },
        create: { tenantId: tenant.id, applicationId: opportunityApplicationId, sourceType: 'INBOUND_ORDER', sourceName: '入库单', sourceOrderId: seededOrder.id, orderNo: seededOrder.orderNo, sourceLineId: seededLine.id, lineNo: 10, movementType: 'INBOUND', itemCode: seededItem.itemCode, itemName: seededItem.itemName, quantity: 10, amount: 2800, warehouseId: finishedWarehouse.id, legalEntityId: legalEntity.id, currencyCode: 'CNY', remark: '初始化演示库存', actorId: opportunityOwnerId },
      });
      const competitorSeeds = [
        ['启明科技', '行业领先', '深圳', '智能控制及显示模组', '交付成熟、品牌认可度高', '定制响应较慢'],
        ['华峰电子', '区域头部', '东莞', '电源和结构件', '成本竞争力强', '复杂方案能力有限'],
      ];
      const competitors = new Map<string, string>();
      for (const [competitorName, industryPosition, location, mainProducts, strengths, weaknesses] of competitorSeeds) {
        const competitor = await database.sdCompetitor.upsert({
          where: { tenantId_competitorName: { tenantId: tenant.id, competitorName } },
          update: { industryPosition, location, mainProducts, strengths, weaknesses, status: 'ACTIVE', updatedBy: 'seed' },
          create: { tenantId: tenant.id, competitorName, industryPosition, location, mainProducts, strengths, weaknesses, createdBy: 'seed', updatedBy: 'seed' },
        });
        competitors.set(competitorName, competitor.id);
      }
      const templateSeeds = [
        { code: 'public', name: '公共', isDefault: true, stages: [['lead', '初始线索', 10], ['need', '客户需求确认', 25], ['technical', '技术认可', 40], ['quote', '报价', 60], ['negotiation', '商务谈判', 80], ['contract', '合同签订', 100]] },
        { code: 'tender', name: '招投标项目', isDefault: false, stages: [['discovery', '项目发现', 10], ['qualification', '资格预审', 25], ['registration', '报名立项', 40], ['proposal', '投标文件', 60], ['evaluation', '开标评标', 80], ['award', '中标/合同', 100]] },
      ] as const;
      const templates = new Map<string, { id: string; firstStageId: string; firstStageName: string; probability: number }>();
      for (const templateSeed of templateSeeds) {
        const template = await database.sdOppTemplate.upsert({
          where: { applicationId_templateCode: { applicationId: opportunityApplicationId, templateCode: templateSeed.code } },
          update: { templateName: templateSeed.name, isDefault: templateSeed.isDefault, status: 'ACTIVE', updatedBy: 'seed' },
          create: { tenantId: tenant.id, applicationId: opportunityApplicationId, templateCode: templateSeed.code, templateName: templateSeed.name, isDefault: templateSeed.isDefault, createdBy: 'seed', updatedBy: 'seed' },
        });
        let firstStageId = '';
        for (const [index, [stageCode, stageName, probability]] of templateSeed.stages.entries()) {
          const stage = await database.sdOppStage.upsert({
            where: { templateId_stageCode: { templateId: template.id, stageCode } },
            update: { stageName, probability, isDefault: index === 0, sortNo: (index + 1) * 10, status: 'ACTIVE', updatedBy: 'seed' },
            create: { templateId: template.id, stageCode, stageName, probability, isDefault: index === 0, sortNo: (index + 1) * 10, createdBy: 'seed', updatedBy: 'seed' },
          });
          if (index === 0) firstStageId = stage.id;
        }
        templates.set(templateSeed.code, { id: template.id, firstStageId, firstStageName: templateSeed.stages[0][1], probability: templateSeed.stages[0][2] });
      }
      const sampleCustomer = await database.crmCustomer.findFirstOrThrow({ where: { systemCode: 'demo-portal', customerCode: 'C2026090001' } });
      const publicTemplate = templates.get('public');
      if (!publicTemplate) throw new Error('SEED_PUBLIC_OPPORTUNITY_TEMPLATE_MISSING');
      const sampleOpportunity = await database.sdOpp.upsert({
        where: { applicationId_opportunityCode: { applicationId: opportunityApplicationId, opportunityCode: 'O2026090001' } },
        update: { opportunityName: '星海年度智能控制项目', customerName: sampleCustomer.customerName, ownerName: '系统管理员', templateId: publicTemplate.id, templateName: '公共', stageId: publicTemplate.firstStageId, stageName: publicTemplate.firstStageName, stageProbability: publicTemplate.probability, confidence: 35, updatedBy: 'seed' },
        create: { tenantId: tenant.id, applicationId: opportunityApplicationId, systemCode: 'demo-portal', opportunityCode: 'O2026090001', opportunityName: '星海年度智能控制项目', customerId: sampleCustomer.id, customerName: sampleCustomer.customerName, ownerUserId: opportunityOwnerId, ownerName: '系统管理员', templateId: publicTemplate.id, templateName: '公共', stageId: publicTemplate.firstStageId, stageName: publicTemplate.firstStageName, stageProbability: publicTemplate.probability, confidence: 35, status: 'ACTIVE', createdBy: 'seed', updatedBy: 'seed' },
      });
      const sampleProductId = products.get('P2026090001');
      if (sampleProductId && !await database.sdOppProduct.findFirst({ where: { opportunityId: sampleOpportunity.id, productId: sampleProductId } })) {
        await database.sdOppProduct.create({ data: { tenantId: tenant.id, opportunityId: sampleOpportunity.id, productId: sampleProductId, productCode: 'P2026090001', productName: '智能控制板', model: 'CB-100', quantity: 1000, unitPrice: 280, expectedAmount: 280000, requirement: '首批样机验证后分批交付', sortNo: 10, createdBy: 'seed', updatedBy: 'seed' } });
      }

      const sceneSeeds: Array<[string, string, string, string, 'DONE' | 'WIP' | 'TODO', string | null, string | null, number]> = [
        ['概览', null, '概览首页', '平台入口与导航总览', 'TODO', null, null, 10],
        ['基础规范', null, '颜色与主题', '品牌色、语义色、暗色/亮色主题', 'DONE', null, null, 20],
        ['基础规范', null, '字体与排版', '字号阶梯、行高、字重', 'DONE', null, null, 30],
        ['基础规范', null, '间距与布局', '栅格、间距 token、容器', 'DONE', null, null, 40],
        ['基础规范', null, '图标与状态色', '图标库、语义状态色', 'DONE', null, null, 50],
        ['基础组件', null, '按钮与操作', '主/次/危险按钮、操作区', 'DONE', null, null, 60],
        ['基础组件', null, '表单控件', '输入、选择、日期、校验', 'DONE', null, null, 70],
        ['基础组件', null, '数据展示', '表格、标签、描述列表', 'DONE', null, null, 80],
        ['基础组件', null, '反馈组件', '提示、对话框、抽屉', 'DONE', null, null, 90],
        ['页面模板', null, '查询列表', '标准查询+表格+分页', 'DONE', null, null, 100],
        ['页面模板', null, '高级筛选列表', '多条件折叠筛选', 'DONE', null, null, 110],
        ['页面模板', null, '新增编辑表单', '表单弹层/独立页', 'DONE', null, null, 120],
        ['页面模板', null, '业务详情', '详情页布局', 'DONE', null, null, 130],
        ['页面模板', null, '主从工作区', '主表+子表左右分栏', 'DONE', null, null, 140],
        ['页面模板', null, '工作台', '个人工作台卡片布局', 'DONE', null, null, 150],
        ['交互模式', null, '交互模式总览', '通用交互模式汇编', 'WIP', null, null, 160],
        ['页面状态', null, '页面状态', '空态/加载/错误/权限', 'WIP', null, null, 170],
        ['组合场景', null, '组合场景', '多模式组合的完整业务场景', 'WIP', null, null, 180],
        ['业务页面', '客户', '客户列表', '查询+表格+分页+视图切换', 'DONE', '/showcase/customers', null, 200],
        ['业务页面', '系统管理', '数据字典', '左树右表+字典值维护', 'DONE', '/showcase/system/dictionaries', null, 210],
        ['业务页面', '系统管理', '列表视图', '系统/个人视图配置', 'DONE', '/showcase/system/list-views', null, 220],
      ];
      for (const [category, subCategory, sceneName, description, status, pagePath, note, sortNo] of sceneSeeds) {
        const existing = await database.styleScene.findFirst({ where: { systemCode: 'demo-portal', category, sceneName } });
        if (existing) {
          await database.styleScene.update({ where: { id: existing.id }, data: { subCategory, description, status, pagePath, note, sortNo, updatedBy: 'seed' } });
        } else {
          await database.styleScene.create({ data: { systemCode: 'demo-portal', category, subCategory, sceneName, description, status, pagePath, note, sortNo, createdBy: 'seed', updatedBy: 'seed' } });
        }
      }

      const systemCodes = seedDefinition.systems;
      const [persistedMenus, persistedActions, persistedRoles, persistedGrants] = await Promise.all([
        database.uiMenu.findMany({ where: { systemCode: { in: systemCodes }, status: 'ACTIVE' } }),
        database.uiMenuAction.findMany({ where: { status: 'ACTIVE', menu: { systemCode: { in: systemCodes }, status: 'ACTIVE' } } }),
        database.iamRole.findMany({ where: { systemCode: { in: systemCodes }, status: 'ACTIVE' } }),
        database.iamRolePermission.findMany({ where: { status: 'ACTIVE', role: { systemCode: { in: systemCodes }, status: 'ACTIVE' }, permission: { status: 'ACTIVE', OR: [{ permissionCode: { startsWith: 'navigation.' } }, { permissionCode: { startsWith: 'menu.' } }] } }, include: { permission: true } }),
      ]);
      const persistedDefinition = databaseRowsToSeedDefinition({ systems: systemCodes, menus: persistedMenus, actions: persistedActions, roles: persistedRoles, grants: persistedGrants });
      const persistedErrors = validateSeedDefinition(persistedDefinition);
      if (persistedErrors.length) throw new Error(`PERSISTED_RBAC_CONFIGURATION_INVALID\n${persistedErrors.join('\n')}`);
    }, { isolationLevel: 'Serializable' });
  } finally {
    await client.$disconnect();
  }
}

void main();
