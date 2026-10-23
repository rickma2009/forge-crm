import { PersonalTodoService } from '../personal-todo/personal-todo.service';
import { Injectable } from '@nestjs/common';
import type { NavigationNode, Workbench } from '@forge-crm/contracts';
import { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../rbac/authorization.service';
import { ApiException } from '../http/api-exceptions';

// Business dates are date-only values; use Shanghai's calendar rather than the host timezone.
export function workbenchMonth(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const month = today.slice(0, 7);
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  return { today: new Date(`${today}T00:00:00Z`), month, start, end };
}
function canView(nodes: NavigationNode[], menu: string): boolean {
  return nodes.some((node) => (node.menuCode === menu && !!node.allowedActions?.some((a) => a.actionCode === 'view')) || canView(node.children, menu));
}
@Injectable()
export class WorkbenchService {
  constructor(private readonly personalTodos: PersonalTodoService, private readonly db: DatabaseService, private readonly authorization: AuthorizationService) {}
  async get(systemCode: string, userId: string): Promise<Workbench> {
    const navigation = await this.authorization.navigation(userId, systemCode);
    const application = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' }, select: { id: true, tenantId: true } });
    if (!application) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    const opportunityAllowed = canView(navigation.items, 'opportunity-directory');
    const inventoryAllowed = canView(navigation.items, 'inventory-balance-directory');
    const { month, start, end, today } = workbenchMonth();
    const visibleTodos = await this.personalTodos.visibleOpen(systemCode,userId,application);
    return this.db.$transaction(async (tx) => {
      const scope = { applicationId: application.id, tenantId: application.tenantId, status: 'ACTIVE' as const };
      const open = { ...scope, businessStatus: { in: ['INITIAL', 'FOLLOWING'] } };
      const personal = { ...open, ownerUserId: userId };
      const overdue = { ...personal, expectedSignDate: { lt: today } };
      const metric = async (where: Prisma.SdOppWhereInput) => {
        const sum = await tx.sdOpp.aggregate({ where, _count: { _all: true, expectedAmount: true }, _sum: { expectedAmount: true } });
        return { count: sum._count._all, amount: (sum._sum.expectedAmount ?? new Prisma.Decimal(0)).toFixed(2), missingAmount: sum._count._all - sum._count.expectedAmount };
      };
      const following = opportunityAllowed ? await metric({ ...open, expectedSignDate: { gte: start, lt: end } }) : null;
      const signed = opportunityAllowed ? await metric({ ...scope, businessStatus: 'SIGNED', signedDate: { gte: start, lt: end } }) : null;
      const inventory = inventoryAllowed ? (await tx.scmInventoryBalance.groupBy({ by: ['currencyCode'], where: { tenantId: application.tenantId }, _sum: { amount: true }, orderBy: { currencyCode: 'asc' } })).map((r) => ({ currency: r.currencyCode, amount: (r._sum.amount ?? new Prisma.Decimal(0)).toFixed(2) })) : null;
      const rows = async (where: Prisma.SdOppWhereInput, warning: boolean) => {
        const total = await tx.sdOpp.count({ where });
        const items = await tx.sdOpp.findMany({ where, orderBy: [{ expectedSignDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }], take: warning ? 5 : 8, select: { id: true, opportunityCode: true, opportunityName: true, expectedSignDate: true, customerName: true } });
        return { total, items: items.map((r) => ({ id: r.id, title: `${r.opportunityCode} · ${r.opportunityName}`, description: warning ? '预签日期已过，请更新签约计划或商机状态' : `${r.customerName} · 待跟进商机`, date: r.expectedSignDate?.toISOString().slice(0, 10) ?? null, path: `/showcase/opportunities/${r.id}` })) };
      };
      const personalTodos = visibleTodos.items, personalTodoCount = visibleTodos.total;
      return { month, generatedAt: new Date().toISOString(), following, signed, inventory, opportunityAllowed,
        pending: opportunityAllowed ? await rows(personal, false) : { total: 0, items: [] },
        warnings: opportunityAllowed ? await rows(overdue, true) : { total: 0, items: [] },
        agentTodos: { total: personalTodoCount, items: personalTodos.slice(0,8).map((todo) => ({ id: todo.id, requiresResult: !!(todo.sourceSuggestionId || todo.sourceMessageId), version: todo.version, title: todo.title, description: todo.description || 'Agent 待办', date: todo.dueDate?.toISOString().slice(0, 10) ?? null, path: todo.contextId ? `/showcase/${todo.contextType === 'CUSTOMER' ? 'customers' : 'opportunities'}/${todo.contextId}` : '/showcase/agent' })) } };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
