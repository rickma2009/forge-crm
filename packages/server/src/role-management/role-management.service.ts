import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { roleWriteSchema, roleUpdateSchema } from '@interaction-pattern-lab/contracts';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import type { IamRole, Prisma } from '../generated/prisma/client';
import { assertRoleParent, assertRolePeriod } from './role-tree';
import { roleViewAssignmentSchema } from './role-views';
import { resolveEffectiveRoleIds, assertRoleDelegation } from '../rbac/role-scope';

type TreeRow = Pick<IamRole, 'id' | 'parentId' | 'roleCode' | 'roleName' | 'roleAbbrName' | 'sortNo' | 'isEnabled' | 'isSystem' | 'description' | 'status' | 'version'> & {
  effectiveDateBegin: string | null; effectiveDateEnd: string | null; children: TreeRow[];
};
const moveSchema = z.strictObject({ version: z.number().int().positive(), targetId: z.string().uuid(), position: z.enum(['before', 'after', 'child']) });
const deleteSchema = z.strictObject({ version: z.number().int().positive() });

@Injectable()
export class RoleManagementService {
  constructor(private readonly db: DatabaseService) {}

  private async application(systemCode: string) {
    const app = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
    if (!app) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    return app;
  }

  async tree(systemCode: string) {
    const app = await this.application(systemCode);
    const rows = await this.db.iamRole.findMany({ where: { applicationId: app.id, tenantId: app.tenantId, archivedAt: null }, orderBy: [{ sortNo: 'asc' }, { roleCode: 'asc' }] });
    const build = (parentId: string | null, visited: Set<string>): TreeRow[] => rows.filter((r) => r.parentId === parentId).map((r) => {
      if (visited.has(r.id)) throw new ApiException('SERVICE_UNAVAILABLE', 503, '角色树结构异常，请联系管理员');
      const branch = new Set([...visited, r.id]);
      return { id: r.id, parentId: r.parentId, roleCode: r.roleCode, roleName: r.roleName, roleAbbrName: r.roleAbbrName, sortNo: r.sortNo, isEnabled: r.isEnabled && r.status === 'ACTIVE', isSystem: r.isSystem, description: r.description, status: r.status, version: r.version, effectiveDateBegin: r.effectiveDateBegin?.toISOString() ?? null, effectiveDateEnd: r.effectiveDateEnd?.toISOString() ?? null, children: build(r.id, branch) };
    });
    for (const row of rows) assertRoleParent(rows, row.id, row.parentId);
    return build(null, new Set());
  }

