import { HttpStatus, Injectable } from '@nestjs/common';
import { navigationMountWriteSchema, resourceButtonWriteSchema, resourcePageUpdateSchema, resourcePageWriteSchema, resourceTabWriteSchema, resourceTreeMoveSchema } from '@forge-crm/contracts';
import { z } from 'zod';
import type { Prisma, SysPageButton, SysPageResource, SysPageTab } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

const versionSchema = z.strictObject({ version: z.number().int().positive() });
const resourceButtonUpdateSchema = resourceButtonWriteSchema.partial().extend({ version: z.number().int().positive() });
const resourceTabUpdateSchema = resourceTabWriteSchema.partial().extend({ version: z.number().int().positive() });
const sqlString = (value: string | null | undefined) => value == null ? 'NULL' : `'${value.replaceAll("'", "''")}'`;

@Injectable()
export class ResourceMenuService {
  constructor(private readonly db: DatabaseService) {}

  private async application(systemCode: string) {
    const application = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
    if (!application) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '系统不存在');
    return application;
  }
  private pageDto(page: SysPageResource) {
    return {
      id: page.id, pageCode: page.pageCode, pageName: page.pageName, pageType: page.pageType,
      parentId: page.parentId, routePath: page.routePath, iconKey: page.iconKey,
      permissionMode: page.permissionMode, status: page.status, autoAddMenu: page.autoAddMenu,
      viewConfigEnabled: page.viewConfigEnabled, groupManageEnabled: page.groupManageEnabled,
      dataPermissionEnabled: page.dataPermissionEnabled, sortNo: page.sortNo, remark: page.remark,
      version: page.version, createdAt: page.createdAt.toISOString(), updatedAt: page.updatedAt.toISOString(),
    };
  }
  private buttonDto(button: SysPageButton) {
    return {
      id: button.id, pageId: button.pageId, buttonCode: button.buttonCode, buttonName: button.buttonName,
      buttonType: button.buttonType, iconKey: button.iconKey, eventName: button.eventName,
      sortNo: button.sortNo, status: button.status, remark: button.remark, version: button.version,
    };
  }
  private tabDto(tab: SysPageTab) {
    return {
      id: tab.id, pageId: tab.pageId, targetPageId: tab.targetPageId, tabName: tab.tabName,
      sortNo: tab.sortNo, status: tab.status, remark: tab.remark, version: tab.version,
    };
  }
  private async audit(tx: Prisma.TransactionClient, application: { id: string; tenantId: string }, actorUserId: string, requestId: string, actionCode: string, resourceType: string, resourceId: string, beforeSnapshot?: object, afterSnapshot?: object) {
    await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode, resourceType, resourceId, beforeSnapshot, afterSnapshot, requestId } });
  }
  private async assertPage(applicationId: string, pageId: string) {
    const page = await this.db.sysPageResource.findFirst({ where: { id: pageId, applicationId } });
    if (!page) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '页面资源不存在');
    return page;
  }

  async listPages(systemCode: string) { const app = await this.application(systemCode); const pages = await this.db.sysPageResource.findMany({ where: { applicationId: app.id, status: 'ACTIVE' }, orderBy: [{ sortNo: 'asc' }, { pageCode: 'asc' }] }); return pages.map((page) => this.pageDto(page)); }

  async createPage(systemCode: string, actorUserId: string, requestId: string, raw: unknown) {
    const app = await this.application(systemCode); const input = resourcePageWriteSchema.parse(raw);
    if (input.parentId) await this.assertPage(app.id, input.parentId);
    try { return await this.db.$transaction(async (tx) => {
      const page = await tx.sysPageResource.create({ data: { tenantId: app.tenantId, applicationId: app.id, ...input, createdBy: actorUserId, updatedBy: actorUserId } });
      if (input.autoAddMenu && ['MODULE', 'PAGE'].includes(input.pageType)) await this.publishMount(tx, app, systemCode, actorUserId, page);
      await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'page-resource', page.id, undefined, { pageCode: page.pageCode, pageName: page.pageName });
      return this.pageDto(page);
    }); } catch (error) { if (error instanceof ApiException) throw error; throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '页面编码、路由或菜单编码已存在'); }
  }

  async updatePage(systemCode: string, pageId: string, actorUserId: string, requestId: string, raw: unknown) {
    const app = await this.application(systemCode); const input = resourcePageUpdateSchema.parse(raw); const { version, ...data } = input;
    const before = await this.assertPage(app.id, pageId); if (before.pageType === 'SYSTEM' && data.parentId) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '系统根节点不能设置上级');
    if (data.parentId) await this.assertMove(app.id, pageId, data.parentId);
    return this.db.$transaction(async (tx) => {
      const changed = await tx.sysPageResource.updateMany({ where: { id: pageId, applicationId: app.id, version }, data: { ...data, updatedBy: actorUserId, version: { increment: 1 } } });
      if (!changed.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '页面资源已被其他人修改');
      const after = await tx.sysPageResource.findUniqueOrThrow({ where: { id: pageId } });
      await tx.uiMenu.updateMany({ where: { pageResourceId: pageId, applicationId: app.id }, data: { menuName: after.pageName, routePath: after.routePath, iconKey: after.iconKey, sortNo: after.sortNo, status: after.status, version: { increment: 1 } } });
      await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'page-resource', pageId, { pageName: before.pageName, version: before.version }, { pageName: after.pageName, version: after.version });
      return this.pageDto(after);
    });
  }

  async disablePage(systemCode: string, pageId: string, actorUserId: string, requestId: string, raw: unknown) {
    const app = await this.application(systemCode); const { version } = versionSchema.parse(raw); const root = await this.assertPage(app.id, pageId);
    if (root.pageType === 'SYSTEM') throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '系统根节点不可删除');
    const pages = await this.db.sysPageResource.findMany({ where: { applicationId: app.id }, select: { id: true, parentId: true } }); const ids = [pageId];
    for (let index = 0; index < ids.length; index += 1) pages.filter((page) => page.parentId === ids[index] && !ids.includes(page.id)).forEach((page) => ids.push(page.id));
    await this.db.$transaction(async (tx) => {
      const changed = await tx.sysPageResource.updateMany({ where: { id: pageId, version }, data: { status: 'DISABLED', updatedBy: actorUserId, version: { increment: 1 } } });
      if (!changed.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '页面资源已被其他人修改');
      await tx.sysPageResource.updateMany({ where: { id: { in: ids.slice(1) } }, data: { status: 'DISABLED', updatedBy: actorUserId, version: { increment: 1 } } });
      await tx.uiMenu.updateMany({ where: { pageResourceId: { in: ids } }, data: { status: 'DISABLED', version: { increment: 1 } } });
      await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'page-resource', pageId, { status: root.status }, { status: 'DISABLED', descendantCount: ids.length - 1 });
    });
  }

  async movePage(systemCode: string, actorUserId: string, requestId: string, raw: unknown) {
    const app = await this.application(systemCode); const input = resourceTreeMoveSchema.parse(raw); const source = await this.assertPage(app.id, input.sourceId); const target = await this.assertPage(app.id, input.targetId);
    if (source.pageType === 'SYSTEM') throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '系统根节点不可移动');
    const parentId = input.position === 'child' ? target.id : target.parentId; if (parentId) await this.assertMove(app.id, source.id, parentId);
    const siblings = await this.db.sysPageResource.findMany({ where: { applicationId: app.id, parentId, id: { not: source.id } }, orderBy: [{ sortNo: 'asc' }, { pageCode: 'asc' }] });
    const at = input.position === 'child' ? siblings.length : siblings.findIndex((item) => item.id === target.id) + (input.position === 'after' ? 1 : 0); if (at < 0) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '拖拽目标无效');
    siblings.splice(at, 0, source); await this.db.$transaction(async (tx) => {
      for (let index = 0; index < siblings.length; index += 1) { const item = siblings[index]!; const changed = await tx.sysPageResource.updateMany({ where: { id: item.id, ...(item.id === source.id ? { version: input.version } : {}) }, data: { parentId, sortNo: (index + 1) * 10, updatedBy: actorUserId, version: { increment: 1 } } }); if (!changed.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '页面资源已被其他人修改'); }
      await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'page-resource', source.id, { parentId: source.parentId, sortNo: source.sortNo }, { parentId, position: input.position });
    });
  }

  private async assertMove(applicationId: string, sourceId: string, parentId: string) { if (sourceId === parentId) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '不能移动到自身或其子节点下'); const pages = await this.db.sysPageResource.findMany({ where: { applicationId }, select: { id: true, parentId: true } }); const map = new Map(pages.map((page) => [page.id, page.parentId])); let cursor: string | null = parentId; const visited = new Set<string>(); while (cursor) { if (cursor === sourceId) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '不能移动到自身或其子节点下'); if (visited.has(cursor)) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '页面树存在循环'); visited.add(cursor); cursor = map.get(cursor) ?? null; } }

  async listButtons(systemCode: string, pageId: string) { const app = await this.application(systemCode); await this.assertPage(app.id, pageId); const rows = await this.db.sysPageButton.findMany({ where: { pageId }, orderBy: [{ sortNo: 'asc' }, { buttonCode: 'asc' }] }); return { tool: rows.filter((row) => row.buttonType === 'TOOL').map((row) => this.buttonDto(row)), line: rows.filter((row) => row.buttonType === 'LINE').map((row) => this.buttonDto(row)) }; }
  async saveButton(systemCode: string, pageId: string, buttonId: string | undefined, actorUserId: string, requestId: string, raw: unknown) { const app = await this.application(systemCode); await this.assertPage(app.id, pageId); const input = buttonId ? resourceButtonUpdateSchema.parse(raw) : resourceButtonWriteSchema.parse(raw); const button = await this.db.$transaction(async (tx) => { let row; if (buttonId) { const { version, ...data } = input as z.infer<typeof resourceButtonWriteSchema> & { version: number }; const changed = await tx.sysPageButton.updateMany({ where: { id: buttonId, pageId, version }, data: { ...data, updatedBy: actorUserId, version: { increment: 1 } } }); if (!changed.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '按钮已被其他人修改'); row = await tx.sysPageButton.findUniqueOrThrow({ where: { id: buttonId } }); } else row = await tx.sysPageButton.create({ data: { ...(input as z.infer<typeof resourceButtonWriteSchema>), pageId, createdBy: actorUserId, updatedBy: actorUserId } }); await this.publishButton(tx, app, actorUserId, pageId, row); await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'page-button', row.id, undefined, { buttonCode: row.buttonCode }); return row; }); return this.buttonDto(button); }
  async deleteButton(systemCode: string, pageId: string, buttonId: string, actorUserId: string, requestId: string, raw: unknown) { const app = await this.application(systemCode); await this.assertPage(app.id, pageId); const { version } = versionSchema.parse(raw); await this.db.$transaction(async (tx) => { const changed = await tx.sysPageButton.updateMany({ where: { id: buttonId, pageId, version }, data: { status: 'DISABLED', updatedBy: actorUserId, version: { increment: 1 } } }); if (!changed.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '按钮已被其他人修改'); const button = await tx.sysPageButton.findUniqueOrThrow({ where: { id: buttonId } }); await tx.uiMenuAction.updateMany({ where: { menu: { pageResourceId: pageId }, actionCode: button.buttonCode }, data: { status: 'DISABLED', version: { increment: 1 } } }); await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'page-button', buttonId, undefined, { status: 'DISABLED' }); }); }

  async listTabs(systemCode: string, pageId: string) { const app = await this.application(systemCode); await this.assertPage(app.id, pageId); const rows = await this.db.sysPageTab.findMany({ where: { pageId }, orderBy: [{ sortNo: 'asc' }, { tabName: 'asc' }] }); return rows.map((row) => this.tabDto(row)); }
  async saveTab(systemCode: string, pageId: string, tabId: string | undefined, actorUserId: string, requestId: string, raw: unknown) { const app = await this.application(systemCode); await this.assertPage(app.id, pageId); const input = tabId ? resourceTabUpdateSchema.parse(raw) : resourceTabWriteSchema.parse(raw); const targetId = input.targetPageId; if (targetId) { if (targetId === pageId) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '页签不能关联自身'); await this.assertPage(app.id, targetId); } const tab = await this.db.$transaction(async (tx) => { let row; if (tabId) { const { version, ...data } = input as z.infer<typeof resourceTabWriteSchema> & { version: number }; const changed = await tx.sysPageTab.updateMany({ where: { id: tabId, pageId, applicationId: app.id, version }, data: { ...data, updatedBy: actorUserId, version: { increment: 1 } } }); if (!changed.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '页签已被其他人修改'); row = await tx.sysPageTab.findUniqueOrThrow({ where: { id: tabId } }); } else row = await tx.sysPageTab.create({ data: { ...(input as z.infer<typeof resourceTabWriteSchema>), applicationId: app.id, pageId, createdBy: actorUserId, updatedBy: actorUserId } }); await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'page-tab', row.id, undefined, { tabName: row.tabName }); return row; }); return this.tabDto(tab); }
  async deleteTab(systemCode: string, pageId: string, tabId: string, actorUserId: string, requestId: string, raw: unknown) { const app = await this.application(systemCode); await this.assertPage(app.id, pageId); const { version } = versionSchema.parse(raw); await this.db.$transaction(async (tx) => { const changed = await tx.sysPageTab.updateMany({ where: { id: tabId, pageId, version }, data: { status: 'DISABLED', updatedBy: actorUserId, version: { increment: 1 } } }); if (!changed.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '页签已被其他人修改'); await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'page-tab', tabId, undefined, { status: 'DISABLED' }); }); }

  async listMounts(systemCode: string) { const app = await this.application(systemCode); return this.db.uiMenu.findMany({ where: { applicationId: app.id }, select: { id: true, pageResourceId: true, parentId: true, menuCode: true, menuName: true, menuType: true, openType: true, autoAdd: true, status: true, sortNo: true, remark: true, routePath: true, iconKey: true, version: true }, orderBy: [{ sortNo: 'asc' }, { menuCode: 'asc' }] }); }
  async saveMounts(systemCode: string, actorUserId: string, requestId: string, raw: unknown) {
    const app = await this.application(systemCode);
    const inputs = z.array(navigationMountWriteSchema).max(1000).parse(raw);
    const pages = await this.db.sysPageResource.findMany({ where: { applicationId: app.id }, select: { id: true, pageCode: true, pageName: true, pageType: true, parentId: true, routePath: true, iconKey: true } });
    const pageMap = new Map(pages.map((page) => [page.id, page]));
    const existingIds = new Set(inputs.flatMap((item) => item.id ? [item.id] : []));
    const parentMap = new Map(inputs.flatMap((item) => item.id ? [[item.id, item.parentId ?? null] as const] : []));
    for (const item of inputs) {
      if (!pageMap.has(item.pageResourceId)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '左菜单关联页面不存在');
      if (item.parentId && (!existingIds.has(item.parentId) || item.parentId === item.id)) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '上级菜单无效');
      let cursor = item.parentId ?? null;
      const visited = new Set<string>();
      while (cursor) {
        if (cursor === item.id || visited.has(cursor)) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '左菜单不能形成循环');
        visited.add(cursor);
        cursor = parentMap.get(cursor) ?? null;
      }
    }
    await this.db.$transaction(async (tx) => {
      const existing = await tx.uiMenu.findMany({ where: { applicationId: app.id } });
      await tx.uiMenu.updateMany({ where: { applicationId: app.id, id: { notIn: [...existingIds] } }, data: { status: 'DISABLED', version: { increment: 1 } } });
      for (const item of inputs) {
        const page = pageMap.get(item.pageResourceId)!;
        const data = { parentId: item.parentId ?? null, menuName: item.menuName, menuType: item.menuType, openType: item.openType, autoAdd: item.autoAdd, status: item.status, sortNo: item.sortNo, remark: item.remark, routePath: page.routePath, iconKey: page.iconKey, nodeType: item.menuType === 'DIRECTORY' ? 'GROUP' as const : 'PAGE' as const };
        if (item.id) {
          const changed = await tx.uiMenu.updateMany({ where: { id: item.id, applicationId: app.id, ...(item.version ? { version: item.version } : {}) }, data: { ...data, version: { increment: 1 } } });
          if (!changed.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '左菜单已被其他人修改');
        } else {
          const created = await this.publishMount(tx, app, systemCode, actorUserId, { ...page, status: item.status, sortNo: item.sortNo });
          await tx.uiMenu.update({ where: { id: created.id }, data });
        }
      }
      await this.audit(tx, app, actorUserId, requestId, 'access.resource-menu.manage', 'navigation-mount', app.id, { count: existing.length }, { count: inputs.length });
    });
    return this.listMounts(systemCode);
  }

  async exportSql(systemCode: string, rootId?: string) { const app = await this.application(systemCode); const pages = await this.db.sysPageResource.findMany({ where: { applicationId: app.id }, orderBy: [{ sortNo: 'asc' }, { pageCode: 'asc' }] }); let selected = pages; if (rootId) { const ids = [rootId]; for (let i = 0; i < ids.length; i += 1) pages.filter((page) => page.parentId === ids[i] && !ids.includes(page.id)).forEach((page) => ids.push(page.id)); selected = pages.filter((page) => ids.includes(page.id)); } return ['-- Resource menu export; generated from sys_page_resource', ...selected.map((page) => `INSERT INTO sys_page_resource (id,tenant_id,application_id,page_code,page_name,parent_id,page_type,route_path,icon_key,permission_mode,is_auto_add_menu,is_view_config_enabled,is_group_manage_enabled,is_data_permission_enabled,sort_no,status,remark,version,created_by,updated_by,created_at,updated_at) VALUES (${sqlString(page.id)},${sqlString(page.tenantId)},${sqlString(page.applicationId)},${sqlString(page.pageCode)},${sqlString(page.pageName)},${sqlString(page.parentId)},${sqlString(page.pageType)},${sqlString(page.routePath)},${sqlString(page.iconKey)},${sqlString(page.permissionMode)},${page.autoAddMenu},${page.viewConfigEnabled},${page.groupManageEnabled},${page.dataPermissionEnabled},${page.sortNo},${sqlString(page.status)},${sqlString(page.remark)},${page.version},${sqlString(page.createdBy)},${sqlString(page.updatedBy)},${sqlString(page.createdAt.toISOString())},${sqlString(page.updatedAt.toISOString())}) ON CONFLICT (application_id,page_code) DO UPDATE SET page_name=EXCLUDED.page_name,parent_id=EXCLUDED.parent_id,page_type=EXCLUDED.page_type,route_path=EXCLUDED.route_path,icon_key=EXCLUDED.icon_key,sort_no=EXCLUDED.sort_no,status=EXCLUDED.status,remark=EXCLUDED.remark;`)].join('\n'); }

  private async publishMount(tx: Prisma.TransactionClient, app: { id: string; tenantId: string }, systemCode: string, actorUserId: string, page: { id: string; pageCode: string; pageName: string; pageType: string; parentId: string | null; routePath: string | null; iconKey: string; sortNo: number; status: 'ACTIVE' | 'DISABLED' }) {
    const menuCode = page.pageCode.replace(/[._]/g, '-').slice(0, 64);
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(menuCode)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '页面编码无法生成稳定菜单编码');
    const permission = await tx.sysPermission.upsert({ where: { applicationId_permissionCode: { applicationId: app.id, permissionCode: `navigation.${menuCode}.access` } }, update: { permissionName: `访问${page.pageName}`, resourceCode: menuCode, status: 'ACTIVE', version: { increment: 1 } }, create: { applicationId: app.id, permissionCode: `navigation.${menuCode}.access`, permissionName: `访问${page.pageName}`, resourceCode: menuCode, actionCode: 'access' } });
    const parent = page.parentId ? await tx.uiMenu.findFirst({ where: { applicationId: app.id, pageResourceId: page.parentId } }) : null;
    const menu = await tx.uiMenu.upsert({ where: { systemCode_menuCode: { systemCode, menuCode } }, update: { applicationId: app.id, accessPermissionId: permission.id, pageResourceId: page.id, menuName: page.pageName, nodeType: page.pageType === 'MODULE' ? 'GROUP' : 'PAGE', parentId: parent?.id ?? null, routePath: page.pageType === 'MODULE' ? null : page.routePath, iconKey: page.iconKey, sortNo: page.sortNo, menuType: page.pageType === 'MODULE' ? 'DIRECTORY' : 'PAGE', status: page.status, version: { increment: 1 } }, create: { systemCode, applicationId: app.id, accessPermissionId: permission.id, pageResourceId: page.id, menuCode, menuName: page.pageName, nodeType: page.pageType === 'MODULE' ? 'GROUP' : 'PAGE', parentId: parent?.id ?? null, routePath: page.pageType === 'MODULE' ? null : page.routePath, iconKey: page.iconKey, sortNo: page.sortNo, menuType: page.pageType === 'MODULE' ? 'DIRECTORY' : 'PAGE', status: page.status } });
    const roles = await tx.iamRole.findMany({ where: { applicationId: app.id, isSystem: true, status: 'ACTIVE' } });
    for (const role of roles) await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: { status: 'ACTIVE', revokedAt: null, revokedBy: null, version: { increment: 1 } }, create: { roleId: role.id, applicationId: app.id, permissionId: permission.id, grantedBy: actorUserId } });
    return menu;
  }
  private async publishButton(tx: Prisma.TransactionClient, app: { id: string }, actorUserId: string, pageId: string, button: { buttonCode: string; buttonName: string; buttonType: string; sortNo: number; status: 'ACTIVE' | 'DISABLED' }) {
    const menu = await tx.uiMenu.findFirst({ where: { applicationId: app.id, pageResourceId: pageId } });
    if (!menu) return;
    const permissionCode = `menu.${menu.menuCode}.${button.buttonCode}`;
    const permission = await tx.sysPermission.upsert({ where: { applicationId_permissionCode: { applicationId: app.id, permissionCode } }, update: { permissionName: button.buttonName, resourceCode: menu.menuCode, actionCode: button.buttonCode, status: button.status, version: { increment: 1 } }, create: { applicationId: app.id, permissionCode, permissionName: button.buttonName, resourceCode: menu.menuCode, actionCode: button.buttonCode } });
    await tx.uiMenuAction.upsert({ where: { menuId_actionCode: { menuId: menu.id, actionCode: button.buttonCode } }, update: { permissionId: permission.id, actionName: button.buttonName, actionType: button.buttonType, sortNo: button.sortNo, status: button.status, version: { increment: 1 } }, create: { menuId: menu.id, permissionId: permission.id, actionCode: button.buttonCode, actionName: button.buttonName, actionType: button.buttonType, sortNo: button.sortNo, status: button.status } });
    const roles = await tx.iamRole.findMany({ where: { applicationId: app.id, isSystem: true, status: 'ACTIVE' } });
    for (const role of roles) await tx.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: { status: 'ACTIVE', revokedAt: null, revokedBy: null, version: { increment: 1 } }, create: { roleId: role.id, applicationId: app.id, permissionId: permission.id, grantedBy: actorUserId } });
  }
}
