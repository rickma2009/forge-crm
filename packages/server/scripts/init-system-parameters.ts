/** Additive setup: presets, menu and administrator grants; never overwrite existing configuration. */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { systemCodeSchema } from '@forge-crm/contracts';
import { DatabaseService } from '../src/database/database.service';
import { initializeParameters } from '../src/system-parameter/parameter-defaults';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
async function main() {
  if (!process.env.DATABASE_URL || !process.env.SYSTEM_CODES) throw new Error('DATABASE_URL and SYSTEM_CODES are required');
  const db = new DatabaseService(process.env.DATABASE_URL);
  const systems = process.env.SYSTEM_CODES.split(',').map((code) => systemCodeSchema.parse(code.trim()));
  try {
    const result = await db.$transaction(async (tx) => {
      const apps = await tx.sysApplication.findMany({ where: { applicationCode: { in: systems }, status: 'ACTIVE' } });
      for (const app of apps) {
        const actor = await tx.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
        const parent = await tx.uiMenu.findUniqueOrThrow({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: 'system' } } });
        if (!parent.pageResourceId || parent.applicationId !== app.id) throw new Error('SYSTEM_PARAMETER_PARENT_RESOURCE_MISSING');
        const permission = (permissionCode: string, permissionName: string, actionCode: string) => tx.sysPermission.upsert({ where: { applicationId_permissionCode: { applicationId: app.id, permissionCode } }, update: {}, create: { applicationId: app.id, permissionCode, permissionName, resourceCode: 'system-parameters', actionCode, source: 'SYSTEM' } });
        const access = await permission('navigation.system-parameters.access', '访问参数设置', 'access');
        const page = await tx.sysPageResource.upsert({ where: { applicationId_pageCode: { applicationId: app.id, pageCode: 'system-parameters' } }, update: {}, create: { tenantId: app.tenantId, applicationId: app.id, parentId: parent.pageResourceId, pageCode: 'system-parameters', pageName: '参数设置', pageType: 'PAGE', routePath: '/showcase/system/parameters', iconKey: 'settings', sortNo: 110, createdBy: actor.id, updatedBy: actor.id } });
        const menu = await tx.uiMenu.upsert({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: 'system-parameters' } }, update: {}, create: { applicationId: app.id, accessPermissionId: access.id, pageResourceId: page.id, parentId: parent.id, systemCode: app.applicationCode, menuCode: 'system-parameters', menuName: '参数设置', nodeType: 'PAGE', menuType: 'PAGE', routePath: '/showcase/system/parameters', iconKey: 'settings', sortNo: 110 } });
        const ids = [access.id];
        for (const [action, name] of [['view', '查看参数'], ['manage', '设置参数']] as const) {
          const p = await permission(`menu.system-parameters.${action}`, name, action); ids.push(p.id);
          await tx.uiMenuAction.upsert({ where: { menuId_actionCode: { menuId: menu.id, actionCode: action } }, update: {}, create: { menuId: menu.id, permissionId: p.id, actionCode: action, actionName: name, actionType: action === 'view' ? 'VIEW' : 'UPDATE', sortNo: action === 'view' ? 10 : 20 } });
          await tx.sysPageButton.upsert({ where: { pageId_buttonCode: { pageId: page.id, buttonCode: action } }, update: {}, create: { pageId: page.id, buttonCode: action, buttonName: name, buttonType: 'TOOL', sortNo: action === 'view' ? 10 : 20, createdBy: actor.id, updatedBy: actor.id } });
        }
        const roles = await tx.iamRole.findMany({ where: { applicationId: app.id, roleCode: 'system-manager', isSystem: true, status: 'ACTIVE' } });
        for (const role of roles) for (const permissionId of ids) await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId } }, update: {}, create: { applicationId: app.id, roleId: role.id, permissionId } });
      }
      return initializeParameters(tx, systems);
    });
    console.log(JSON.stringify({ event: 'system-parameters-initialized', ...result }));
  } finally { await db.$disconnect(); }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Initialization failed'); process.exitCode = 1; });