  async permissionCatalog(systemCode: string, actorUserId: string) {
    const app = await this.application(systemCode);
    const [pages, menus, buttons, permissions, roles] = await Promise.all([
      this.db.sysPageResource.findMany({ where: { applicationId: app.id, tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: [{ sortNo: 'asc' }, { pageCode: 'asc' }] }),
      this.db.uiMenu.findMany({ where: { applicationId: app.id, status: 'ACTIVE' }, include: { actions: { where: { status: 'ACTIVE' }, orderBy: { sortNo: 'asc' } } } }),
      this.db.sysPageButton.findMany({ where: { page: { applicationId: app.id, tenantId: app.tenantId, status: 'ACTIVE' }, status: 'ACTIVE' }, orderBy: [{ sortNo: 'asc' }, { buttonCode: 'asc' }] }),
      this.db.sysPermission.findMany({ where: { applicationId: app.id }, orderBy: { permissionCode: 'asc' } }),
      resolveEffectiveRoleIds(this.db, app.id, actorUserId),
    ]);
    const grants = await this.db.iamRolePermission.findMany({ where: { applicationId: app.id, roleId: { in: roles }, status: 'ACTIVE', permission: { status: 'ACTIVE' } }, select: { permissionId: true } });
    const ids = new Set(permissions.map((p) => p.id));
    return {
      pages: pages.map((page) => {
        const mounts = menus.filter((m) => m.pageResourceId === page.id);
        const actions = mounts.flatMap((m) => m.actions);
        const pageButtons = buttons.filter((b) => b.pageId === page.id);
        const actionRows = pageButtons.map((b) => ({ id: b.id, label: b.buttonName, permissionIds: [...new Set(actions.filter((a) => a.actionCode === b.buttonCode && a.permissionId && ids.has(a.permissionId)).map((a) => a.permissionId!))] }));
        for (const action of actions) if (action.permissionId && ids.has(action.permissionId) && !pageButtons.some((b) => b.buttonCode === action.actionCode)) actionRows.push({ id: action.id, label: action.actionName, permissionIds: [action.permissionId] });
        return { id: page.id, parentId: page.parentId, pageCode: page.pageCode, pageName: page.pageName, pageType: page.pageType, permissionIds: [...new Set(mounts.flatMap((m) => m.accessPermissionId && ids.has(m.accessPermissionId) ? [m.accessPermissionId] : []))], actions: actionRows };
      }),
      permissions: permissions.map((p) => ({ id: p.id, permissionCode: p.permissionCode, permissionName: p.permissionName, resourceCode: p.resourceCode, actionCode: p.actionCode, source: p.source, status: p.status })),
      grantablePermissionIds: [...new Set(grants.map((g) => g.permissionId))],
    };
  }

  async create(systemCode: string, actorUserId: string, raw: unknown, requestId = 'role-create') {
    const input = roleWriteSchema.parse(raw);
    const app = await this.application(systemCode);
    const begin = input.effectiveDateBegin ? new Date(input.effectiveDateBegin) : null;
    const end = input.effectiveDateEnd ? new Date(input.effectiveDateEnd) : null;
    assertRolePeriod(begin, end);
    try {
      return await this.db.$transaction(async (tx) => {
        const rows = await tx.iamRole.findMany({ where: { applicationId: app.id, tenantId: app.tenantId, archivedAt: null } });
        assertRoleParent(rows, null, input.parentId ?? null);
        const group = await tx.sysRoleGroup.findFirst({ where: { applicationId: app.id, status: 'ACTIVE' }, orderBy: { sortNo: 'asc' } });
        if (!group) throw new ApiException('BAD_REQUEST', 409, '当前应用尚未初始化角色组');
        const role = await tx.iamRole.create({ data: { systemCode, applicationId: app.id, tenantId: app.tenantId, roleGroupId: group.id, parentId: input.parentId ?? null, roleCode: input.roleCode, roleName: input.roleName, roleAbbrName: input.roleAbbrName ?? null, roleType: 'BUSINESS', sortNo: input.sortNo, isEnabled: input.isEnabled, effectiveDateBegin: begin, effectiveDateEnd: end, description: input.description ?? null } });
        await this.audit(tx, app, actorUserId, requestId, 'access.role.create', role.id, null, { roleCode: role.roleCode, roleName: role.roleName, parentId: role.parentId });
        return { id: role.id };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ApiException('BAD_REQUEST', 409, '角色编码已存在');
      throw error;
    }
  }

  async update(systemCode: string, id: string, actorUserId: string, raw: unknown, requestId = 'role-update') {
    const { version, ...input } = roleUpdateSchema.parse(raw);
    const app = await this.application(systemCode);
    return this.db.$transaction(async (tx) => {
      const before = await this.editable(tx, app.id, id, version);
      if (input.isEnabled === true || input.effectiveDateBegin !== undefined || input.effectiveDateEnd !== undefined) await assertRoleDelegation(tx, app.id, actorUserId, id);
      const rows = await tx.iamRole.findMany({ where: { applicationId: app.id, tenantId: app.tenantId, archivedAt: null } });
      const parentId = input.parentId === undefined ? before.parentId : input.parentId;
      assertRoleParent(rows, id, parentId);
      const begin = input.effectiveDateBegin === undefined ? before.effectiveDateBegin : input.effectiveDateBegin ? new Date(input.effectiveDateBegin) : null;
      const end = input.effectiveDateEnd === undefined ? before.effectiveDateEnd : input.effectiveDateEnd ? new Date(input.effectiveDateEnd) : null;
      assertRolePeriod(begin, end);
      const data = { ...input, parentId, effectiveDateBegin: begin, effectiveDateEnd: end, ...(input.isEnabled !== undefined ? { status: 'ACTIVE' as const } : {}), version: { increment: 1 } };
      const updated = await tx.iamRole.updateMany({ where: { id, applicationId: app.id, version, archivedAt: null }, data });
      if (!updated.count) throw new ApiException('BAD_REQUEST', 409, '角色已被其他人修改，请刷新');
      await this.audit(tx, app, actorUserId, requestId, 'access.role.update', id, { version, roleName: before.roleName, parentId: before.parentId, isEnabled: before.isEnabled }, { ...input, version: version + 1 });
      return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }

  async move(systemCode: string, id: string, actorUserId: string, raw: unknown, requestId: string) {
    const input = moveSchema.parse(raw);
    const app = await this.application(systemCode);
    return this.db.$transaction(async (tx) => {
      const source = await this.editable(tx, app.id, id, input.version);
      const rows = await tx.iamRole.findMany({ where: { applicationId: app.id, archivedAt: null }, orderBy: [{ sortNo: 'asc' }, { roleCode: 'asc' }] });
      const target = rows.find((r) => r.id === input.targetId);
      if (!target || target.id === id) throw new ApiException('BAD_REQUEST', 400, '请选择其他目标角色');
      const parentId = input.position === 'child' ? target.id : target.parentId;
      assertRoleParent(rows, id, parentId);
      const siblings = rows.filter((r) => r.parentId === parentId && r.id !== id);
      const index = input.position === 'child' ? siblings.length : siblings.findIndex((r) => r.id === target.id) + (input.position === 'after' ? 1 : 0);
      siblings.splice(index, 0, source);
      for (const [i, role] of siblings.entries()) {
        if (role.sortNo !== (i + 1) * 10 || role.id === id) await tx.iamRole.update({ where: { id: role.id }, data: { parentId, sortNo: (i + 1) * 10, version: { increment: 1 } } });
      }
      await this.audit(tx, app, actorUserId, requestId, 'access.role.move', id, { parentId: source.parentId, sortNo: source.sortNo }, { parentId, targetId: target.id, position: input.position });
      return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }

  async delete(systemCode: string, id: string, actorUserId: string, raw: unknown, requestId = 'role-archive') {
    const { version } = deleteSchema.parse(raw);
    const app = await this.application(systemCode);
    return this.db.$transaction(async (tx) => {
      await this.editable(tx, app.id, id, version);
      const now = new Date();
      const [children, members, grants, views, subjects, policies] = await Promise.all([
        tx.iamRole.count({ where: { parentId: id, applicationId: app.id, archivedAt: null } }),
        tx.iamRoleUser.count({ where: { roleId: id, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
        tx.iamRolePermission.count({ where: { roleId: id, status: 'ACTIVE' } }),
        tx.iamRoleListView.count({ where: { roleId: id, status: 'ACTIVE' } }),
        tx.sysRoleSubjectBinding.count({ where: { roleId: id, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
        tx.sysRoleDataPolicy.count({ where: { roleId: id } }),
      ]);
      if (children || members || grants || views || subjects || policies) throw new ApiException('BAD_REQUEST', 409, '角色仍有子角色、有效成员、动态绑定、数据策略、权限或视图引用，请先处理引用；也可停用角色');
      await tx.iamRole.update({ where: { id }, data: { archivedAt: now, isEnabled: false, status: 'DISABLED', version: { increment: 1 } } });
      await this.audit(tx, app, actorUserId, requestId, 'access.role.archive', id, { version }, { archivedAt: now.toISOString(), version: version + 1 });
      return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }

  async views(systemCode: string, roleId: string, actorUserId: string) {
    const app = await this.application(systemCode);
    const role = await this.db.iamRole.findFirst({ where: { id: roleId, applicationId: app.id, archivedAt: null } });
    if (!role) throw new ApiException('NOT_FOUND', 404, '角色不存在');
    const now = new Date();
    const items = await this.db.uiSystemListView.findMany({ where: { systemCode, applicationId: app.id }, include: { roleAssignments: { where: { status: 'ACTIVE' } } }, orderBy: [{ pageCode: 'asc' }, { priority: 'asc' }, { id: 'asc' }] });
    const actorIds = new Set(await resolveEffectiveRoleIds(this.db, app.id, actorUserId, now));
    return { version: role.version, items: items.map((view) => ({ id: view.id, viewName: view.viewName, pageCode: view.pageCode, actionCode: view.actionCode, status: view.status, config: view.config, assigned: view.roleAssignments.some((a) => a.roleId === roleId), grantable: view.status === 'ACTIVE' && view.roleAssignments.some((a) => actorIds.has(a.roleId)) })) };
  }

  async saveViews(systemCode: string, roleId: string, actorUserId: string, raw: unknown, requestId: string) {
    const input = roleViewAssignmentSchema.parse(raw);
    const app = await this.application(systemCode);
    return this.db.$transaction(async (tx) => {
      await this.editable(tx, app.id, roleId, input.version);
      const now = new Date();
      const actorRoleIds = await resolveEffectiveRoleIds(tx, app.id, actorUserId, now);
      const permitted = await tx.uiSystemListView.findMany({
        where: {
          id: { in: input.viewIds }, applicationId: app.id, systemCode, status: 'ACTIVE',
          roleAssignments: { some: {
            status: 'ACTIVE',
            roleId: { in: actorRoleIds },
          } },
        },
      });
      if (permitted.length !== input.viewIds.length) throw new ApiException('FORBIDDEN', 403, '包含无效、跨系统或超出可委派范围的视图');
      const before = await tx.iamRoleListView.findMany({ where: { roleId, status: 'ACTIVE' } });
      await tx.iamRoleListView.updateMany({ where: { roleId }, data: { status: 'DISABLED' } });
      for (const viewId of input.viewIds) await tx.iamRoleListView.upsert({ where: { roleId_viewId: { roleId, viewId } }, create: { roleId, viewId }, update: { status: 'ACTIVE' } });
      await tx.iamRole.update({ where: { id: roleId }, data: { version: { increment: 1 } } });
      await this.audit(tx, app, actorUserId, requestId, 'access.role.view.assign', roleId, { viewIds: before.map((a) => a.viewId) }, { viewIds: input.viewIds, version: input.version + 1 });
      return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }

  private async editable(tx: Prisma.TransactionClient, applicationId: string, id: string, version: number) {
    const role = await tx.iamRole.findFirst({ where: { id, applicationId, archivedAt: null } });
    if (!role) throw new ApiException('NOT_FOUND', 404, '角色不存在');
    if (role.isSystem) throw new ApiException('BAD_REQUEST', 409, '系统内置角色受保护，不可修改、移动或删除');
    if (role.version !== version) throw new ApiException('BAD_REQUEST', 409, '角色已被其他人修改，请刷新');
    return role;
  }

  private async audit(tx: Prisma.TransactionClient, app: { id: string; tenantId: string }, actorUserId: string, requestId: string, actionCode: string, resourceId: string, before: Prisma.InputJsonObject | null, after: Prisma.InputJsonObject) {
    await tx.sysAuditLog.create({ data: { tenantId: app.tenantId, applicationId: app.id, actorUserId, requestId, actionCode, resourceType: 'role', resourceId, ...(before ? { beforeSnapshot: before } : {}), afterSnapshot: after } });
  }
}
