import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { z } from 'zod';
import { agentStartSchema, agentSaveSchema, type AgentTask as TaskDto, type AgentStep, type AiSnapshot, type AiResult } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../rbac/authorization.service';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { aiConfig } from '../ai/ai-provider';
import { parseAnalysisResult } from '../ai/analysis-domain';
import { ApiException } from '../http/api-exceptions';
import type { AgentTask, Prisma } from '../generated/prisma/client';
import { AgentRuntime } from './agent-runtime';
import { agentModel } from './agent-provider';
import { opportunityAgentTools, opportunityAgentInstructions, opportunityToolDefinitions } from './opportunity-agent.tools';
const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v));
@Injectable()
export class AgentService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>; private working = false; private readonly logger = new Logger(AgentService.name);
  constructor(private readonly db: DatabaseService, private readonly authorization: AuthorizationService, private readonly analysis: AiAnalysisService, private readonly runtime: AgentRuntime) {}
  onModuleInit() { this.timer = setInterval(() => void this.tick(), 2000); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async scope(code: string, id: string) {
    z.string().uuid().parse(id); const app = await this.db.sysApplication.findFirst({ where: { applicationCode: code, status: 'ACTIVE' } });
    if (!app || !await this.db.sdOpp.findFirst({ where: { id, tenantId: app.tenantId, applicationId: app.id } })) throw new ApiException('NOT_FOUND', 404, '商机不存在');
    return app;
  }
  private async authorize(user: string, code: string, save = false) {
    for (const action of ['view', 'ai-analyze', ...(save ? ['follow-up'] : [])]) await this.authorization.assertAction(user, code, 'opportunity-directory', action);
    if (!await this.db.iamUser.findFirst({ where: { id: user, status: 'ACTIVE' } })) throw new ApiException('FORBIDDEN', 403, '用户已停用');
  }
  private async transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let i = 0; ; i++) {
      try { return await this.db.$transaction(operation, { isolationLevel: 'Serializable', timeout: 15000 }); }
      catch (e) { const error = e as { code?: string; meta?: { code?: string } }; const retry = ['P2034', 'P2002'].includes(String(error.code)) || (error.code === 'P2010' && (['40001', '40P01'].includes(String(error.meta?.code)) || (e instanceof Error && /Code: `(?:40001|40P01)`/.test(e.message)))); if (i >= 2 || !retry) throw e; }
    }
  }
  private dto(row: AgentTask): TaskDto {
    return { id: row.id, contextId: row.contextId, contextType: row.contextType, mode: row.mode as TaskDto['mode'], instruction: row.instruction, status: row.status as TaskDto['status'], snapshot: row.snapshot as unknown as AiSnapshot, steps: row.steps as unknown as AgentStep[], result: row.result as unknown as AiResult | null, confirmedResult: row.confirmedResult as unknown as AiResult | null, plan: row.plan as unknown as TaskDto['plan'], followUpId: row.followUpId, provider: row.provider, model: row.model, error: row.error, createdAt: row.createdAt.toISOString() };
  }
  async preview(code: string, id: string, user: string) { await this.authorize(user, code); const data = await this.analysis.preview(code, id); return { configuration: data.configuration, contextName: data.snapshot.opportunity.name, tools: opportunityToolDefinitions.map(({ name, label }) => ({ name, label })) }; }
  async start(code: string, id: string, user: string, raw: unknown) {
    await this.authorize(user, code); const input = agentStartSchema.parse(raw), app = await this.scope(code, id), c = aiConfig();
    if (!c.configured) throw new ApiException('BAD_REQUEST', 400, 'Agent尚未配置模型，请联系管理员');
    const { snapshot } = await this.analysis.preview(code, id);
    if (JSON.stringify(snapshot).length > c.maxInputChars) throw new ApiException('BAD_REQUEST', 400, 'Agent资料超过输入上限');
    const row = await this.transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${app.id + ':' + user + ':agent'}))::text`;
      const existing = await tx.agentTask.findUnique({ where: { applicationId_createdBy_requestId: { applicationId: app.id, createdBy: user, requestId: input.requestId } } });
      if (existing) { if (existing.contextId !== id || existing.mode !== input.mode || existing.instruction !== input.instruction) throw new ApiException('BAD_REQUEST', 409, '请求号已用于其他任务'); return existing; }
      if (await tx.agentTask.count({ where: { applicationId: app.id, createdBy: user, status: { in: ['QUEUED', 'RUNNING'] } } })) throw new ApiException('BAD_REQUEST', 409, '已有Agent任务处理中');
      if (await tx.agentTask.count({ where: { applicationId: app.id, createdBy: user, createdAt: { gte: new Date(Date.now() - 86400000) } } }) >= c.dailyLimit) throw new ApiException('BAD_REQUEST', 429, 'Agent已达到最近24小时任务限额');
      const task = await tx.agentTask.create({ data: { applicationId: app.id, tenantId: app.tenantId, systemCode: code, contextType: 'opportunity', contextId: id, agentCode: 'opportunity-assistant-v1', createdBy: user, requestId: input.requestId, mode: input.mode, instruction: input.instruction, provider: c.provider, model: agentModel(), snapshot: json(snapshot), steps: [] } });
      await tx.sysAuditLog.create({ data: { tenantId: app.tenantId, applicationId: app.id, actorUserId: user, actionCode: 'agent.start', resourceType: 'agent-task', resourceId: task.id, requestId: input.requestId, afterSnapshot: { contextId: id, mode: input.mode } } });
      return task;
    }); return this.dto(row);
  }
  private async task(code: string, id: string, taskId: string, user: string) {
    await this.authorize(user, code); z.string().uuid().parse(taskId); const app = await this.scope(code, id);
    const task = await this.db.agentTask.findFirst({ where: { id: taskId, applicationId: app.id, tenantId: app.tenantId, contextType: 'opportunity', contextId: id, createdBy: user } });
    if (!task) throw new ApiException('NOT_FOUND', 404, 'Agent任务不存在'); return task;
  }
  async list(code: string, id: string, user: string, page: number) {
    await this.authorize(user, code); const app = await this.scope(code, id); const where = { applicationId: app.id, contextId: id, contextType: 'opportunity', createdBy: user };
    const [rows, total] = await this.db.$transaction([this.db.agentTask.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20 }), this.db.agentTask.count({ where })]);
    return { items: rows.map(row => this.dto(row)), total, page };
  }
  async detail(code: string, id: string, taskId: string, user: string) {
    const row = await this.task(code, id, taskId, user); const { snapshot } = await this.analysis.preview(code, id);
    return { ...this.dto(row), stale: !row.followUpId && snapshot.hash !== (row.snapshot as unknown as AiSnapshot).hash };
  }
  async cancel(code: string, id: string, taskId: string, user: string) {
    const row = await this.task(code, id, taskId, user);
    if (!['QUEUED', 'RUNNING'].includes(row.status)) throw new ApiException('BAD_REQUEST', 409, '任务已结束');
    await this.db.$transaction(async tx => {
      const change = await tx.agentTask.updateMany({ where: { id: row.id, status: { in: ['QUEUED', 'RUNNING'] } }, data: { status: 'CANCELLED', finishedAt: new Date() } });
      if (change.count) await tx.sysAuditLog.create({ data: { tenantId: row.tenantId, applicationId: row.applicationId, actorUserId: user, actionCode: 'agent.cancel', resourceType: 'agent-task', resourceId: row.id, requestId: row.requestId } });
    }); return this.dto(await this.task(code, id, taskId, user));
  }
  async save(code: string, id: string, taskId: string, user: string, raw: unknown) {
    await this.authorize(user, code, true); const input = agentSaveSchema.parse(raw); await this.task(code, id, taskId, user);
    return this.transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM agent_task WHERE id=${taskId}::uuid FOR UPDATE`;
      const row = await tx.agentTask.findUniqueOrThrow({ where: { id: taskId } }); if (row.followUpId) return this.dto(row);
      if (row.status !== 'SUCCEEDED') throw new ApiException('BAD_REQUEST', 409, '任务尚未成功');
      const snapshot = row.snapshot as unknown as AiSnapshot; const steps = row.steps as unknown as AgentStep[]; const seen = new Set(steps.filter(s => s.status === 'SUCCEEDED' && s.kind === 'TOOL').flatMap(s => s.sourceIds));
      let result; try { result = parseAnalysisResult(input.result, snapshot.sources.filter(s => seen.has(s.id))); } catch { throw new ApiException('BAD_REQUEST', 400, 'Agent结果或引用无效'); }
      // Lock the business object and detect concurrent edits before committing a plan.
      await tx.$queryRaw`SELECT id FROM sd_opp WHERE id=${id}::uuid FOR UPDATE`;
      const currentSnapshot = await this.analysis.snapshotInTransaction(tx, code, id);
      if (currentSnapshot.hash !== snapshot.hash && !input.acceptStale) throw new ApiException('BAD_REQUEST', 409, '商机资料已更新，请重新生成或确认按旧快照保存');
      const actor = await tx.iamUser.findFirstOrThrow({ where: { id: user, tenantId: row.tenantId, status: 'ACTIVE' } });
      const follow = await tx.sdOppFollowUp.create({ data: { opportunityId: id, followedAt: new Date(input.followedAt), followerUserId: user, followerName: actor.displayName, workItem: `[Agent沟通计划·待执行] ${input.workItem}`, resultNext: input.resultNext, status: 'ACTIVE', createdBy: actor.account, updatedBy: actor.account } });
      const saved = await tx.agentTask.update({ where: { id: row.id }, data: { confirmedResult: json(result), plan: json(input), followUpId: follow.id } });
      await tx.sysAuditLog.create({ data: { tenantId: row.tenantId, applicationId: row.applicationId, actorUserId: user, actionCode: 'agent.save-plan', resourceType: 'agent-task', resourceId: row.id, requestId: row.requestId, afterSnapshot: { followUpId: follow.id, sourceHash: snapshot.hash, stale: currentSnapshot.hash !== snapshot.hash } } });
      return this.dto(saved);
    });
  }
  async tick() {
    if (this.working) return; this.working = true;
    try {
      await this.db.agentTask.updateMany({ where: { status: 'RUNNING', startedAt: { lt: new Date(Date.now() - 8 * 60000) } }, data: { status: 'FAILED', error: 'Agent任务中断或超时，请重新发起', finishedAt: new Date() } });
      const row = await this.db.$transaction(async tx => { const ids = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM agent_task WHERE status='QUEUED' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`; return ids.length ? tx.agentTask.update({ where: { id: ids[0].id }, data: { status: 'RUNNING', startedAt: new Date() } }) : null; });
      if (!row) return;
      const steps: AgentStep[] = [];
      const check = async (step?: AgentStep) => {
        await this.authorize(row.createdBy, row.systemCode); await this.scope(row.systemCode, row.contextId);
        if (step) { const index = steps.findIndex(s => s.id === step.id); if (index < 0) steps.push(step); else steps[index] = step; }
        const changed = await this.db.agentTask.updateMany({ where: { id: row.id, status: 'RUNNING' }, data: { steps: json(steps) } });
        if (!changed.count) throw new Error('Agent任务已取消或结束');
      };
      try {
        if (row.contextType !== 'opportunity' || row.agentCode !== 'opportunity-assistant-v1') throw new Error('Agent配置不支持');
        const config = aiConfig(); if (row.provider !== config.provider || row.model !== agentModel()) throw new Error('Agent模型配置已变更，请重新生成');
        const snapshot = row.snapshot as unknown as AiSnapshot;
        const generated = await this.runtime.run({ system: opportunityAgentInstructions(row.mode as TaskDto['mode']), request: JSON.stringify({ task: row.mode, instruction: row.instruction, context: snapshot.opportunity.name }), tools: opportunityAgentTools(snapshot, check), checkpoint: check });
        for (const definition of opportunityToolDefinitions.slice(0, 2)) if (!steps.some(s => s.kind === 'TOOL' && s.label === definition.label && s.status === 'SUCCEEDED')) throw new Error('Agent没有读取必需的商机或跟进资料');
        const result = parseAnalysisResult(generated.raw, generated.sources);
        await this.db.agentTask.updateMany({ where: { id: row.id, status: 'RUNNING' }, data: { result: json(result), usage: json(generated.usage), status: 'SUCCEEDED', finishedAt: new Date() } });
      } catch (e) {
        const message = e instanceof Error && e.message.startsWith('Agent') ? e.message : e instanceof ApiException ? 'Agent权限已变更，停止执行' : 'Agent处理或结果校验失败，请重试';
        await this.db.agentTask.updateMany({ where: { id: row.id, status: 'RUNNING' }, data: { status: 'FAILED', error: message.slice(0, 500), finishedAt: new Date() } });
      }
    } catch { this.logger.error('Agent任务队列不可用，请检查数据库和迁移'); }
    finally { this.working = false; }
  }
}
