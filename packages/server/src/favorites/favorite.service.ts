import { Injectable } from '@nestjs/common';
import { favoriteCreateSchema, type FavoriteTargetType } from '@forge-crm/contracts';
import type { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { AuthorizationService } from '../rbac/authorization.service';
import { RolePolicyService } from '../role-management/role-policy.service';
import { redactFields } from '../role-management/data-policy';

type FavoriteScope = { tenantId: string; applicationId: string };
type Target = { id: string; label: string; value: string; routePath: string };
const TYPE_INFO: Record<FavoriteTargetType, { page: string; label: string; route: string }> = {
  CUSTOMER: { page: 'customer-directory', label: '客户', route: '/showcase/customers' },
  PRODUCT: { page: 'product-directory', label: '产品', route: '/showcase/products' },
  ITEM: { page: 'item-directory', label: '物料产品', route: '/showcase/items' },
  OPPORTUNITY: { page: 'opportunity-directory', label: '商机', route: '/showcase/opportunities' },
  QUOTATION: { page: 'quotation-directory', label: '报价单', route: '/showcase/quotations' },
  SALES_ORDER: { page: 'sales-order-directory', label: '销售订单', route: '/showcase/sales-orders' },
};

@Injectable()
export class FavoriteService {
  constructor(private readonly db: DatabaseService, private readonly authorization: AuthorizationService, private readonly policies: RolePolicyService) {}

  private async scope(systemCode: string): Promise<FavoriteScope> {
    const app = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' }, select: { id: true, tenantId: true } });
    if (!app) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    return { applicationId: app.id, tenantId: app.tenantId };
  }

  private async canRead(userId: string, systemCode: string, targetType: FavoriteTargetType) {
    const navigation = await this.authorization.navigation(userId, systemCode);
    const find = (nodes: typeof navigation.items): boolean => nodes.some((node) => node.menuCode === TYPE_INFO[targetType].page
      ? Boolean(node.allowedActions?.some((action) => action.actionCode === 'view'))
      : find(node.children));
    return find(navigation.items);
  }

  private async resolve(systemCode: string, scope: FavoriteScope, userId: string, targetType: FavoriteTargetType, targetIds: string[]): Promise<Map<string, Target>> {
    const ids = [...new Set(targetIds)];
    if (!ids.length) return new Map();
    const base = TYPE_INFO[targetType];
    switch (targetType) {
      case 'CUSTOMER': {
        const policy = await this.policies.customerScope(systemCode, userId, 'read');
        if (policy && !redactFields({ customerName: 'visible-check' }, policy.fields, false).customerName) return new Map();
        const rows = await this.db.crmCustomer.findMany({ where: { id: { in: ids }, systemCode, ...(policy ? { AND: [policy.where as Prisma.CrmCustomerWhereInput] } : {}) }, select: { id: true, customerName: true } });
        return new Map(rows.map((row) => [row.id, { id: row.id, label: base.label, value: row.customerName, routePath: `${base.route}/${row.id}` }]));
      }
      case 'PRODUCT': {
        const rows = await this.db.mdProduct.findMany({ where: { id: { in: ids }, tenantId: scope.tenantId }, select: { id: true, productName: true } });
        return new Map(rows.map((row) => [row.id, { id: row.id, label: base.label, value: row.productName, routePath: `${base.route}/${row.id}` }]));
      }
      case 'ITEM': {
        const rows = await this.db.mdItem.findMany({ where: { id: { in: ids }, tenantId: scope.tenantId }, select: { id: true, itemName: true } });
        return new Map(rows.map((row) => [row.id, { id: row.id, label: base.label, value: row.itemName, routePath: `${base.route}/${row.id}` }]));
      }
      case 'OPPORTUNITY': {
        const rows = await this.db.sdOpp.findMany({ where: { id: { in: ids }, tenantId: scope.tenantId, applicationId: scope.applicationId, systemCode }, select: { id: true, opportunityName: true } });
        return new Map(rows.map((row) => [row.id, { id: row.id, label: base.label, value: row.opportunityName, routePath: `${base.route}/${row.id}` }]));
      }
      case 'QUOTATION': {
        const rows = await this.db.sdQuotation.findMany({ where: { id: { in: ids }, tenantId: scope.tenantId, applicationId: scope.applicationId, systemCode }, select: { id: true, quoteCode: true } });
        return new Map(rows.map((row) => [row.id, { id: row.id, label: base.label, value: row.quoteCode, routePath: `${base.route}/${row.id}` }]));
      }
      case 'SALES_ORDER': {
        const rows = await this.db.sdSalesOrder.findMany({ where: { id: { in: ids }, tenantId: scope.tenantId, applicationId: scope.applicationId }, select: { id: true, orderNo: true } });
        return new Map(rows.map((row) => [row.id, { id: row.id, label: base.label, value: row.orderNo, routePath: `${base.route}/${row.id}` }]));
      }
    }
  }

  async list(systemCode: string, userId: string) {
    const scope = await this.scope(systemCode);
    const rows = await this.db.sysUserFavorite.findMany({ where: { ...scope, userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    const types = [...new Set(rows.map((row) => row.targetType as FavoriteTargetType))];
    const allowed = new Set<FavoriteTargetType>();
    await Promise.all(types.map(async (type) => { if (await this.canRead(userId, systemCode, type)) allowed.add(type); }));
    const resolved = new Map<FavoriteTargetType, Map<string, Target>>();
    await Promise.all([...allowed].map(async (type) => { resolved.set(type, await this.resolve(systemCode, scope, userId, type, rows.filter((row) => row.targetType === type).map((row) => row.targetId))); }));
    return rows.map((row) => {
      const targetType = row.targetType as FavoriteTargetType;
      const target = allowed.has(targetType) ? resolved.get(targetType)?.get(row.targetId) : undefined;
      return { id: row.id, targetType, targetId: row.targetId, createdAt: row.createdAt.toISOString(), objectTypeName: TYPE_INFO[targetType].label, objectValue: target?.value ?? '对象不可用', available: Boolean(target), routePath: target?.routePath ?? null };
    });
  }

  async add(systemCode: string, userId: string, raw: unknown) {
    const input = favoriteCreateSchema.parse(raw);
    const scope = await this.scope(systemCode);
    if (!(await this.canRead(userId, systemCode, input.targetType))) throw new ApiException('FORBIDDEN', 403, '无权查看该类型记录');
    if (!(await this.resolve(systemCode, scope, userId, input.targetType, [input.targetId])).has(input.targetId)) throw new ApiException('NOT_FOUND', 404, '目标记录不存在或当前不可见');
    await this.db.sysUserFavorite.createMany({ data: [{ ...scope, userId, ...input }], skipDuplicates: true });
    const row = await this.db.sysUserFavorite.findUniqueOrThrow({ where: { applicationId_userId_targetType_targetId: { applicationId: scope.applicationId, userId, targetType: input.targetType, targetId: input.targetId } } });
    return { id: row.id, targetType: input.targetType, targetId: input.targetId, createdAt: row.createdAt.toISOString(), objectTypeName: TYPE_INFO[input.targetType].label };
  }

  async remove(systemCode: string, userId: string, favoriteId: string) {
    const scope = await this.scope(systemCode);
    const result = await this.db.sysUserFavorite.deleteMany({ where: { id: favoriteId, ...scope, userId } });
    if (!result.count) throw new ApiException('NOT_FOUND', 404, '收藏不存在');
    return { ok: true };
  }
}
