import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';
import { ApiException } from '../http/api-exceptions';
import { effectiveRoleWhere, resolveEffectiveRoleIds } from '../rbac/role-scope';
import { combinePolicyWhere, compileCondition, dataPolicySchema, type DataPolicy } from './data-policy';
import { CUSTOMER_ACTIONS, CUSTOMER_OPERATIONS, CUSTOMER_POLICY_FIELDS, customerQueryFields } from './customer-policy-catalog';

const publishSchema = dataPolicySchema.extend({ version: z.number().int().nonnegative(), roleVersion: z.number().int().positive(), viewIds: z.array(z.string().uuid()).max(100).refine((v) => new Set(v).size === v.length) });
const operationSchema = z.enum(CUSTOMER_OPERATIONS);
const activeMembership = (userId: string, now: Date): Prisma.IamRoleUserWhereInput => ({ userId, user: { status: 'ACTIVE' }, status: 'ACTIVE', effectiveAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });

@Injectable()
export class RolePolicyService {
  constructor(private readonly db: DatabaseService) {}
  private async application(code: string) {
    const app = await this.db.sysApplication.findFirst({ where: { applicationCode: code, status: 'ACTIVE' } });
    if (!app) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    return app;
  }
  private async administrator(tx: Prisma.TransactionClient, applicationId: string, actor: string) {
    const now = new Date();
    const role = await tx.iamRole.findFirst({ where: { applicationId, isSystem: true, ...effectiveRoleWhere(now), members: { some: activeMembership(actor, now) } } });
    if (!role) throw new ApiException('FORBIDDEN', 403, '数据策略发布和目录接入需由本应用受保护管理员执行，不能超范围委派');
  }
  private async audit(tx: Prisma.TransactionClient, app: { id: string; tenantId: string }, actor: string, requestId: string, actionCode: string, resourceId: string, after: Prisma.InputJsonObject) {
    await tx.sysAuditLog.create({ data: { applicationId: app.id, tenantId: app.tenantId, actorUserId: actor, requestId, actionCode, resourceId, resourceType: 'data-policy', afterSnapshot: after } });
  }

  async catalog(code: string) {
    const app = await this.application(code);
    const resources = await this.db.sysAuthorizationResource.findMany({ where: { applicationId: app.id }, include: { fields: { orderBy: { fieldCode: 'asc' } } }, orderBy: { resourceCode: 'asc' } });
    return { availableBindings: [{ key: 'customer', name: '客户', actions: CUSTOMER_OPERATIONS, fields: CUSTOMER_POLICY_FIELDS }], resources };
  }

  async register(code: string, actor: string, raw: unknown, requestId: string) {
    const input = z.strictObject({ bindingKey: z.literal('customer'), resourceName: z.string().trim().min(1).max(128) }).parse(raw);
    const app = await this.application(code);
    return this.db.$transaction(async (tx) => {
      await this.administrator(tx, app.id, actor);
      if (await tx.sysAuthorizationResource.findFirst({ where: { applicationId: app.id, bindingKey: input.bindingKey } })) throw new ApiException('BAD_REQUEST', 409, '该消费能力已接入');
      const resource = await tx.sysAuthorizationResource.create({ data: { applicationId: app.id, resourceCode: input.bindingKey, resourceName: input.resourceName, bindingKey: input.bindingKey, createdBy: actor, updatedBy: actor } });
      await tx.sysAuthorizationField.createMany({ data: CUSTOMER_POLICY_FIELDS.map((f) => ({ resourceId: resource.id, fieldCode: f.code, fieldName: f.name, bindingKey: f.code, fieldType: f.type })) });
      await this.audit(tx, app, actor, requestId, 'authorization.resource.register', resource.id, { bindingKey: input.bindingKey, enabled: false });
      return resource;
    }, { isolationLevel: 'Serializable' });
  }

