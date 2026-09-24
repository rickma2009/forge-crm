import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { roleMembershipWriteSchema } from '@interaction-pattern-lab/contracts';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';
import { ApiException } from '../http/api-exceptions';
import { activePeriod, effectiveRoleWhere, resolveEffectiveRoleIds } from '../rbac/role-scope';

const kindSchema = z.enum(['organization', 'group']);
const endSchema = z.strictObject({ members: z.array(z.strictObject({ id: z.string().uuid(), version: z.number().int().positive() })).min(1).max(100) });
const periodSchema = z.strictObject({ userIds: z.array(z.string().uuid()).min(1).max(100), effectiveAt: z.string().datetime(), expiresAt: z.string().datetime().nullable() });

@Injectable()
export class RoleSubjectService {
  constructor(private readonly db: DatabaseService) {}
  private async app(code: string) {
    const app = await this.db.sysApplication.findFirst({ where: { applicationCode: code, status: 'ACTIVE' } });
    if (!app) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    return app;
  }
  private async admin(tx: Prisma.TransactionClient, appId: string, userId: string) {
    const now = new Date();
    if (!await tx.iamRole.findFirst({ where: { applicationId: appId, isSystem: true, ...effectiveRoleWhere(now), members: { some: { userId, ...activePeriod(now) } } } })) throw new ApiException('FORBIDDEN', 403, '动态授权来源需由本应用受保护管理员维护');
  }
  private async audit(tx: Prisma.TransactionClient, app: { id: string; tenantId: string }, actor: string, requestId: string, action: string, id: string, value: Prisma.InputJsonObject) {
    await tx.sysAuditLog.create({ data: { applicationId: app.id, tenantId: app.tenantId, actorUserId: actor, requestId, actionCode: action, resourceType: 'role-subject', resourceId: id, afterSnapshot: value } });
  }
  async catalog(code: string) {
    const app = await this.app(code); const now = new Date();
    const [organizations, groups] = await Promise.all([
      this.db.orgUnit.findMany({ where: { tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: [{ sortNo: 'asc' }, { id: 'asc' }], select: { id: true, parentId: true, unitCode: true, unitName: true, effectiveAt: true, expiresAt: true } }),
      this.db.sysUserGroup.findMany({ where: { applicationId: app.id, tenantId: app.tenantId }, include: { _count: { select: { members: { where: { ...activePeriod(now), user: { status: 'ACTIVE' } } } } } }, orderBy: [{ groupCode: 'asc' }, { id: 'asc' }] }),
    ]);
    return { organizations, groups: groups.map((g) => ({ id: g.id, groupCode: g.groupCode, groupName: g.groupName, description: g.description, status: g.status, version: g.version, memberCount: g._count.members })), admissionRule: '只有当前应用至少存在一个有效直接角色的账号，才能通过组织或群组追加权限；不会新增永久个人授权。' };
  }
  async saveGroup(code: string, actor: string, raw: unknown, requestId: string) {
    const input = z.strictObject({ id: z.string().uuid().optional(), version: z.number().int().positive().optional(), groupCode: z.string().regex(/^[a-z][a-z0-9.-]*$/).max(64), groupName: z.string().trim().min(1).max(128), description: z.string().max(500).nullable().default(null), status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE') }).parse(raw);
    const app = await this.app(code);
    return this.db.$transaction(async (tx) => {
      await this.admin(tx, app.id, actor);
      if (input.id) {
        const before = await tx.sysUserGroup.findFirst({ where: { id: input.id, applicationId: app.id, tenantId: app.tenantId } });
        if (!before) throw new ApiException('NOT_FOUND', 404, '群组不存在');
        if (before.version !== input.version || before.groupCode !== input.groupCode) throw new ApiException('BAD_REQUEST', 409, '群组已修改或试图修改稳定编码');
        const group = await tx.sysUserGroup.update({ where: { id: input.id }, data: { groupName: input.groupName, description: input.description, status: input.status, version: { increment: 1 }, updatedBy: actor } });
        await this.audit(tx, app, actor, requestId, 'authorization.group.update', group.id, { groupName: group.groupName, status: group.status, version: group.version }); return group;
      }
      if (await tx.sysUserGroup.findFirst({ where: { applicationId: app.id, groupCode: input.groupCode } })) throw new ApiException('BAD_REQUEST', 409, '群组编码已存在');
      const group = await tx.sysUserGroup.create({ data: { applicationId: app.id, tenantId: app.tenantId, groupCode: input.groupCode, groupName: input.groupName, description: input.description, status: input.status, createdBy: actor, updatedBy: actor } });
      await this.audit(tx, app, actor, requestId, 'authorization.group.create', group.id, { groupCode: group.groupCode }); return group;
    }, { isolationLevel: 'Serializable' });
  }
  private async source(tx: Prisma.TransactionClient, app: { id: string; tenantId: string }, kind: 'organization' | 'group', id: string) {
    const source = kind === 'organization' ? await tx.orgUnit.findFirst({ where: { id, tenantId: app.tenantId } }) : await tx.sysUserGroup.findFirst({ where: { id, applicationId: app.id, tenantId: app.tenantId } });
    if (!source) throw new ApiException('NOT_FOUND', 404, '来源不存在或不属于当前作用域');
    return source;
  }
  async members(code: string, kindRaw: string, sourceId: string) {
    const kind = kindSchema.parse(kindRaw); const app = await this.app(code);
    await this.source(this.db, app, kind, sourceId);
    const user = { select: { id: true, account: true, displayName: true, status: true } } as const;
    const rows = kind === 'organization' ? await this.db.orgUserAssignment.findMany({ where: { tenantId: app.tenantId, orgUnitId: sourceId }, include: { user }, orderBy: { createdAt: 'desc' } }) : await this.db.sysUserGroupMember.findMany({ where: { applicationId: app.id, groupId: sourceId }, include: { user }, orderBy: { createdAt: 'desc' } });
    const admitted = await this.db.iamRoleUser.findMany({ where: { userId: { in: rows.map((r) => r.userId) }, ...activePeriod(new Date()), role: { applicationId: app.id, ...effectiveRoleWhere(new Date()) }, user: { status: 'ACTIVE' } }, select: { userId: true } });
    const ids = new Set(admitted.map((m) => m.userId));
    return rows.map((r) => ({ id: r.id, userId: r.userId, user: r.user, status: r.status, effectiveAt: r.effectiveAt, expiresAt: r.expiresAt, version: r.version, eligible: ids.has(r.userId) }));
  }
  async addMembers(code: string, kindRaw: string, sourceId: string, actor: string, raw: unknown, requestId: string) {
    const kind = kindSchema.parse(kindRaw); const input = periodSchema.parse(raw); const app = await this.app(code);
    if (new Set(input.userIds).size !== input.userIds.length) throw new ApiException('BAD_REQUEST', 400, '用户不可重复');
    return this.db.$transaction(async (tx) => {
      await this.admin(tx, app.id, actor); const source = await this.source(tx, app, kind, sourceId);
      if (source.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', 409, '停用来源不能新增成员');
      for (const userId of input.userIds) {
        roleMembershipWriteSchema.parse({ userId, effectiveAt: input.effectiveAt, expiresAt: input.expiresAt });
        if (!await tx.iamUser.findFirst({ where: { id: userId, tenantId: app.tenantId, status: 'ACTIVE' } })) throw new ApiException('BAD_REQUEST', 400, '用户不在当前租户或已停用');
        const effectiveAt = new Date(input.effectiveAt); const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        const overlap = { userId, status: 'ACTIVE' as const, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: effectiveAt } }] }, ...(expiresAt ? [{ effectiveAt: { lt: expiresAt } }] : [])] };
        const existing = kind === 'organization' ? await tx.orgUserAssignment.findFirst({ where: { ...overlap, orgUnitId: sourceId } }) : await tx.sysUserGroupMember.findFirst({ where: { ...overlap, groupId: sourceId } });
        if (existing) throw new ApiException('BAD_REQUEST', 409, '来源成员有效期重叠，整批未保存');
        const data = { tenantId: app.tenantId, userId, effectiveAt, expiresAt, createdBy: actor, updatedBy: actor };
        if (kind === 'organization') await tx.orgUserAssignment.create({ data: { ...data, orgUnitId: sourceId } });
        else await tx.sysUserGroupMember.create({ data: { ...data, applicationId: app.id, groupId: sourceId } });
      }
      await this.audit(tx, app, actor, requestId, 'authorization.subject.members.add', sourceId, { kind, userIds: input.userIds }); return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }
  async endMembers(code: string, kindRaw: string, sourceId: string, actor: string, raw: unknown, requestId: string) {
    const kind = kindSchema.parse(kindRaw); const input = endSchema.parse(raw); const app = await this.app(code);
    return this.db.$transaction(async (tx) => {
      await this.admin(tx, app.id, actor); await this.source(tx, app, kind, sourceId);
      if (new Set(input.members.map((r) => r.id)).size !== input.members.length) throw new ApiException('BAD_REQUEST', 400, '关系不可重复');
      for (const member of input.members) {
        const where = { id: member.id, version: member.version, status: 'ACTIVE' as const };
        const result = kind === 'organization' ? await tx.orgUserAssignment.updateMany({ where: { ...where, tenantId: app.tenantId, orgUnitId: sourceId }, data: { status: 'DISABLED', version: { increment: 1 }, updatedBy: actor } }) : await tx.sysUserGroupMember.updateMany({ where: { ...where, applicationId: app.id, groupId: sourceId }, data: { status: 'DISABLED', version: { increment: 1 }, updatedBy: actor } });
        if (!result.count) throw new ApiException('BAD_REQUEST', 409, '关系已修改，整批未结束');
      }
      await this.audit(tx, app, actor, requestId, 'authorization.subject.members.end', sourceId, { kind, membershipIds: input.members.map((m) => m.id) }); return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }
  async bindings(code: string, roleId: string) {
    const app = await this.app(code);
    if (!await this.db.iamRole.findFirst({ where: { id: roleId, applicationId: app.id, archivedAt: null } })) throw new ApiException('NOT_FOUND', 404, '角色不存在');
    return this.db.sysRoleSubjectBinding.findMany({ where: { roleId, applicationId: app.id }, include: { organization: { select: { unitName: true, unitCode: true } }, group: { select: { groupName: true, groupCode: true } } }, orderBy: { createdAt: 'desc' } });
  }
  async bind(code: string, roleId: string, actor: string, raw: unknown, requestId: string) {
    const input = z.strictObject({ kind: kindSchema, subjectIds: z.array(z.string().uuid()).min(1).max(100), includeDescendants: z.boolean().default(false), effectiveAt: z.string().datetime(), expiresAt: z.string().datetime().nullable() }).parse(raw);
    if (new Set(input.subjectIds).size !== input.subjectIds.length || input.kind === 'group' && input.includeDescendants) throw new ApiException('BAD_REQUEST', 400, '重复来源或不合法的包含后代设置');
    roleMembershipWriteSchema.parse({ userId: actor, effectiveAt: input.effectiveAt, expiresAt: input.expiresAt });
    const app = await this.app(code);
    return this.db.$transaction(async (tx) => {
      await this.admin(tx, app.id, actor);
      const role = await tx.iamRole.findFirst({ where: { id: roleId, applicationId: app.id, tenantId: app.tenantId, archivedAt: null } });
      if (!role || role.isSystem || !role.isEnabled || role.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', 409, '角色不存在、已停用或为受保护系统角色');
      const actorRoleIds = await resolveEffectiveRoleIds(tx, app.id, actor);
      const available = new Set((await tx.iamRolePermission.findMany({ where: { roleId: { in: actorRoleIds }, status: 'ACTIVE', permission: { status: 'ACTIVE' } }, select: { permissionId: true } })).map((r) => r.permissionId));
      const wanted = await tx.iamRolePermission.findMany({ where: { roleId, status: 'ACTIVE' }, select: { permissionId: true } });
      if (wanted.some((r) => !available.has(r.permissionId))) throw new ApiException('FORBIDDEN', 403, '目标角色超出操作者可委派权限');
      const effectiveAt = new Date(input.effectiveAt); const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      for (const id of input.subjectIds) {
        const source = await this.source(tx, app, input.kind, id);
        if (source.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', 409, '来源已停用');
        const key = input.kind === 'organization' ? { orgUnitId: id } : { groupId: id };
        if (await tx.sysRoleSubjectBinding.findFirst({ where: { roleId, ...key, status: 'ACTIVE', AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: effectiveAt } }] }, ...(expiresAt ? [{ effectiveAt: { lt: expiresAt } }] : [])] } })) throw new ApiException('BAD_REQUEST', 409, '动态绑定有效期重叠，整批未保存');
        await tx.sysRoleSubjectBinding.create({ data: { applicationId: app.id, tenantId: app.tenantId, roleId, ...key, includeDescendants: input.includeDescendants, effectiveAt, expiresAt, createdBy: actor, updatedBy: actor } });
      }
      await this.audit(tx, app, actor, requestId, 'authorization.role.subject.bind', roleId, { kind: input.kind, subjectIds: input.subjectIds, includeDescendants: input.includeDescendants }); return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }
  async unbind(code: string, roleId: string, actor: string, raw: unknown, requestId: string) {
    const input = endSchema.parse(raw); const app = await this.app(code);
    return this.db.$transaction(async (tx) => {
      await this.admin(tx, app.id, actor);
      if (new Set(input.members.map((m) => m.id)).size !== input.members.length) throw new ApiException('BAD_REQUEST', 400, '绑定不可重复');
      for (const item of input.members) {
        const result = await tx.sysRoleSubjectBinding.updateMany({ where: { id: item.id, roleId, applicationId: app.id, version: item.version, status: 'ACTIVE' }, data: { status: 'DISABLED', version: { increment: 1 }, updatedBy: actor } });
        if (!result.count) throw new ApiException('BAD_REQUEST', 409, '绑定已变更，整批未结束');
      }
      await this.audit(tx, app, actor, requestId, 'authorization.role.subject.end', roleId, { bindingIds: input.members.map((m) => m.id) }); return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }
}
