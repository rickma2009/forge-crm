import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { opportunityAnalyticsQuerySchema, type OpportunityAnalyticsQuery } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../rbac/authorization.service';
import { Prisma } from '../generated/prisma/client';
import { ApiException } from '../http/api-exceptions';
import { workbenchMonth } from '../workbench/workbench.service';
import { configuredStageTemplate } from '../opportunity/configured-stage-template';
import { organizationDescendants, sixMonths, summarizeAnalytics, type AnalyticsStage } from './analytics-domain';
@Injectable()
export class OpportunityAnalyticsService {
  constructor(private readonly db: DatabaseService, private readonly auth: AuthorizationService) {}
  private async scope(code: string, user: string) {
    await this.auth.assertAction(user, code, 'opportunity-analytics', 'view');
    await this.auth.assertAction(user, code, 'opportunity-directory', 'view');
    const app = await this.db.sysApplication.findFirst({ where: { applicationCode: code, status: 'ACTIVE' }, select: { id: true, tenantId: true } });
    if (!app) throw new ApiException('NOT_FOUND', 404, '系统不存在'); return app;
  }
  private query(raw: unknown) {
    const q = opportunityAnalyticsQuerySchema.parse(raw), period = workbenchMonth();
    const dateFrom = q.dateFrom ?? period.start.toISOString().slice(0, 10);
    const months = sixMonths(dateFrom);
    const finalMonth = new Date(`${months[5]}-01T00:00:00Z`); finalMonth.setUTCMonth(finalMonth.getUTCMonth() + 1); finalMonth.setUTCDate(0);
    const dateTo = q.dateTo ?? finalMonth.toISOString().slice(0, 10);
    if (dateFrom > dateTo) throw new ApiException('BAD_REQUEST', 400, '预签开始日期不能晚于结束日期');
    return { ...q, dateFrom, dateTo };
  }
  private async dimensions(tx: Prisma.TransactionClient, tenantId: string, applicationId: string) {
    const [organizations, templates] = await Promise.all([
      tx.orgUnit.findMany({ where: { tenantId }, orderBy: [{ sortNo: 'asc' }, { unitCode: 'asc' }], select: { id: true, unitName: true, parentId: true, isSalesOrg: true, status: true, effectiveAt: true, expiresAt: true } }),
      tx.sdOppTemplate.findMany({ where: { applicationId, tenantId }, orderBy: [{ isDefault: 'desc' }, { templateCode: 'asc' }], include: { stages: { orderBy: [{ sortNo: 'asc' }, { stageCode: 'asc' }] } } }),
    ]);
    return { organizations, templates };
  }
  private async where(tx: Prisma.TransactionClient, scope: { id: string; tenantId: string }, q: OpportunityAnalyticsQuery & { dateFrom: string; dateTo: string }, organizations: { id: string; parentId: string | null; isSalesOrg: boolean; status: string; effectiveAt: Date; expiresAt: Date | null }[]) {
    const where: Prisma.SdOppWhereInput = { applicationId: scope.id, tenantId: scope.tenantId, status: 'ACTIVE', businessStatus: { in: ['INITIAL', 'FOLLOWING'] }, expectedSignDate: { gte: new Date(`${q.dateFrom}T00:00:00Z`), lte: new Date(`${q.dateTo}T00:00:00Z`) }, ...(q.templateId ? { templateId: q.templateId } : {}) };
    if (q.orgUnitId) {
      const now = new Date();
      const selectable = (o: typeof organizations[number]) => o.isSalesOrg && o.status === 'ACTIVE' && o.effectiveAt <= now && (!o.expiresAt || o.expiresAt > now);
      if (!organizations.some(o => o.id === q.orgUnitId && selectable(o))) throw new ApiException('BAD_REQUEST', 400, '只能选择有效的销售组织');
      const orgs = organizationDescendants(organizations, q.orgUnitId).filter((id) => organizations.some((o) => o.id === id && selectable(o)));
      const assignment = { tenantId: scope.tenantId, orgUnitId: { in: orgs }, status: 'ACTIVE' as const, effectiveAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
      const users = await tx.iamUser.findMany({ where: { tenantId: scope.tenantId, OR: [{ employee: { is: { assignments: { some: { ...assignment, isPrimary: true } } } } }, { employeeId: null, organizationAssignments: { some: assignment } }] }, select: { id: true } });
      where.ownerUserId = { in: users.map(u => u.id) };
    }
    return where;
  }
  async summary(code: string, user: string, raw: unknown) {
    const scope = await this.scope(code, user), q = this.query(raw), months = sixMonths(q.dateFrom);
    return this.db.$transaction(async tx => {
      const dimensions = await this.dimensions(tx, scope.tenantId, scope.id);
      const configured = await configuredStageTemplate(tx, scope);
      if (!configured) throw new ApiException('BAD_REQUEST', 409, '未设置有效商机阶段模板，请先在系统参数中维护');
      q.templateId = configured.id;
      const where = await this.where(tx, scope, q, dimensions.organizations);
      const groups = await tx.sdOpp.groupBy({ by: ['stageId', 'expectedSignDate'], where, _sum: { expectedAmount: true }, _count: { _all: true, expectedAmount: true } });
      const referenced = new Set(groups.map(g => g.stageId));
      const stages: AnalyticsStage[] = dimensions.templates.filter(t => !q.templateId || q.templateId === t.id).flatMap(t => t.stages.filter(s => (t.status === 'ACTIVE' && s.status === 'ACTIVE') || referenced.has(s.id)).map(s => ({ id: s.id, name: s.stageName, templateId: t.id, templateName: t.templateName, probability: s.probability })));
      const unknown = [...referenced].filter(id => !stages.some(s => s.id === id));
      if (unknown.length) {
        const snapshots = await tx.sdOpp.findMany({ where: { ...where, stageId: { in: unknown } }, distinct: ['stageId'], select: { stageId: true, stageName: true, stageProbability: true, templateId: true, templateName: true } });
        stages.push(...snapshots.map(s => ({ id: s.stageId, name: `${s.stageName}（历史阶段）`, templateId: s.templateId, templateName: s.templateName, probability: s.stageProbability })));
      }
      return { query: q, organizations: dimensions.organizations.filter(o => o.isSalesOrg && o.status === 'ACTIVE' && o.effectiveAt <= new Date() && (!o.expiresAt || o.expiresAt > new Date())).map(o => ({ id: o.id, name: o.unitName, parentId: o.parentId })), templates: dimensions.templates.filter(t => t.id === configured.id).map(t => ({ id: t.id, name: t.templateName })), months,
        ...summarizeAnalytics(stages, groups.map(g => ({ stageId: g.stageId, date: g.expectedSignDate!, count: g._count._all, amount: g._sum.expectedAmount, missingAmount: g._count._all - g._count.expectedAmount })), months) };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async records(code: string, user: string, raw: Record<string, unknown>) {
    const scope = await this.scope(code, user), q = this.query(raw);
    const paging = z.object({ stageId: z.string().uuid().optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(20) }).parse(raw);
    return this.db.$transaction(async tx => {
      const dimensions = await this.dimensions(tx, scope.tenantId, scope.id);
      const configured = await configuredStageTemplate(tx, scope);
      if (!configured) throw new ApiException('BAD_REQUEST', 409, '未设置有效商机阶段模板，请先在系统参数中维护');
      q.templateId = configured.id;
      const where = { ...await this.where(tx, scope, q, dimensions.organizations), ...(paging.stageId ? { stageId: paging.stageId } : {}) };
      const [rows, total] = await Promise.all([tx.sdOpp.findMany({ where, skip: (paging.page - 1) * paging.pageSize, take: paging.pageSize, orderBy: [{ expectedSignDate: 'asc' }, { id: 'asc' }], select: { id: true, opportunityCode: true, opportunityName: true, customerName: true, ownerName: true, stageName: true, businessStatus: true, expectedSignDate: true, expectedAmount: true } }), tx.sdOpp.count({ where })]);
      return { items: rows.map(r => ({ id: r.id, code: r.opportunityCode, name: r.opportunityName, customer: r.customerName, owner: r.ownerName, stage: r.stageName, businessStatus: r.businessStatus, expectedSignDate: r.expectedSignDate!.toISOString().slice(0, 10), amount: r.expectedAmount?.toFixed(2) ?? null })), pagination: { page: paging.page, pageSize: paging.pageSize, total, totalPages: Math.ceil(total / paging.pageSize) } };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
