/** Additive initialization only: never reset passwords, existing roles or business data. */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedDefinition } from '../prisma/seed-data';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const apps = await db.sysApplication.findMany({ where: { status: 'ACTIVE', applicationCode: 'demo-portal' } });
  for (const app of apps) await db.$transaction(async (tx) => {
    const actor = await tx.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    const parent = await tx.uiMenu.findUniqueOrThrow({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: 'opportunity-management' } } });
    if (!parent.pageResourceId) throw new Error('QUOTATION_PARENT_RESOURCE_MISSING');
    const permission = async (permissionCode: string, permissionName: string, resourceCode: string, actionCode: string) => tx.sysPermission.upsert({ where: { applicationId_permissionCode: { applicationId: app.id, permissionCode } }, update: {}, create: { applicationId: app.id, permissionCode, permissionName, resourceCode, actionCode, source: 'SYSTEM' } });
    const access = await permission('navigation.quotation-directory.access', '访问报价管理', 'quotation-directory', 'access');
    const page = await tx.sysPageResource.upsert({ where: { applicationId_pageCode: { applicationId: app.id, pageCode: 'quotation-directory' } }, update: {}, create: { tenantId: app.tenantId, applicationId: app.id, parentId: parent.pageResourceId, pageCode: 'quotation-directory', pageName: '报价管理', pageType: 'PAGE', routePath: '/showcase/quotations', iconKey: 'table', sortNo: 15, createdBy: actor.id, updatedBy: actor.id } });
    const menu = await tx.uiMenu.upsert({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: 'quotation-directory' } }, update: {}, create: { applicationId: app.id, accessPermissionId: access.id, pageResourceId: page.id, parentId: parent.id, systemCode: app.applicationCode, menuCode: 'quotation-directory', menuName: '报价管理', nodeType: 'PAGE', menuType: 'PAGE', routePath: '/showcase/quotations', iconKey: 'table', sortNo: 15 } });
    const permissionIds = [access.id];
    const actions = seedDefinition.actions.filter((a) => a.systemCode === app.applicationCode && (a.menuCode === 'quotation-directory' || (a.menuCode === 'item-directory' && a.actionCode.startsWith('price-'))));
    for (const action of actions) {
      const target = action.menuCode === 'quotation-directory' ? menu : await tx.uiMenu.findUniqueOrThrow({ where: { systemCode_menuCode: { systemCode: app.applicationCode, menuCode: action.menuCode } } });
      if (!target.pageResourceId) throw new Error('QUOTATION_PRODUCT_RESOURCE_MISSING');
      const p = await permission(`menu.${action.menuCode}.${action.actionCode}`, action.actionName ?? action.actionCode, action.menuCode, action.actionCode); permissionIds.push(p.id);
      await tx.uiMenuAction.upsert({ where: { menuId_actionCode: { menuId: target.id, actionCode: action.actionCode } }, update: {}, create: { menuId: target.id, permissionId: p.id, actionCode: action.actionCode, actionName: action.actionName ?? action.actionCode, actionType: action.actionType ?? 'CUSTOM', sortNo: action.sortNo ?? 0 } });
      await tx.sysPageButton.upsert({ where: { pageId_buttonCode: { pageId: target.pageResourceId, buttonCode: action.actionCode } }, update: {}, create: { pageId: target.pageResourceId, buttonCode: action.actionCode, buttonName: action.actionName ?? action.actionCode, buttonType: 'TOOL', sortNo: action.sortNo ?? 0, createdBy: actor.id, updatedBy: actor.id } });
    }
    const roles = await tx.iamRole.findMany({ where: { applicationId: app.id, isSystem: true, status: 'ACTIVE' } });
    for (const role of roles) for (const permissionId of permissionIds) await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId } }, update: {}, create: { applicationId: app.id, roleId: role.id, permissionId } });
    await tx.sysDictionary.upsert({ where: { systemCode_dictCode: { systemCode: app.applicationCode, dictCode: 'product_line' } }, update: {}, create: { systemCode: app.applicationCode, dictCode: 'product_line', dictName: '产品线', groupCode: 'product', description: '产品可报价条件；存量自由文本须人工映射，不自动生成字典项', createdBy: actor.id, updatedBy: actor.id } });
    console.log(`Quotation resources initialized for ${app.applicationCode}; existing data preserved.`);
  });
}
main().finally(() => db.$disconnect());
