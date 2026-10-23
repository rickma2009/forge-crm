import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedDefinition } from './seed-data';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const menus = seedDefinition.menus.filter((menu) => menu.systemCode === 'demo-portal' && (
  menu.menuCode === 'digital-employee' ||
  menu.menuCode === 'de-mail-processing' ||
  menu.parentCode === 'digital-employee' ||
  menu.menuCode.startsWith('de-scene-')
));
const actions = seedDefinition.actions.filter((action) => action.systemCode === 'demo-portal' && (
  action.menuCode === 'digital-employee-home' || action.menuCode === 'de-mail-processing' || action.menuCode.startsWith('de-scene-')
));
const hiddenMenuCodes = ['de-scene-rfq', 'de-scene-smt', 'de-scene-trace'];

async function main() {
  const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    await database.$transaction(async (tx) => {
      const tenant = await tx.sysTenant.findUnique({ where: { tenantCode: 'default' } });
      if (!tenant) throw new Error('DEFAULT_TENANT_NOT_FOUND');
      const application = await tx.sysApplication.findUnique({ where: { tenantId_applicationCode: { tenantId: tenant.id, applicationCode: 'demo-portal' } } });
      if (!application) throw new Error('DEMO_PORTAL_NOT_FOUND');
      const actor = await tx.iamUser.findUnique({ where: { tenantId_normalizedAccount: { tenantId: tenant.id, normalizedAccount: 'admin' } } });
      if (!actor) throw new Error('SEED_ADMIN_NOT_FOUND');
      const role = await tx.iamRole.findUnique({ where: { systemCode_roleCode: { systemCode: 'demo-portal', roleCode: 'system-manager' } } });
      if (!role || role.applicationId !== application.id) throw new Error('SYSTEM_MANAGER_ROLE_NOT_FOUND');

      const hiddenMenus = await tx.uiMenu.findMany({ where: { systemCode: 'demo-portal', menuCode: { in: hiddenMenuCodes } }, select: { id: true, menuCode: true } });
      const hiddenIds = hiddenMenus.map((menu) => menu.id);
      if (hiddenIds.length) {
        await tx.uiMenu.updateMany({ where: { id: { in: hiddenIds } }, data: { status: 'DISABLED', version: { increment: 1 } } });
        await tx.uiMenuAction.updateMany({ where: { menuId: { in: hiddenIds } }, data: { status: 'DISABLED' } });
        await tx.sysPageResource.updateMany({ where: { applicationId: application.id, pageCode: { in: hiddenMenuCodes } }, data: { status: 'DISABLED', updatedBy: actor.id, version: { increment: 1 } } });
        await tx.sysPermission.updateMany({ where: { applicationId: application.id, OR: hiddenMenuCodes.flatMap((code) => [{ permissionCode: `navigation.${code}.access` }, { permissionCode: { startsWith: `menu.${code}.` } }]) }, data: { status: 'DISABLED' } });
      }

      const resourceIds = new Map<string, string>();
      const existingRoot = await tx.sysPageResource.findUnique({ where: { applicationId_pageCode: { applicationId: application.id, pageCode: 'demo-portal' } } });
      if (!existingRoot) throw new Error('PORTAL_RESOURCE_ROOT_NOT_FOUND');
      resourceIds.set('$root', existingRoot.id);
      for (const menu of menus) {
        const parentId = menu.parentCode ? resourceIds.get(menu.parentCode) : resourceIds.get('$root');
        if (!parentId) throw new Error(`MENU_RESOURCE_PARENT_NOT_FOUND:${menu.menuCode}`);
        const resource = await tx.sysPageResource.upsert({
          where: { applicationId_pageCode: { applicationId: application.id, pageCode: menu.menuCode } },
          update: { parentId, pageName: menu.menuName ?? menu.menuCode, pageType: menu.nodeType === 'GROUP' ? 'MODULE' : 'PAGE', routePath: menu.routePath, iconKey: menu.iconKey ?? 'overview', sortNo: menu.sortNo ?? 0, status: 'ACTIVE', updatedBy: actor.id, version: { increment: 1 } },
          create: { tenantId: tenant.id, applicationId: application.id, parentId, pageCode: menu.menuCode, pageName: menu.menuName ?? menu.menuCode, pageType: menu.nodeType === 'GROUP' ? 'MODULE' : 'PAGE', routePath: menu.routePath, iconKey: menu.iconKey ?? 'overview', sortNo: menu.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id },
        });
        resourceIds.set(menu.menuCode, resource.id);
      }

      const menuIds = new Map<string, string>();
      for (const menu of menus) {
        const resourceId = resourceIds.get(menu.menuCode);
        const parentId = menu.parentCode ? menuIds.get(menu.parentCode) : null;
        if (!resourceId || (menu.parentCode && !parentId)) throw new Error(`MENU_PARENT_NOT_FOUND:${menu.menuCode}`);
        const access = await tx.sysPermission.upsert({
          where: { applicationId_permissionCode: { applicationId: application.id, permissionCode: `navigation.${menu.menuCode}.access` } },
          update: { permissionName: `访问${menu.menuName ?? menu.menuCode}`, resourceCode: menu.menuCode, actionCode: 'access', source: 'SYSTEM', status: 'ACTIVE' },
          create: { applicationId: application.id, permissionCode: `navigation.${menu.menuCode}.access`, permissionName: `访问${menu.menuName ?? menu.menuCode}`, resourceCode: menu.menuCode, actionCode: 'access', source: 'SYSTEM' },
        });
        const entry = await tx.uiMenu.upsert({
          where: { systemCode_menuCode: { systemCode: 'demo-portal', menuCode: menu.menuCode } },
          update: { applicationId: application.id, accessPermissionId: access.id, pageResourceId: resourceId, menuName: menu.menuName ?? menu.menuCode, nodeType: menu.nodeType, parentId, routePath: menu.routePath, iconKey: menu.iconKey ?? 'overview', sortNo: menu.sortNo ?? 0, menuType: menu.nodeType === 'GROUP' ? 'DIRECTORY' : 'PAGE', status: 'ACTIVE', version: { increment: 1 } },
          create: { applicationId: application.id, accessPermissionId: access.id, pageResourceId: resourceId, systemCode: 'demo-portal', menuCode: menu.menuCode, menuName: menu.menuName ?? menu.menuCode, nodeType: menu.nodeType, parentId, routePath: menu.routePath, iconKey: menu.iconKey ?? 'overview', sortNo: menu.sortNo ?? 0, menuType: menu.nodeType === 'GROUP' ? 'DIRECTORY' : 'PAGE' },
        });
        menuIds.set(menu.menuCode, entry.id);
        await tx.iamRolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: access.id } },
          update: { status: 'ACTIVE', revokedAt: null, revokedBy: null },
          create: { roleId: role.id, applicationId: application.id, permissionId: access.id, grantedBy: actor.id },
        });
      }

      for (const action of actions) {
        const menuId = menuIds.get(action.menuCode);
        const resourceId = resourceIds.get(action.menuCode);
        if (!menuId || !resourceId) throw new Error(`MENU_ACTION_PARENT_NOT_FOUND:${action.menuCode}`);
        const permissionCode = `menu.${action.menuCode}.${action.actionCode}`;
        const permission = await tx.sysPermission.upsert({
          where: { applicationId_permissionCode: { applicationId: application.id, permissionCode } },
          update: { permissionName: action.actionName ?? action.actionCode, resourceCode: action.menuCode, actionCode: action.actionCode, source: 'SYSTEM', status: 'ACTIVE' },
          create: { applicationId: application.id, permissionCode, permissionName: action.actionName ?? action.actionCode, resourceCode: action.menuCode, actionCode: action.actionCode, source: 'SYSTEM' },
        });
        await tx.uiMenuAction.upsert({
          where: { menuId_actionCode: { menuId, actionCode: action.actionCode } },
          update: { permissionId: permission.id, actionName: action.actionName ?? action.actionCode, actionType: action.actionType ?? 'CUSTOM', sortNo: action.sortNo ?? 0, status: 'ACTIVE' },
          create: { menuId, permissionId: permission.id, actionCode: action.actionCode, actionName: action.actionName ?? action.actionCode, actionType: action.actionType ?? 'CUSTOM', sortNo: action.sortNo ?? 0 },
        });
        await tx.sysPageButton.upsert({
          where: { pageId_buttonCode: { pageId: resourceId, buttonCode: action.actionCode } },
          update: { buttonName: action.actionName ?? action.actionCode, buttonType: action.actionType === 'LINE' ? 'LINE' : 'TOOL', sortNo: action.sortNo ?? 0, status: 'ACTIVE', updatedBy: actor.id },
          create: { pageId: resourceId, buttonCode: action.actionCode, buttonName: action.actionName ?? action.actionCode, buttonType: action.actionType === 'LINE' ? 'LINE' : 'TOOL', sortNo: action.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id },
        });
        await tx.iamRolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: { status: 'ACTIVE', revokedAt: null, revokedBy: null },
          create: { roleId: role.id, applicationId: application.id, permissionId: permission.id, grantedBy: actor.id },
        });
      }
    }, { timeout: 30000 });
    console.log(`Applied ${menus.length} digital employee menu nodes and ${actions.length} page actions for system-manager.`);
  } finally {
    await database.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
