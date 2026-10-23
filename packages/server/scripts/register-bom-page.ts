/** Reconcile only the new BOM page and its permissions; preserve existing accounts and configuration. */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { businessListDefaultConfig } from '@forge-crm/contracts';

loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } });
  const admin = await db.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, normalizedAccount: 'admin' } });
  const group = await db.uiMenu.findFirstOrThrow({ where: { systemCode: 'demo-portal', menuCode: 'basic-info' } });
  const parentPage = await db.sysPageResource.findFirstOrThrow({ where: { applicationId: app.id, pageCode: 'basic-info' } });
  await db.$transaction(async (tx) => {
    const resource = await tx.sysPageResource.upsert({ where: { applicationId_pageCode: { applicationId: app.id, pageCode: 'bom-directory' } }, update: { parentId: parentPage.id, pageName: 'BOM管理', routePath: '/showcase/boms', iconKey: 'table', status: 'ACTIVE', updatedBy: admin.id }, create: { tenantId: app.tenantId, applicationId: app.id, parentId: parentPage.id, pageCode: 'bom-directory', pageName: 'BOM管理', pageType: 'PAGE', routePath: '/showcase/boms', iconKey: 'table', sortNo: 25, createdBy: admin.id, updatedBy: admin.id } });
    const permission = async (action: string, name: string, prefix: 'navigation' | 'menu') => tx.sysPermission.upsert({ where: { applicationId_permissionCode: { applicationId: app.id, permissionCode: `${prefix}.bom-directory.${action}` } }, update: { permissionName: name, status: 'ACTIVE' }, create: { applicationId: app.id, permissionCode: `${prefix}.bom-directory.${action}`, permissionName: name, resourceCode: 'bom-directory', actionCode: action, source: 'SYSTEM' } });
    const access = await permission('access', '访问BOM管理', 'navigation');
    const menu = await tx.uiMenu.upsert({ where: { systemCode_menuCode: { systemCode: 'demo-portal', menuCode: 'bom-directory' } }, update: { parentId: group.id, accessPermissionId: access.id, pageResourceId: resource.id, routePath: '/showcase/boms', status: 'ACTIVE' }, create: { applicationId: app.id, accessPermissionId: access.id, pageResourceId: resource.id, systemCode: 'demo-portal', menuCode: 'bom-directory', menuName: 'BOM管理', nodeType: 'PAGE', parentId: group.id, routePath: '/showcase/boms', iconKey: 'table', sortNo: 25, menuType: 'PAGE' } });
    const roles = await tx.iamRole.findMany({ where: { systemCode: 'demo-portal', roleCode: { in: ['system-manager', 'viewer'] } } });
    const grant = async (roleCode: string, permissionId: string) => { const role = roles.find((entry) => entry.roleCode === roleCode); if (!role) return; await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId } }, update: { status: 'ACTIVE', revokedAt: null, revokedBy: null }, create: { applicationId: app.id, roleId: role.id, permissionId } }); };
    await grant('system-manager', access.id); await grant('viewer', access.id);
    for (const [action, label, actionType, sortNo] of [['view', '查看BOM', 'VIEW', 10], ['create', '新增BOM', 'CREATE', 20], ['edit', '编辑BOM', 'UPDATE', 30], ['publish', '发布BOM', 'APPROVE', 40]] as const) {
      const allowed = await permission(action, label, 'menu');
      await tx.uiMenuAction.upsert({ where: { menuId_actionCode: { menuId: menu.id, actionCode: action } }, update: { permissionId: allowed.id, status: 'ACTIVE' }, create: { menuId: menu.id, permissionId: allowed.id, actionCode: action, actionName: label, actionType, sortNo } });
      await tx.sysPageButton.upsert({ where: { pageId_buttonCode: { pageId: resource.id, buttonCode: action } }, update: { status: 'ACTIVE', updatedBy: admin.id }, create: { pageId: resource.id, buttonCode: action, buttonName: label, buttonType: 'TOOL', sortNo, createdBy: admin.id, updatedBy: admin.id } });
      await grant('system-manager', allowed.id); if (action === 'view') await grant('viewer', allowed.id);
    }
    await tx.uiSystemListView.upsert({ where: { systemCode_pageCode_actionCode_viewCode: { systemCode: 'demo-portal', pageCode: 'bom-directory', actionCode: 'view', viewCode: 'object-default' } }, update: {}, create: { applicationId: app.id, systemCode: 'demo-portal', pageCode: 'bom-directory', actionCode: 'view', viewCode: 'object-default', viewName: 'BOM默认视图', isDefault: true, allowPersonalOverride: true, priority: 100, status: 'ACTIVE', config: businessListDefaultConfig('bom-directory'), createdBy: 'system:list-view-bootstrap', updatedBy: 'system:list-view-bootstrap' } });
  });
  console.log('BOM page, permissions and default list view ready');
}
main().finally(async () => db.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
