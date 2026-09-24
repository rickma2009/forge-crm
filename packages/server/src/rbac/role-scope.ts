import type { Prisma } from '../generated/prisma/client';
import { expandOrganizationBindings } from './subject-membership';
import { ApiException } from '../http/api-exceptions';

export const effectiveRoleWhere = (now: Date): Prisma.IamRoleWhereInput => ({
  status: 'ACTIVE', isEnabled: true, archivedAt: null,
  AND: [
    { OR: [{ effectiveDateBegin: null }, { effectiveDateBegin: { lte: now } }] },
    { OR: [{ effectiveDateEnd: null }, { effectiveDateEnd: { gt: now } }] },
  ],
});
export const activePeriod = (now: Date) => ({ status: 'ACTIVE' as const, effectiveAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });

export async function assertRoleDelegation(tx: Prisma.TransactionClient, applicationId: string, actorUserId: string, roleId: string, desiredIds?: string[]) {
  const roleIds = await resolveEffectiveRoleIds(tx, applicationId, actorUserId);
  const actorGrants = await tx.iamRolePermission.findMany({ where: { applicationId, status: 'ACTIVE', permission: { status: 'ACTIVE' }, roleId: { in: roleIds } }, select: { permissionId: true } });
  const available = new Set(actorGrants.map((g) => g.permissionId));
  const desired = desiredIds ?? (await tx.iamRolePermission.findMany({ where: { roleId, applicationId, status: 'ACTIVE' }, select: { permissionId: true } })).map((g) => g.permissionId);
  if (desired.some((id) => !available.has(id))) throw new ApiException('FORBIDDEN', 403, '不能委派超出自身授权范围的角色或权限');
  const hasDataPolicy = await tx.sysRoleDataPolicy.count({ where: { roleId, applicationId, resource: { enabled: true } } });
  if (hasDataPolicy && !await tx.iamRole.findFirst({ where: { id: { in: roleIds }, isSystem: true } })) throw new ApiException('FORBIDDEN', 403, '包含数据策略的角色暂仅允许本应用受保护管理员委派或延长有效期');
}

/** Direct membership is application admission; dynamic subjects only add eligible role scopes. */
export async function resolveEffectiveRoleIds(tx: Prisma.TransactionClient, applicationId: string, userId: string, now = new Date()): Promise<string[]> {
  const app = await tx.sysApplication.findFirst({ where: { id: applicationId, status: 'ACTIVE' } });
  if (!app) return [];
  const direct = await tx.iamRoleUser.findMany({ where: { userId, user: { status: 'ACTIVE', tenantId: app.tenantId }, ...activePeriod(now), role: { applicationId, tenantId: app.tenantId, ...effectiveRoleWhere(now) } }, select: { roleId: true } });
  if (!direct.length) return [];
  const [organizations, assignments, groups, bindings] = await Promise.all([
    tx.orgUnit.findMany({ where: { tenantId: app.tenantId, ...activePeriod(now) }, select: { id: true, parentId: true } }),
    tx.orgUserAssignment.findMany({ where: { userId, tenantId: app.tenantId, ...activePeriod(now) }, select: { orgUnitId: true } }),
    tx.sysUserGroupMember.findMany({ where: { userId, applicationId, tenantId: app.tenantId, ...activePeriod(now), group: { status: 'ACTIVE' } }, select: { groupId: true } }),
    tx.sysRoleSubjectBinding.findMany({ where: { applicationId, tenantId: app.tenantId, ...activePeriod(now), role: { isSystem: false, ...effectiveRoleWhere(now) } }, select: { roleId: true, orgUnitId: true, groupId: true, includeDescendants: true } }),
  ]);
  const orgRoles = expandOrganizationBindings(organizations, assignments.map((a) => a.orgUnitId), bindings.filter((b) => b.orgUnitId).map((b) => ({ roleId: b.roleId, orgId: b.orgUnitId!, includeDescendants: b.includeDescendants })));
  const groupIds = new Set(groups.map((g) => g.groupId));
  return [...new Set([...direct.map((d) => d.roleId), ...orgRoles, ...bindings.filter((b) => b.groupId && groupIds.has(b.groupId)).map((b) => b.roleId)])];
}