  async setEnabled(code: string, resourceId: string, actor: string, raw: unknown, requestId: string) {
    const input = z.strictObject({ version: z.number().int().positive(), enabled: z.literal(true), confirmDefaultDeny: z.literal(true) }).parse(raw);
    const app = await this.application(code);
    return this.db.$transaction(async (tx) => {
      await this.administrator(tx, app.id, actor);
      const resource = await tx.sysAuthorizationResource.findFirst({ where: { id: resourceId, applicationId: app.id } });
      if (!resource) throw new ApiException('NOT_FOUND', 404, '资源不存在');
      if (resource.version !== input.version || resource.enabled) throw new ApiException('BAD_REQUEST', 409, '资源已变更，请重新载入');
      // Preserve only already-authorized protected roles via explicit baseline policies.
      // Other roles receive no implicit allow; they require reviewed policies before enrollment.
      const roles = await tx.iamRole.findMany({ where: { applicationId: app.id, isSystem: true, archivedAt: null }, include: { grants: { where: { status: 'ACTIVE', permission: { status: 'ACTIVE', resourceCode: 'customer-directory' } }, include: { permission: true } } } });
      for (const role of roles) for (const action of CUSTOMER_OPERATIONS) {
        if (!role.grants.some((g) => g.permission.actionCode === CUSTOMER_ACTIONS[action])) continue;
        const existing = await tx.sysRoleDataPolicy.findUnique({ where: { roleId_resourceId_actionCode: { roleId: role.id, resourceId, actionCode: action } } });
        if (existing) continue;
        const policy = await tx.sysRoleDataPolicy.create({ data: { applicationId: app.id, roleId: role.id, resourceId, actionCode: action, publishedBy: actor } });
        const baseline = { name: '保留已批准的系统角色范围', effect: 'ALLOW' as const, enabled: true, condition: { kind: 'all' as const } };
        await tx.sysRoleDataRule.create({ data: { policyId: policy.id, ruleName: baseline.name, effect: baseline.effect, condition: baseline.condition } });
        await tx.sysPolicyRevision.create({ data: { policyId: policy.id, version: 1, snapshot: { rules: [baseline], fields: [], viewIds: [] }, summary: '接入时显式保留既有系统角色范围；未新增功能权限', publishedBy: actor } });
      }
      await tx.sysAuthorizationResource.update({ where: { id: resourceId }, data: { enabled: true, version: { increment: 1 }, updatedBy: actor } });
      await this.audit(tx, app, actor, requestId, 'authorization.resource.enroll', resourceId, { enabled: true, defaultDeny: true, protectedRoleBaseline: true });
      return { ok: true };
    }, { isolationLevel: 'Serializable' });
  }

  async get(code: string, roleId: string, resourceId: string, actionRaw: string) {
    const action = operationSchema.parse(actionRaw);
    const app = await this.application(code);
    const [role, resource] = await Promise.all([
      this.db.iamRole.findFirst({ where: { id: roleId, applicationId: app.id, archivedAt: null } }),
      this.db.sysAuthorizationResource.findFirst({ where: { id: resourceId, applicationId: app.id }, include: { fields: true } }),
    ]);
    if (!role || !resource) throw new ApiException('NOT_FOUND', 404, '角色或资源不存在');
    const policy = await this.db.sysRoleDataPolicy.findUnique({ where: { roleId_resourceId_actionCode: { roleId, resourceId, actionCode: action } }, include: { rules: { orderBy: { sortNo: 'asc' } }, fields: { include: { field: true } }, revisions: { orderBy: { version: 'desc' }, select: { version: true, summary: true, createdAt: true, publishedBy: true, snapshot: true } } } });
    const views = await this.db.iamRoleListView.findMany({ where: { roleId, status: 'ACTIVE', view: { applicationId: app.id, pageCode: 'customer-directory' } } });
    return { version: policy?.version ?? 0, roleVersion: role.version, readOnly: role.isSystem, rules: policy?.rules.map((r) => ({ name: r.ruleName, effect: r.effect, enabled: r.enabled, condition: r.condition })) ?? [], fields: policy?.fields.map((f) => ({ field: f.field.fieldCode, visible: f.visible, writable: f.writable, exportable: f.exportable, mask: f.mask })) ?? [], viewIds: views.map((v) => v.viewId), history: policy?.revisions ?? [], resource };
  }

