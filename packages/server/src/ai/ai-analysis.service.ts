import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { z } from 'zod';
import { aiStartSchema, aiConfirmSchema, aiSectionTitles, type AiSource, type AiSnapshot, type AiTask } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { type Prisma, type AiAnalysisTask } from '../generated/prisma/client';
import { AuthorizationService } from '../rbac/authorization.service';
import { ApiException } from '../http/api-exceptions';
import { AiProvider, aiConfig } from './ai-provider';
import { parseAnalysisResult, snapshotHash, TEMPLATE_VERSION, SCHEMA_VERSION } from './analysis-domain';

type Tx = Prisma.TransactionClient;
const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
@Injectable()
export class AiAnalysisService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private working = false;
  private readonly logger = new Logger(AiAnalysisService.name);
  constructor(private readonly db: DatabaseService, private readonly provider: AiProvider, private readonly authorization: AuthorizationService) {}
  onModuleInit() { this.timer = setInterval(() => void this.tick(), 2000); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  status() { return this.provider.status(); }
  async testConnection() { try { return await this.provider.testConnection(); } catch (e) { throw new ApiException('BAD_REQUEST', 400, e instanceof Error ? e.message : '连接测试失败'); } }
  private async writeTransaction<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await this.db.$transaction(operation, { isolationLevel: 'Serializable', timeout: 15000 }); }
      catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
        const sqlCode = (error as { meta?: { code?: string } })?.meta?.code;
        if (!['P2034', 'P2002'].includes(String(code)) && !(code === 'P2010' && (['40001', '40P01'].includes(String(sqlCode)) || (error instanceof Error && /Code: `(?:40001|40P01)`/.test(error.message))))) throw error;
        if (attempt === 2) throw new ApiException('BAD_REQUEST', 409, '资料同时发生变更，请重试');
      }
    }
    throw new ApiException('SERVICE_UNAVAILABLE', 503, '分析保存暂不可用');
  }
  private async scope(tx: Tx, code: string, id: string) {
    z.string().uuid().parse(id);
    const app = await tx.sysApplication.findFirst({ where: { applicationCode: code, status: 'ACTIVE' } });
    if (!app || !await tx.sdOpp.findFirst({ where: { id, applicationId: app.id, tenantId: app.tenantId } })) throw new ApiException('NOT_FOUND', 404, '商机不存在');
    return app;
  }
  private async snapshot(tx: Tx, code: string, id: string, focus = '', issues: AiSnapshot['issues'] = [], excludeAnalysisId?: string): Promise<AiSnapshot> {
    const app = await this.scope(tx, code, id);
    const opp = await tx.sdOpp.findFirstOrThrow({ where: { id, applicationId: app.id }, include: {
      products: { orderBy: [{ sortNo: 'asc' }, { id: 'asc' }] },
      followUps: { where: { status: 'ACTIVE' }, orderBy: [{ followedAt: 'desc' }, { id: 'asc' }] },
      analyses: { where: excludeAnalysisId ? { id: { not: excludeAnalysisId } } : {}, include: { competitors: { orderBy: { rank: 'asc' } } }, orderBy: [{ analyzedAt: 'desc' }, { id: 'asc' }] },
    } });
    const competitorIds = [...new Set(opp.analyses.flatMap(a => a.competitors.map(c => c.competitorId)))];
    const competitors = await tx.sdCompetitor.findMany({ where: { id: { in: competitorIds }, tenantId: app.tenantId }, orderBy: { id: 'asc' } });
    const sources: AiSource[] = [{ id: `O:${opp.id}`, kind: 'opportunity', title: `${opp.opportunityCode} ${opp.opportunityName}`, content: { name: opp.opportunityName, customer: opp.customerName, stage: opp.stageName, businessStatus: opp.businessStatus, signedDate: opp.signedDate?.toISOString() ?? null, lostDate: opp.lostDate?.toISOString() ?? null, expectedSignDate: opp.expectedSignDate?.toISOString() ?? null, budget: opp.customerBudget?.toString() ?? null, salesAmount: opp.expectedAmount?.toString() ?? null, remark: opp.remark, version: opp.version } },
      ...opp.products.map(p => ({ id: `P:${p.id}`, kind: 'product', title: p.productName, content: { name: p.productName, model: p.model, quantity: p.quantity.toString(), salesUnitPrice: p.unitPrice.toString(), requirement: p.requirement } })),
      ...opp.followUps.map(f => ({ id: `F:${f.id}`, kind: 'follow-up', title: `跟进 ${f.followedAt.toISOString()}`, content: { date: f.followedAt.toISOString(), workItem: f.workItem, resultNext: f.resultNext, version: f.version } })),
      ...competitors.map(c => ({ id: `C:${c.id}`, kind: 'competitor', title: c.competitorName, content: { name: c.competitorName, industryPosition: c.industryPosition, mainProducts: c.mainProducts, strengths: c.strengths, weaknesses: c.weaknesses, remark: c.remark, status: c.status, version: c.version } })),
      ...opp.analyses.map(a => ({ id: `A:${a.id}`, kind: 'historical-analysis', title: `历史${a.aiTaskId ? 'AI辅助' : '人工'}分析 ${a.analyzedAt.toISOString()}`, content: { historicalOpinionOnly: true, opportunityPoint: a.opportunityPoint, risk: a.risk, nextPlan: a.nextPlan, remark: a.remark, ...(a.aiResult ? { structuredResult: a.aiResult } : {}) } })),
    ];
    // Hash business records only; supplemental notes are fixed per task.
    const hash = snapshotHash(sources);
    if (focus || issues.length) sources.push({ id: 'SUPPLEMENT', kind: 'supplement', title: '本次人工补充', content: { focus, issues } });
    return { capturedAt: new Date().toISOString(), hash, sources, focus, issues, opportunity: { id, name: opp.opportunityName, stageId: opp.stageId, stageName: opp.stageName, stageProbability: opp.stageProbability, confidence: opp.confidence } };
  }
  snapshotInTransaction(tx: Tx, code: string, id: string) { return this.snapshot(tx, code, id); }
  async preview(code: string, id: string) {
    const snapshot = await this.db.$transaction(tx => this.snapshot(tx, code, id), { isolationLevel: 'RepeatableRead' });
    return { snapshot, configuration: this.status(), inputChars: JSON.stringify(snapshot).length };
  }
  async start(code: string, id: string, userId: string, raw: unknown) {
    const input = aiStartSchema.parse(raw); const config = aiConfig();
    if (!config.configured) throw new ApiException('BAD_REQUEST', 400, '尚未配置AI服务，请联系管理员');
    const row = await this.writeTransaction(async tx => {
      const scope = await this.scope(tx, code, id);
      // Serialize request deduplication and quotas per actor without holding locks during model calls.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${scope.id + ':' + userId}))::text`;
      const existing = await tx.aiAnalysisTask.findUnique({ where: { applicationId_createdBy_requestId: { applicationId: scope.id, createdBy: userId, requestId: input.requestId } } });
      if (existing) { if (existing.opportunityId !== id) throw new ApiException('BAD_REQUEST', 409, '请求编号已用于其他商机'); return existing; }
      if (await tx.aiAnalysisTask.count({ where: { applicationId: scope.id, createdBy: userId, status: { in: ['QUEUED', 'RUNNING'] } } })) throw new ApiException('BAD_REQUEST', 409, '已有AI分析任务处理中，请完成后再试');
      if (await tx.aiAnalysisTask.count({ where: { applicationId: scope.id, createdBy: userId, createdAt: { gte: new Date(Date.now() - 86400000) } } }) >= config.dailyLimit) throw new ApiException('BAD_REQUEST', 429, '已达到最近24小时AI分析次数限制');
      if (input.parentTaskId && !await tx.aiAnalysisTask.findFirst({ where: { id: input.parentTaskId, applicationId: scope.id, opportunityId: id, createdBy: userId } })) throw new ApiException('NOT_FOUND', 404, '上一版分析不存在');
      const snapshot = await this.snapshot(tx, code, id, input.focus, input.issues);
      if (JSON.stringify(snapshot).length > config.maxInputChars) throw new ApiException('BAD_REQUEST', 400, '商机资料超出AI输入上限，未截断或发送资料；请联系管理员调整上限');
      const task = await tx.aiAnalysisTask.create({ data: { applicationId: scope.id, tenantId: scope.tenantId, systemCode: code, opportunityId: id, createdBy: userId, requestId: input.requestId, parentTaskId: input.parentTaskId, snapshot: json(snapshot), provider: config.provider, model: config.model, templateVersion: TEMPLATE_VERSION, schemaVersion: SCHEMA_VERSION } });
      await tx.sysAuditLog.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, actorUserId: userId, actionCode: 'opportunity.ai.start', resourceType: 'ai-analysis', resourceId: task.id, requestId: input.requestId, afterSnapshot: { model: config.model, provider: config.provider, snapshotHash: snapshot.hash } } });
      return task;
    });
    return this.dto(row, userId);
  }
  async list(code: string, id: string, userId: string, page = 1) {
    return this.db.$transaction(async tx => {
      const scope = await this.scope(tx, code, id); const where = { applicationId: scope.id, opportunityId: id, OR: [{ createdBy: userId }, { analysisId: { not: null } }] };
      const [rows, total] = await Promise.all([tx.aiAnalysisTask.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 20, skip: (page - 1) * 20 }), tx.aiAnalysisTask.count({ where })]);
      return { items: rows.map(row => this.dto(row, userId)), total, page };
    });
  }
  private async task(tx: Tx, code: string, id: string, taskId: string, userId: string, ownerOnly = false) {
    z.string().uuid().parse(taskId); const scope = await this.scope(tx, code, id);
    const row = await tx.aiAnalysisTask.findFirst({ where: { id: taskId, applicationId: scope.id, opportunityId: id, ...(ownerOnly ? { createdBy: userId } : { OR: [{ createdBy: userId }, { analysisId: { not: null } }] }) } });
    if (!row) throw new ApiException('NOT_FOUND', 404, '分析记录不存在');
    return row;
  }
  async detail(code: string, id: string, taskId: string, userId: string) {
    return this.db.$transaction(async tx => {
      const row = await this.task(tx, code, id, taskId, userId);
      const current = await this.snapshot(tx, code, id, '', [], row.analysisId ?? undefined);
      return { ...this.dto(row, userId), stale: current.hash !== (row.snapshot as unknown as AiSnapshot).hash };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async confirm(code: string, id: string, taskId: string, userId: string, raw: unknown) {
    const input = aiConfirmSchema.parse(raw);
    return this.writeTransaction(async tx => {
      await this.task(tx, code, id, taskId, userId, true);
      await tx.$queryRaw`SELECT id FROM ai_analysis_task WHERE id=${taskId}::uuid FOR UPDATE`;
      const row = await this.task(tx, code, id, taskId, userId, true);
      if (row.analysisId) return this.dto(row, userId);
      if (row.status !== 'SUCCEEDED') throw new ApiException('BAD_REQUEST', 409, '分析尚未成功，不能确认保存');
      const snapshot = row.snapshot as unknown as AiSnapshot;
      let result;
      try { result = parseAnalysisResult(input.result, snapshot.sources); } catch { throw new ApiException('BAD_REQUEST', 400, '分析结构或引用依据无效'); }
      const current = await this.snapshot(tx, code, id);
      const stale = current.hash !== snapshot.hash;
      if (stale && !input.acceptStale) throw new ApiException('BAD_REQUEST', 409, '已有新资料，请重新分析或勾选保留旧快照后保存', { reason: 'AI_SNAPSHOT_STALE' });
      const actor = await tx.iamUser.findFirst({ where: { id: userId, tenantId: row.tenantId, status: 'ACTIVE' } });
      if (!actor) throw new ApiException('FORBIDDEN', 403, '分析人不可用');
      const text = (key: string) => result.sections.find(s => s.key === key)!.items.map(i => i.text).join('\n');
      // Six full sections live in aiResult (JSON); legacy columns are deliberately short labels, never truncated analysis.
      const summary = (key: keyof typeof aiSectionTitles) => text(key).length <= 2000 ? text(key) : `${aiSectionTitles[key]}详见完整AI分析记录`;
      const analysis = await tx.sdOppAnalysis.create({ data: { opportunityId: id, opportunityName: snapshot.opportunity.name, stageId: snapshot.opportunity.stageId, stageName: snapshot.opportunity.stageName, stageProbability: snapshot.opportunity.stageProbability, confidence: snapshot.opportunity.confidence, opportunityPoint: summary('summary'), risk: summary('risks'), nextPlan: summary('actions'), remark: `${row.provider === 'mock' ? '模拟结果；' : ''}资料截至：${snapshot.capturedAt}${stale ? '；确认时资料已更新' : ''}`, analystUserId: userId, analystName: actor.displayName, aiTaskId: row.id, aiResult: json(result) } });
      const saved = await tx.aiAnalysisTask.update({ where: { id: row.id }, data: { analysisId: analysis.id, confirmedResult: json(result), confirmedAt: new Date(), staleAtConfirmation: stale } });
      await tx.sysAuditLog.create({ data: { tenantId: row.tenantId, applicationId: row.applicationId, actorUserId: userId, actionCode: 'opportunity.ai.confirm', resourceType: 'ai-analysis', resourceId: row.id, requestId: row.requestId, afterSnapshot: { analysisId: analysis.id, stale } } });
      return this.dto(saved, userId);
    });
  }
  private dto(row: AiAnalysisTask, userId: string): AiTask {
    return { id: row.id, opportunityId: row.opportunityId, status: row.status as AiTask['status'], createdAt: row.createdAt.toISOString(), createdBy: row.createdBy, model: row.model, provider: row.provider, templateVersion: row.templateVersion, schemaVersion: row.schemaVersion, snapshot: row.snapshot as unknown as AiSnapshot, result: row.result as unknown as AiTask['result'], confirmedResult: row.confirmedResult as unknown as AiTask['result'], analysisId: row.analysisId, confirmedAt: row.confirmedAt?.toISOString() ?? null, staleAtConfirmation: row.staleAtConfirmation, error: row.error, parentTaskId: row.parentTaskId, isOwner: row.createdBy === userId };
  }
  async tick() {
    if (this.working) return; this.working = true;
    try {
      await this.db.aiAnalysisTask.updateMany({ where: { status: 'RUNNING', startedAt: { lt: new Date(Date.now() - 8 * 60000) } }, data: { status: 'FAILED', error: '分析任务中断或超时，请重新生成', finishedAt: new Date() } });
      const claimed = await this.db.$transaction(async tx => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM ai_analysis_task WHERE status='QUEUED' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`;
        return rows.length ? tx.aiAnalysisTask.update({ where: { id: rows[0].id }, data: { status: 'RUNNING', startedAt: new Date() } }) : null;
      });
      if (!claimed) return;
      try {
        await this.authorization.assertAction(claimed.createdBy, claimed.systemCode, 'opportunity-directory', 'view');
        await this.authorization.assertAction(claimed.createdBy, claimed.systemCode, 'opportunity-directory', 'ai-analyze');
        const config = aiConfig();
        if (config.provider !== claimed.provider || config.model !== claimed.model) throw new Error('模型配置已变更，请重新生成');
        const generated = await this.provider.analyze(claimed.snapshot as unknown as AiSnapshot);
        await this.db.aiAnalysisTask.updateMany({ where: { id: claimed.id, status: 'RUNNING' }, data: { status: 'SUCCEEDED', result: json(generated.result), providerRequestId: generated.requestId, usage: json({ ...generated.usage, resolvedModel: generated.model }), finishedAt: new Date() } });
      } catch (e) {
        const message = e instanceof ApiException ? '分析权限已变更，任务未执行' : e instanceof Error && /^(AI|尚未|模型)/.test(e.message) ? e.message : '分析失败，请稍后重试';
        await this.db.aiAnalysisTask.updateMany({ where: { id: claimed.id, status: 'RUNNING' }, data: { status: 'FAILED', error: message.slice(0, 500), finishedAt: new Date() } });
      }
    } catch { this.logger.error('AI task worker unavailable; check database connectivity and migrations'); }
    finally { this.working = false; }
  }
}
