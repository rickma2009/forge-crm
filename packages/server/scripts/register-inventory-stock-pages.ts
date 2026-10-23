/** Additive menu registration. Does not reseed users, passwords or business records. */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedDefinition } from '../prisma/seed-data';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const codes = new Set(['current-inventory-directory', 'inventory-balance-directory']);

async function main() {
  const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal', status: 'ACTIVE' } });
  await db.$transaction(async (tx) => {
    const actor = await tx.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    const parent = await tx.sysPageResource.findUniqueOrThrow({ where: { applicationId_pageCode: { applicationId: app.id, pageCode: 'inventory-management' } } });
    const parentMenu = await tx.uiMenu.findUniqueOrThrow({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: 'inventory-management' } } });
    const roles = await tx.iamRole.findMany({ where: { applicationId: app.id, status: 'ACTIVE', OR: [{ isSystem: true }, { roleCode: 'viewer' }] } });
    // Vacate the existing /inventory-balances route before assigning it to the new page.
    for (const candidate of seedDefinition.menus.filter((row) => codes.has(row.menuCode)).sort((a, b) => a.menuCode === 'inventory-balance-directory' ? -1 : b.menuCode === 'inventory-balance-directory' ? 1 : 0)) {
      const permission = await tx.sysPermission.upsert({ where: { applicationId_permissionCode: { applicationId: app.id, permissionCode: `navigation.${candidate.menuCode}.access` } }, update: { permissionName: `访问${candidate.menuName}`, status: 'ACTIVE' }, create: { applicationId: app.id, permissionCode: `navigation.${candidate.menuCode}.access`, permissionName: `访问${candidate.menuName}`, resourceCode: candidate.menuCode, actionCode: 'access', source: 'SYSTEM' } });
      const page = await tx.sysPageResource.upsert({ where: { applicationId_pageCode: { applicationId: app.id, pageCode: candidate.menuCode } }, update: { pageName: candidate.menuName!, routePath: candidate.routePath, parentId: parent.id, sortNo: candidate.sortNo ?? 0, status: 'ACTIVE', updatedBy: actor.id }, create: { tenantId: app.tenantId, applicationId: app.id, parentId: parent.id, pageCode: candidate.menuCode, pageName: candidate.menuName!, pageType: 'PAGE', routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'list', sortNo: candidate.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id } });
      const menu = await tx.uiMenu.upsert({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: candidate.menuCode } }, update: { menuName: candidate.menuName!, routePath: candidate.routePath, parentId: parentMenu.id, sortNo: candidate.sortNo ?? 0, status: 'ACTIVE', pageResourceId: page.id, accessPermissionId: permission.id }, create: { applicationId: app.id, accessPermissionId: permission.id, pageResourceId: page.id, parentId: parentMenu.id, systemCode: app.applicationCode, menuCode: candidate.menuCode, menuName: candidate.menuName!, nodeType: 'PAGE', menuType: 'PAGE', routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'list', sortNo: candidate.sortNo ?? 0 } });
      for (const role of roles) await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { applicationId: app.id, roleId: role.id, permissionId: permission.id } });
      for (const action of seedDefinition.actions.filter((row) => row.menuCode === candidate.menuCode)) {
        const grant = await tx.sysPermission.upsert({ where: { applicationId_permissionCode: { applicationId: app.id, permissionCode: `menu.${candidate.menuCode}.${action.actionCode}` } }, update: { permissionName: action.actionName!, status: 'ACTIVE' }, create: { applicationId: app.id, permissionCode: `menu.${candidate.menuCode}.${action.actionCode}`, permissionName: action.actionName!, resourceCode: candidate.menuCode, actionCode: action.actionCode, source: 'SYSTEM' } });
        await tx.uiMenuAction.upsert({ where: { menuId_actionCode: { menuId: menu.id, actionCode: action.actionCode } }, update: { actionName: action.actionName!, status: 'ACTIVE', permissionId: grant.id }, create: { menuId: menu.id, permissionId: grant.id, actionCode: action.actionCode, actionName: action.actionName!, actionType: action.actionType ?? 'CUSTOM', sortNo: action.sortNo ?? 0 } });
        await tx.sysPageButton.upsert({ where: { pageId_buttonCode: { pageId: page.id, buttonCode: action.actionCode } }, update: { buttonName: action.actionName!, status: 'ACTIVE', updatedBy: actor.id }, create: { pageId: page.id, buttonCode: action.actionCode, buttonName: action.actionName!, buttonType: 'TOOL', sortNo: action.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id } });
        for (const role of roles.filter((row) => action.actionCode === 'view' || row.isSystem)) await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: grant.id } }, update: {}, create: { applicationId: app.id, roleId: role.id, permissionId: grant.id } });
      }
    }
    const old = await tx.uiMenu.findUnique({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: 'inventory-balance-directory' } } });
    if (old) await tx.uiMenuAction.updateMany({ where: { menuId: old.id, actionCode: 'export' }, data: { status: 'DISABLED' } });
  });
  console.log('Current inventory and inventory transaction menus registered.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