  async publish(code: string, roleId: string, resourceId: string, actionRaw: string, actor: string, raw: unknown, requestId: string, rollbackVersion?: number) {
    const action = operationSchema.parse(actionRaw);
    const input = publishSchema.parse(raw);
    const app = await this.application(code);
    return this.db.$transaction(async (tx) => {
      await this.administrator(tx, app.id, actor);
      const role = await tx.iamRole.findFirst({ where: { id: roleId, applicationId: app.id, archivedAt: null } });
      const resource = await tx.sysAuthorizationResource.findFirst({ where: { id: resourceId, applicationId: app.id }, include: { fields: { where: { status: 'ACTIVE' } } } });
      if (!role || !resource) throw new ApiException('NOT_FOUND', 404, '角色或资源不存在');
      if (role.isSystem) throw new ApiException('FORBIDDEN', 403, '系统角色基线受保护');
      if (role.version !== input.roleVersion) throw new ApiException('BAD_REQUEST', 409, '角色已变更，请重新载入');
      const current = await tx.sysRoleDataPolicy.findUnique({ where: { roleId_resourceId_actionCode: { roleId, resourceId, actionCode: action } } });
      if ((current?.version ?? 0) !== input.version) throw new ApiException('BAD_REQUEST', 409, '策略版本冲突，请比较最新版本');
      let data: DataPolicy & { viewIds: string[] } = input;
      if (rollbackVersion !== undefined) {
        if (!current) throw new ApiException('NOT_FOUND', 404, '策略历史不存在');
        const prior = await tx.sysPolicyRevision.findUnique({ where: { policyId_version: { policyId: current.id, version: rollbackVersion } } });
        if (!prior) throw new ApiException('NOT_FOUND', 404, '策略历史不存在');
        data = dataPolicySchema.extend({ viewIds: z.array(z.string().uuid()).max(100) }).parse(prior.snapshot);
      }
      const targetGrant = await tx.iamRolePermission.findFirst({ where: { roleId, status: 'ACTIVE', permission: { applicationId: app.id, status: 'ACTIVE', resourceCode: 'customer-directory', actionCode: CUSTOMER_ACTIONS[action] } } });
      if (!targetGrant) throw new ApiException('BAD_REQUEST', 409, '请先分配对应客户功能操作权限；数据策略不能补出功能权限');
      for (const rule of data.rules) compileCondition(rule.condition, customerQueryFields.filter((f) => resource.fields.some((r) => r.fieldCode === f.code)), { userId: actor });
      for (const rule of data.fields) {
        const field = resource.fields.find((f) => f.fieldCode === rule.field);
        const capability = CUSTOMER_POLICY_FIELDS.find((f) => f.code === field?.bindingKey);
        if (!field || !capability) throw new ApiException('BAD_REQUEST', 400, '字段未登记或已失效');
        if (capability.protected && (!rule.visible || rule.mask !== 'NONE') || rule.writable && !capability.writable || rule.mask !== 'NONE' && capability.type !== 'string' || rule.mask === 'AMOUNT' || rule.mask === 'PHONE') throw new ApiException('BAD_REQUEST', 400, '字段配置超出实际消费能力或固定安全边界');
      }
      const views = await tx.uiSystemListView.findMany({ where: { id: { in: data.viewIds }, applicationId: app.id, systemCode: code, pageCode: 'customer-directory', status: 'ACTIVE', roleAssignments: { some: { status: 'ACTIVE', role: { applicationId: app.id, ...effectiveRoleWhere(new Date()), members: { some: activeMembership(actor, new Date()) } } } } } });
      if (views.length !== data.viewIds.length) throw new ApiException('FORBIDDEN', 403, '视图失效、跨应用或超出委派范围');
      const version = input.version + 1;
      const policy = current ? await tx.sysRoleDataPolicy.update({ where: { id: current.id }, data: { version, publishedBy: actor } }) : await tx.sysRoleDataPolicy.create({ data: { applicationId: app.id, roleId, resourceId, actionCode: action, publishedBy: actor } });
      await tx.sysRoleDataRule.deleteMany({ where: { policyId: policy.id } });
      await tx.sysRoleFieldRule.deleteMany({ where: { policyId: policy.id } });
      for (const [index, rule] of data.rules.entries()) await tx.sysRoleDataRule.create({ data: { policyId: policy.id, ruleName: rule.name, effect: rule.effect, enabled: rule.enabled, sortNo: index, condition: rule.condition as Prisma.InputJsonValue } });
      for (const rule of data.fields) await tx.sysRoleFieldRule.create({ data: { policyId: policy.id, resourceId, fieldId: resource.fields.find((f) => f.fieldCode === rule.field)!.id, visible: rule.visible, writable: rule.writable, exportable: rule.exportable, mask: rule.mask } });
      await tx.iamRoleListView.updateMany({ where: { roleId, view: { pageCode: 'customer-directory', applicationId: app.id } }, data: { status: 'DISABLED' } });
      for (const viewId of data.viewIds) await tx.iamRoleListView.upsert({ where: { roleId_viewId: { roleId, viewId } }, create: { roleId, viewId }, update: { status: 'ACTIVE' } });
      const snapshot = { rules: data.rules, fields: data.fields, viewIds: data.viewIds };
      const summary = `${rollbackVersion === undefined ? '发布' : `从 v${rollbackVersion} 回滚为新版本`}：${data.rules.length} 条规则、${data.fields.length} 个字段限制、${data.viewIds.length} 个视图`;
      await tx.sysPolicyRevision.create({ data: { policyId: policy.id, version, snapshot: snapshot as Prisma.InputJsonValue, summary, publishedBy: actor } });
      await tx.iamRole.update({ where: { id: roleId }, data: { version: { increment: 1 } } });
      await this.audit(tx, app, actor, requestId, rollbackVersion === undefined ? 'authorization.policy.publish' : 'authorization.policy.rollback', policy.id, { version, summary });
      return { version, roleVersion: input.roleVersion + 1 };
    }, { isolationLevel: 'Serializable' });
  }

