/** Additive sales prototype menu registration. Existing users, passwords and business data stay untouched. */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedDefinition } from '../prisma/seed-data';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const codes = new Set(['sales-management', 'sales-order-directory', 'sales-outbound-directory', 'sales-return-directory']);

async function main() {
  const apps = await db.sysApplication.findMany({ where: { applicationCode: 'demo-portal', status: 'ACTIVE' } });
  for (const app of apps) await db.$transaction(async (tx) => {
    const actor = await tx.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    const root = await tx.sysPageResource.findUniqueOrThrow({ where: { applicationId_pageCode: { applicationId: app.id, pageCode: app.applicationCode } } });
    const permission = async (code: string, name: string, resource: string, action: string) => tx.sysPermission.upsert({ where: { applicationId_permissionCode: { applicationId: app.id, permissionCode: code } }, update: {}, create: { applicationId: app.id, permissionCode: code, permissionName: name, resourceCode: resource, actionCode: action, source: 'SYSTEM' } });
    for (const candidate of seedDefinition.menus.filter((row) => codes.has(row.menuCode))) {
      const parentResource = candidate.parentCode ? await tx.sysPageResource.findUniqueOrThrow({ where: { applicationId_pageCode: { applicationId: app.id, pageCode: candidate.parentCode } } }) : root;
      const parentMenu = candidate.parentCode ? await tx.uiMenu.findUniqueOrThrow({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: candidate.parentCode } } }) : null;
      const access = await permission(`navigation.${candidate.menuCode}.access`, `访问${candidate.menuName}`, candidate.menuCode, 'access');
      const page = await tx.sysPageResource.upsert({ where: { applicationId_pageCode: { applicationId: app.id, pageCode: candidate.menuCode } }, update: {}, create: { tenantId: app.tenantId, applicationId: app.id, parentId: parentResource.id, pageCode: candidate.menuCode, pageName: candidate.menuName ?? candidate.menuCode, pageType: candidate.nodeType === 'GROUP' ? 'MODULE' : 'PAGE', routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'table', sortNo: candidate.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id } });
      const menu = await tx.uiMenu.upsert({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: candidate.menuCode } }, update: {}, create: { applicationId: app.id, accessPermissionId: access.id, pageResourceId: page.id, parentId: parentMenu?.id ?? null, systemCode: app.applicationCode, menuCode: candidate.menuCode, menuName: candidate.menuName ?? candidate.menuCode, nodeType: candidate.nodeType, menuType: candidate.nodeType === 'GROUP' ? 'DIRECTORY' : 'PAGE', routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'table', sortNo: candidate.sortNo ?? 0 } });
      for (const role of await tx.iamRole.findMany({ where: { applicationId: app.id, status: 'ACTIVE', OR: [{ isSystem: true }, { roleCode: 'viewer' }] } })) await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: access.id } }, update: {}, create: { applicationId: app.id, roleId: role.id, permissionId: access.id } });
      if (candidate.nodeType !== 'PAGE') continue;
      for (const action of seedDefinition.actions.filter((row) => row.menuCode === candidate.menuCode)) {
        const grant = await permission(`menu.${candidate.menuCode}.${action.actionCode}`, action.actionName ?? action.actionCode, candidate.menuCode, action.actionCode);
        await tx.uiMenuAction.upsert({ where: { menuId_actionCode: { menuId: menu.id, actionCode: action.actionCode } }, update: {}, create: { menuId: menu.id, permissionId: grant.id, actionCode: action.actionCode, actionName: action.actionName ?? action.actionCode, actionType: action.actionType ?? 'CUSTOM', sortNo: action.sortNo ?? 0 } });
        await tx.sysPageButton.upsert({ where: { pageId_buttonCode: { pageId: page.id, buttonCode: action.actionCode } }, update: {}, create: { pageId: page.id, buttonCode: action.actionCode, buttonName: action.actionName ?? action.actionCode, buttonType: 'TOOL', sortNo: action.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id } });
        const roles = await tx.iamRole.findMany({ where: { applicationId: app.id, status: 'ACTIVE', ...(action.actionCode === 'view' ? { OR: [{ isSystem: true }, { roleCode: 'viewer' }] } : { isSystem: true }) } });
        for (const role of roles) await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: grant.id } }, update: {}, create: { applicationId: app.id, roleId: role.id, permissionId: grant.id } });
      }
    }
  });
  console.log('Sales prototype menu resources initialized.');
}
main().finally(() => db.$disconnect());
