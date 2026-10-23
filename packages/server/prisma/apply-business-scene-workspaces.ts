import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedDefinition } from './seed-data';
import { initialBusinessScene } from '../src/digital-employee/business-scene-domain';
import type { BusinessSceneCode } from '@forge-crm/contracts';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const menus = seedDefinition.menus.filter(menu => menu.systemCode === 'demo-portal' && menu.menuCode === 'de-scene-bi');
const actions = seedDefinition.actions.filter(action => action.systemCode === 'demo-portal' && action.menuCode === 'de-scene-bi');

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

      const parentResource = await tx.sysPageResource.findUnique({where:{applicationId_pageCode:{applicationId:application.id,pageCode:'de-finance'}}});
      const parentMenu = await tx.uiMenu.findUnique({where:{systemCode_menuCode:{systemCode:'demo-portal',menuCode:'de-finance'}}});
      if (!parentResource || !parentMenu) throw new Error('FINANCE_PARENT_NOT_FOUND');
      const resourceIds = new Map<string,string>([['de-finance',parentResource.id]]);
      for (const menu of menus) {
        const parentId = menu.parentCode ? resourceIds.get(menu.parentCode) : resourceIds.get('$root');
        if (!parentId) throw new Error(`MENU_RESOURCE_PARENT_NOT_FOUND:${menu.menuCode}`);
        const resource = await tx.sysPageResource.upsert({
          where: { applicationId_pageCode: { applicationId: application.id, pageCode: menu.menuCode } },
          update: { parentId, pageName: menu.menuName ?? menu.menuCode, pageType: menu.nodeType === 'GROUP' ? 'MODULE' : 'PAGE', routePath: menu.routePath, iconKey: menu.iconKey ?? 'overview', sortNo: menu.sortNo ?? 0, updatedBy: actor.id, version: { increment: 1 } },
          create: { tenantId: tenant.id, applicationId: application.id, parentId, pageCode: menu.menuCode, pageName: menu.menuName ?? menu.menuCode, pageType: menu.nodeType === 'GROUP' ? 'MODULE' : 'PAGE', routePath: menu.routePath, iconKey: menu.iconKey ?? 'overview', sortNo: menu.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id },
        });
        resourceIds.set(menu.menuCode, resource.id);
      }

      const menuIds = new Map<string, string>([['de-finance',parentMenu.id]]);
      for (const menu of menus) {
        const resourceId = resourceIds.get(menu.menuCode);
        const parentId = menu.parentCode ? menuIds.get(menu.parentCode) : null;
        if (!resourceId || (menu.parentCode && !parentId)) throw new Error(`MENU_PARENT_NOT_FOUND:${menu.menuCode}`);
        const access = await tx.sysPermission.upsert({
          where: { applicationId_permissionCode: { applicationId: application.id, permissionCode: `navigation.${menu.menuCode}.access` } },
          update: { permissionName: `访问${menu.menuName ?? menu.menuCode}`, resourceCode: menu.menuCode, actionCode: 'access', source: 'SYSTEM' },
          create: { applicationId: application.id, permissionCode: `navigation.${menu.menuCode}.access`, permissionName: `访问${menu.menuName ?? menu.menuCode}`, resourceCode: menu.menuCode, actionCode: 'access', source: 'SYSTEM' },
        });
        const entry = await tx.uiMenu.upsert({
          where: { systemCode_menuCode: { systemCode: 'demo-portal', menuCode: menu.menuCode } },
          update: { applicationId: application.id, accessPermissionId: access.id, pageResourceId: resourceId, menuName: menu.menuName ?? menu.menuCode, nodeType: menu.nodeType, parentId, routePath: menu.routePath, iconKey: menu.iconKey ?? 'overview', sortNo: menu.sortNo ?? 0, menuType: menu.nodeType === 'GROUP' ? 'DIRECTORY' : 'PAGE', version: { increment: 1 } },
          create: { applicationId: application.id, accessPermissionId: access.id, pageResourceId: resourceId, systemCode: 'demo-portal', menuCode: menu.menuCode, menuName: menu.menuName ?? menu.menuCode, nodeType: menu.nodeType, parentId, routePath: menu.routePath, iconKey: menu.iconKey ?? 'overview', sortNo: menu.sortNo ?? 0, menuType: menu.nodeType === 'GROUP' ? 'DIRECTORY' : 'PAGE' },
        });
        menuIds.set(menu.menuCode, entry.id);
        await tx.iamRolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: access.id } },
          update: {},
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
          update: { permissionName: action.actionName ?? action.actionCode, resourceCode: action.menuCode, actionCode: action.actionCode, source: 'SYSTEM' },
          create: { applicationId: application.id, permissionCode, permissionName: action.actionName ?? action.actionCode, resourceCode: action.menuCode, actionCode: action.actionCode, source: 'SYSTEM' },
        });
        await tx.uiMenuAction.upsert({
          where: { menuId_actionCode: { menuId, actionCode: action.actionCode } },
          update: { permissionId: permission.id, actionName: action.actionName ?? action.actionCode, actionType: action.actionType ?? 'CUSTOM', sortNo: action.sortNo ?? 0 },
          create: { menuId, permissionId: permission.id, actionCode: action.actionCode, actionName: action.actionName ?? action.actionCode, actionType: action.actionType ?? 'CUSTOM', sortNo: action.sortNo ?? 0 },
        });
        await tx.sysPageButton.upsert({
          where: { pageId_buttonCode: { pageId: resourceId, buttonCode: action.actionCode } },
          update: { buttonName: action.actionName ?? action.actionCode, buttonType: action.actionType === 'LINE' ? 'LINE' : 'TOOL', sortNo: action.sortNo ?? 0, updatedBy: actor.id },
          create: { pageId: resourceId, buttonCode: action.actionCode, buttonName: action.actionName ?? action.actionCode, buttonType: action.actionType === 'LINE' ? 'LINE' : 'TOOL', sortNo: action.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id },
        });
        await tx.iamRolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, applicationId: application.id, permissionId: permission.id, grantedBy: actor.id },
        });
      }
      for (const scenarioCode of ['SCN-PO','SCN-RMA','SCN-BI'] as BusinessSceneCode[]) {
        await tx.sysDeSceneWorkspace.upsert({
          where:{applicationId_scenarioCode:{applicationId:application.id,scenarioCode}},
          update:{},
          create:{tenantId:tenant.id,applicationId:application.id,scenarioCode,data:initialBusinessScene(scenarioCode,'系统管理员'),createdBy:actor.id,updatedBy:actor.id},
        });
      }
    }, { timeout: 30000 });
    console.log(`Applied BI menu and 3 demo workspaces (15 rows each); existing edits and permissions preserved.`);
  } finally {
    await database.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