  async customerScope(code: string, userId: string, actionRaw: string) {
    const action = operationSchema.parse(actionRaw);
    const app = await this.application(code);
    const resource = await this.db.sysAuthorizationResource.findFirst({ where: { applicationId: app.id, bindingKey: 'customer', enabled: true } });
    if (!resource) return null;
    const now = new Date();
    const roleIds = await resolveEffectiveRoleIds(this.db, app.id, userId, now);
    const policies = await this.db.sysRoleDataPolicy.findMany({ where: { applicationId: app.id, resourceId: resource.id, actionCode: action, role: { id: { in: roleIds }, grants: { some: { status: 'ACTIVE', permission: { status: 'ACTIVE', resourceCode: 'customer-directory', actionCode: CUSTOMER_ACTIONS[action] } } } } }, include: { rules: { where: { enabled: true } }, fields: { include: { field: true } } } });
    return {
      where: combinePolicyWhere(policies.flatMap((p) => p.rules.map((r) => ({ effect: r.effect as 'ALLOW' | 'DENY', where: compileCondition(r.condition, customerQueryFields, { userId }) })))),
      rules: policies.flatMap((p) => p.rules.map((r) => ({ effect: r.effect as 'ALLOW' | 'DENY', condition: r.condition }))),
      fields: policies.flatMap((p) => p.fields.map((r) => ({ field: r.field.bindingKey, visible: r.visible, writable: r.writable, exportable: r.exportable, mask: r.mask as DataPolicy['fields'][number]['mask'] }))),
    };
  }
}
