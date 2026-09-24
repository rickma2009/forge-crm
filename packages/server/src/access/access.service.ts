import { HttpStatus, Injectable } from '@nestjs/common';
import { accessRolePermissionReplaceSchema, accessRoleWriteSchema, roleMembershipWriteSchema } from '@forge-crm/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { effectiveRoleWhere, assertRoleDelegation } from '../rbac/role-scope';
import type { Prisma } from '../generated/prisma/client';

const pageQuerySchema = z.object({
  keyword: z.string().trim().max(128).optional(),
  status: z.enum(['ACTIVE', 'DISABLED', 'LOCKED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const rolePageQuerySchema = pageQuerySchema.extend({ status: z.enum(['ACTIVE', 'DISABLED']).optional() });
const permissionPageQuerySchema = pageQuerySchema.extend({
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  resourceCode: z.string().trim().max(128).optional(),
});
const statusWriteSchema = z.strictObject({ status: z.enum(['ACTIVE', 'DISABLED']), version: z.number().int().positive() });
const roleUpdateSchema = accessRoleWriteSchema.omit({ roleCode: true }).partial().extend({ version: z.number().int().positive() });
const memberEndSchema = z.strictObject({ endedAt: z.string().datetime().optional(), version: z.number().int().positive() });

@Injectable()
export class AccessService {
  constructor(private readonly db: DatabaseService) {}

  private async application(systemCode: string) {
    const application = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
    if (!application) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '系统不存在');
    return application;
  }

  async listUsers(systemCode: string, raw: unknown) {
    const application = await this.application(systemCode);
    const query = pageQuerySchema.parse(raw);
    const where = {
      tenantId: application.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword ? { OR: [{ account: { contains: query.keyword, mode: 'insensitive' as const } }, { displayName: { contains: query.keyword, mode: 'insensitive' as const } }] } : {}),
    };
    const now = new Date();
    const [total, items] = await this.db.$transaction([
      this.db.iamUser.count({ where }),
      this.db.iamUser.findMany({
        where,
        include: { roleMemberships: { where: { status: 'ACTIVE', effectiveAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], role: { applicationId: application.id, ...effectiveRoleWhere(now) } }, include: { role: true } } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      }),
    ]);
    return { items: items.map((user) => ({ id: user.id, account: user.account, displayName: user.displayName, userType: user.userType, status: user.status, effectiveRoles: user.roleMemberships.map(({ role }) => ({ id: role.id, roleCode: role.roleCode, roleName: role.roleName })), version: user.version, updatedAt: user.updatedAt.toISOString() })), pagination: this.pagination(query.page, query.pageSize, total) };
  }

  async getUser(systemCode: string, userId: string) {
    const application = await this.application(systemCode);
    const user = await this.db.iamUser.findFirst({ where: { id: userId, tenantId: application.tenantId }, include: { roleMemberships: { where: { role: { applicationId: application.id } }, include: { role: true }, orderBy: { createdAt: 'desc' } } } });
    if (!user) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '用户不存在');
    return { id: user.id, account: user.account, displayName: user.displayName, userType: user.userType, status: user.status, version: user.version, updatedAt: user.updatedAt.toISOString(), memberships: user.roleMemberships.map((item) => ({ id: item.id, roleId: item.roleId, roleCode: item.role.roleCode, roleName: item.role.roleName, status: item.status, effectiveAt: item.effectiveAt.toISOString(), expiresAt: item.expiresAt?.toISOString() ?? null, version: item.version })) };
  }

  async setUserStatus(systemCode: string, userId: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode);
    const input = statusWriteSchema.parse(raw);
    if (userId === actorUserId && input.status === 'DISABLED') throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '不能停用当前登录账号');
    return this.db.$transaction(async (tx) => {
      const before = await tx.iamUser.findFirst({ where: { id: userId, tenantId: application.tenantId } });
      if (!before) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '用户不存在');
      if (before.status === 'LOCKED') throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '锁定账号不能通过状态管理解除');
      if (input.status === 'DISABLED') {
        const systemRoleMembership = await tx.iamRoleUser.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
            effectiveAt: { lte: new Date() },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            role: { applicationId: application.id, isSystem: true, status: 'ACTIVE' },
          },
        });
        if (systemRoleMembership) {
          const otherActiveAdmins = await tx.iamRoleUser.count({
            where: {
              userId: { not: userId },
              status: 'ACTIVE',
              effectiveAt: { lte: new Date() },
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              user: { tenantId: application.tenantId, status: 'ACTIVE' },
              role: { applicationId: application.id, isSystem: true, status: 'ACTIVE' },
            },
          });
          if (!otherActiveAdmins) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '系统管理员至少保留一名有效成员');
        }
      }
      const result = await tx.iamUser.updateMany({ where: { id: userId, version: input.version }, data: { status: input.status, version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '用户已被其他人修改');
      const after = await tx.iamUser.findUniqueOrThrow({ where: { id: userId } });
      await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'access.user.status.manage', resourceType: 'user', resourceId: userId, beforeSnapshot: { status: before.status, version: before.version }, afterSnapshot: { status: after.status, version: after.version }, requestId } });
      return after;
    }, { isolationLevel: 'Serializable' });
  }

  async listRoles(systemCode: string, raw: unknown) {
    const application = await this.application(systemCode);
    const query = rolePageQuerySchema.parse(raw);
    const where = { applicationId: application.id, archivedAt: null, ...(query.status ? { status: query.status } : {}), ...(query.keyword ? { OR: [{ roleCode: { contains: query.keyword, mode: 'insensitive' as const } }, { roleName: { contains: query.keyword, mode: 'insensitive' as const } }] } : {}) };
    const [total, items] = await this.db.$transaction([this.db.iamRole.count({ where }), this.db.iamRole.findMany({ where, include: { _count: { select: { members: true, grants: true } } }, orderBy: [{ isSystem: 'desc' }, { roleCode: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize })]);
    return { items: items.map((role) => ({ id: role.id, roleCode: role.roleCode, roleName: role.roleName, roleType: role.roleType, isSystem: role.isSystem, description: role.description, status: role.status, memberCount: role._count.members, permissionCount: role._count.grants, version: role.version, updatedAt: role.updatedAt.toISOString() })), pagination: this.pagination(query.page, query.pageSize, total) };
  }

  async createRole(systemCode: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode);
    const input = accessRoleWriteSchema.parse(raw);
    const roleGroup = input.roleGroupId ? await this.db.sysRoleGroup.findFirst({ where: { id: input.roleGroupId, applicationId: application.id, status: 'ACTIVE' } }) : await this.db.sysRoleGroup.findFirst({ where: { applicationId: application.id, status: 'ACTIVE' }, orderBy: { sortNo: 'asc' } });
    if (!roleGroup) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '角色组不存在');
    try {
      return await this.db.$transaction(async (tx) => {
        const role = await tx.iamRole.create({ data: { tenantId: application.tenantId, applicationId: application.id, roleGroupId: roleGroup.id, systemCode, roleCode: input.roleCode, roleName: input.roleName, description: input.description ?? null, roleType: 'BUSINESS', isSystem: false } });
        await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'access.role.create', resourceType: 'role', resourceId: role.id, afterSnapshot: { roleCode: role.roleCode, roleName: role.roleName }, requestId } });
        return role;
      });
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '角色编码已存在');
    }
  }

  async updateRole(systemCode: string, roleId: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode);
    const input = roleUpdateSchema.parse(raw);
    const { version, ...data } = input;
    return this.db.$transaction(async (tx) => {
      const before = await tx.iamRole.findFirst({ where: { id: roleId, applicationId: application.id, archivedAt: null } });
      if (!before) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '角色不存在');
      if (before.isSystem) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '系统角色不可修改');
      if (data.roleGroupId) {
        const roleGroup = await tx.sysRoleGroup.findFirst({ where: { id: data.roleGroupId, applicationId: application.id, status: 'ACTIVE' } });
        if (!roleGroup) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '角色组不存在');
      }
      const result = await tx.iamRole.updateMany({ where: { id: roleId, version }, data: { roleName: data.roleName, description: data.description, roleGroupId: data.roleGroupId, version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '角色已被其他人修改');
      const after = await tx.iamRole.findUniqueOrThrow({ where: { id: roleId } });
      await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'access.role.update', resourceType: 'role', resourceId: roleId, beforeSnapshot: { roleName: before.roleName, description: before.description, version: before.version }, afterSnapshot: { roleName: after.roleName, description: after.description, version: after.version }, requestId } });
      return after;
    }, { isolationLevel: 'Serializable' });
  }

  async setRoleStatus(systemCode: string, roleId: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode);
    const input = statusWriteSchema.parse(raw);
    return this.db.$transaction(async (tx) => {
      const before = await tx.iamRole.findFirst({ where: { id: roleId, applicationId: application.id, archivedAt: null } });
      if (!before) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '角色不存在');
      if (before.isSystem) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '系统角色不可停用');
      if (input.status === 'ACTIVE') await assertRoleDelegation(tx, application.id, actorUserId, roleId);
      const result = await tx.iamRole.updateMany({ where: { id: roleId, version: input.version }, data: { status: input.status, isEnabled: input.status === 'ACTIVE', version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '角色已被其他人修改');
      const after = await tx.iamRole.findUniqueOrThrow({ where: { id: roleId } });
      await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'access.role.status.manage', resourceType: 'role', resourceId: roleId, beforeSnapshot: { status: before.status }, afterSnapshot: { status: after.status }, requestId } });
      return after;
    });
  }

  async listMembers(systemCode: string, roleId: string) {
    const application = await this.application(systemCode);
    const role = await this.db.iamRole.findFirst({ where: { id: roleId, applicationId: application.id, archivedAt: null } });
    if (!role) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '角色不存在');
    return this.db.iamRoleUser.findMany({ where: { roleId }, include: { user: { select: { account: true, displayName: true, status: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async addMember(systemCode: string, roleId: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode);
    const input = roleMembershipWriteSchema.parse(raw);
    const effectiveAt = new Date(input.effectiveAt);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    try {
      return await this.db.$transaction(async (tx) => {
        const role = await tx.iamRole.findFirst({ where: { id: roleId, applicationId: application.id, status: 'ACTIVE', isEnabled: true, archivedAt: null } });
        const user = await tx.iamUser.findFirst({ where: { id: input.userId, tenantId: application.tenantId, status: 'ACTIVE' } });
        if (!role || !user) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '角色或用户不存在');
        await this.assertDelegation(tx, application.id, actorUserId, roleId);
        const overlap = await tx.iamRoleUser.findFirst({ where: { roleId, userId: input.userId, status: 'ACTIVE', AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: effectiveAt } }] }, ...(expiresAt ? [{ effectiveAt: { lt: expiresAt } }] : [])] } });
        if (overlap) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '该成员授权时段与现有记录重叠');
        const membership = await tx.iamRoleUser.create({ data: { roleId, userId: input.userId, effectiveAt, expiresAt, grantedBy: actorUserId } });
        await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'access.role.member.manage', resourceType: 'role-member', resourceId: membership.id, afterSnapshot: { roleId, userId: input.userId, effectiveAt: input.effectiveAt, expiresAt: input.expiresAt ?? null }, requestId } });
        return membership;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '该成员授权时段与现有记录重叠');
    }
  }

  async endMember(systemCode: string, roleId: string, membershipId: string, actorUserId: string, requestId: string, raw: unknown) {
    const input = memberEndSchema.parse(raw);
    if (input.endedAt && Math.abs(new Date(input.endedAt).getTime() - Date.now()) > 60_000) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '结束授权仅支持立即执行');
    await this.batchMembers(systemCode, roleId, actorUserId, requestId, { action: 'end', members: [{ id: membershipId, version: input.version }] });
    return this.db.iamRoleUser.findUniqueOrThrow({ where: { id: membershipId } });
  }

  async listPermissions(systemCode: string, raw: unknown) {
    const application = await this.application(systemCode);
    const query = permissionPageQuerySchema.parse(raw);
    const where = { applicationId: application.id, ...(query.status ? { status: query.status } : {}), ...(query.resourceCode ? { resourceCode: query.resourceCode } : {}), ...(query.keyword ? { OR: [{ permissionCode: { contains: query.keyword, mode: 'insensitive' as const } }, { permissionName: { contains: query.keyword, mode: 'insensitive' as const } }] } : {}) };
    const [total, items] = await this.db.$transaction([this.db.sysPermission.count({ where }), this.db.sysPermission.findMany({ where, orderBy: [{ resourceCode: 'asc' }, { permissionCode: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize })]);
    return { items: items.map((item) => ({ id: item.id, permissionCode: item.permissionCode, permissionName: item.permissionName, resourceCode: item.resourceCode, actionCode: item.actionCode, source: item.source, status: item.status })), pagination: this.pagination(query.page, query.pageSize, total) };
  }

  async rolePermissions(systemCode: string, roleId: string) {
    const application = await this.application(systemCode);
    const role = await this.db.iamRole.findFirst({ where: { id: roleId, applicationId: application.id, archivedAt: null }, include: { grants: { where: { status: 'ACTIVE' }, include: { permission: true } } } });
    if (!role) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '角色不存在');
    return { roleVersion: role.version, isSystem: role.isSystem, permissionIds: role.grants.map((grant) => grant.permissionId), permissions: role.grants.map((grant) => grant.permission) };
  }

  async replaceRolePermissions(systemCode: string, roleId: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode);
    const input = accessRolePermissionReplaceSchema.parse(raw);
    return this.db.$transaction(async (tx) => {
      const role = await tx.iamRole.findFirst({ where: { id: roleId, applicationId: application.id, archivedAt: null } });
      if (!role) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '角色不存在');
      if (role.isSystem) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '系统角色权限由系统维护');
      if (role.version !== input.roleVersion) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '角色权限已被其他人修改');
      const permissionIds = [...new Set(input.permissionIds)];
      const permissions = await tx.sysPermission.findMany({ where: { id: { in: permissionIds }, applicationId: application.id, status: 'ACTIVE' }, select: { id: true } });
      if (permissions.length !== permissionIds.length) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '包含不存在、停用或跨系统权限');
      const current = await tx.iamRolePermission.findMany({ where: { roleId } });
      await this.assertDelegation(tx, application.id, actorUserId, roleId, permissionIds);
      const desired = new Set(permissionIds);
      for (const grant of current) await tx.iamRolePermission.update({ where: { id: grant.id }, data: desired.has(grant.permissionId) ? { status: 'ACTIVE', revokedAt: null, revokedBy: null } : { status: 'DISABLED', revokedAt: new Date(), revokedBy: actorUserId } });
      const existing = new Set(current.map((grant) => grant.permissionId));
      for (const permissionId of permissionIds.filter((id) => !existing.has(id))) await tx.iamRolePermission.create({ data: { applicationId: application.id, roleId, permissionId, grantedBy: actorUserId } });
      await tx.iamRole.update({ where: { id: roleId }, data: { version: { increment: 1 } } });
      await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'access.role.permission.assign', resourceType: 'role-permission', resourceId: roleId, beforeSnapshot: { permissionIds: current.filter((item) => item.status === 'ACTIVE').map((item) => item.permissionId), roleVersion: role.version }, afterSnapshot: { permissionIds, roleVersion: role.version + 1 }, requestId } });
      return { roleVersion: role.version + 1, permissionIds };
    }, { isolationLevel: 'Serializable' });
  }

  async batchMembers(systemCode: string, roleId: string, actorUserId: string, requestId: string, raw: unknown) {
    const app = await this.application(systemCode);
    const input = z.discriminatedUnion('action', [
      z.strictObject({ action: z.literal('add'), userIds: z.array(z.string().uuid()).min(1).max(100), effectiveAt: z.string().datetime(), expiresAt: z.string().datetime().nullable() }),
      z.strictObject({ action: z.literal('end'), members: z.array(z.strictObject({ id: z.string().uuid(), version: z.number().int().positive() })).min(1).max(100) }),
    ]).parse(raw);
    return this.db.$transaction(async (tx) => {
      const role = await tx.iamRole.findFirst({ where: { id: roleId, applicationId: app.id, archivedAt: null } });
      if (!role) throw new ApiException('NOT_FOUND', 404, '角色不存在');
      await this.assertDelegation(tx, app.id, actorUserId, roleId);
      const now = new Date();
      if (input.action === 'add') {
        if (role.status !== 'ACTIVE' || !role.isEnabled) throw new ApiException('BAD_REQUEST', 409, '停用角色不能新增成员');
        if (new Set(input.userIds).size !== input.userIds.length) throw new ApiException('BAD_REQUEST', 400, '存在重复用户');
        for (const userId of input.userIds) {
          const period = roleMembershipWriteSchema.parse({ userId, effectiveAt: input.effectiveAt, expiresAt: input.expiresAt });
          const effectiveAt = new Date(period.effectiveAt); const expiresAt = period.expiresAt ? new Date(period.expiresAt) : null;
          const user = await tx.iamUser.findFirst({ where: { id: userId, tenantId: app.tenantId, status: 'ACTIVE' } });
          if (!user) throw new ApiException('BAD_REQUEST', 400, '候选用户不存在、停用或属于其他租户');
          const overlap = await tx.iamRoleUser.findFirst({ where: { roleId, userId, status: 'ACTIVE', AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: effectiveAt } }] }, ...(expiresAt ? [{ effectiveAt: { lt: expiresAt } }] : [])] } });
          if (overlap) throw new ApiException('BAD_REQUEST', 409, '存在重叠授权，整批未保存');
          await tx.iamRoleUser.create({ data: { roleId, userId, effectiveAt, expiresAt, grantedBy: actorUserId } });
        }
      } else {
        const ids = input.members.map((m) => m.id);
        if (new Set(ids).size !== ids.length) throw new ApiException('BAD_REQUEST', 400, '存在重复成员');
        const members = await tx.iamRoleUser.findMany({ where: { id: { in: ids }, roleId, status: 'ACTIVE' } });
        if (members.length !== ids.length || members.some((m) => m.version !== input.members.find((i) => i.id === m.id)?.version || m.expiresAt && m.expiresAt <= now)) throw new ApiException('BAD_REQUEST', 409, '成员记录已变更，整批未保存');
        if (members.some((m) => m.userId === actorUserId)) throw new ApiException('BAD_REQUEST', 409, '不能移除当前账号自己的角色');
        if (role.isSystem) {
          const remaining = await tx.iamRoleUser.count({ where: { roleId, id: { notIn: ids }, status: 'ACTIVE', effectiveAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], user: { status: 'ACTIVE' } } });
          if (!remaining) throw new ApiException('BAD_REQUEST', 409, '系统管理员至少保留一名有效成员');
        }
        for (const m of members) await tx.iamRoleUser.update({ where: { id: m.id }, data: { status: 'DISABLED', endedAt: now, endedBy: actorUserId, ...(m.effectiveAt < now ? { expiresAt: now } : {}), version: { increment: 1 } } });
      }
      await tx.sysAuditLog.create({ data: { tenantId: app.tenantId, applicationId: app.id, actorUserId, requestId, actionCode: 'access.role.member.batch.' + input.action, resourceType: 'role', resourceId: roleId, afterSnapshot: input.action === 'add' ? { userIds: input.userIds, effectiveAt: input.effectiveAt, expiresAt: input.expiresAt } : { membershipIds: input.members.map((m) => m.id) } } });
      return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }

  private async assertDelegation(tx: Prisma.TransactionClient, applicationId: string, actorUserId: string, roleId: string, desiredIds?: string[]) {
    await assertRoleDelegation(tx, applicationId, actorUserId, roleId, desiredIds);
  }

  private pagination(page: number, pageSize: number, total: number) { return { page, pageSize, total, totalPages: total ? Math.ceil(total / pageSize) : 0 }; }
}
