import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { AgentService } from '../agent/agent.service';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { QuotationService } from '../quotation/quotation.service';
import { OpportunityService } from './opportunity.service';
import { ListViewService } from '../list-view/list-view.service';
import { businessListDefaultConfig, listViewConfigSchema, opportunityBoardSchema } from '@forge-crm/contracts';
import { resolveEffectiveRoleIds } from '../rbac/role-scope';
const run = process.env.RUN_KANBAN_DB_TESTS === '1' ? describe : describe.skip;
run('P2 kanban actual PostgreSQL', () => {
 let app: INestApplication, db: DatabaseService, service: OpportunityService;
 let scope: { id: string; tenantId: string }, templateId: string, first: string, second: string, disabled: string, actorId: string;
 let copy: any, serial = 0;
 const make = (extra: Record<string, unknown> = {}) => db.sdOpp.create({ data: { ...copy, id: randomUUID(), opportunityCode: `KB-${++serial}`, opportunityName: 'KB-test', templateId, stageId: first, stageName: '阶段一', businessStatus: 'FOLLOWING', expectedSignDate: null, signedDate: null, lostDate: null, status: 'ACTIVE', version: 1, ...extra } });
 const cmd = (stageId: string, version = 1) => ({ stageId, version, requestId: randomUUID(), reason: '客户完成技术确认' });
 beforeAll(async () => {
   if (!/^\/sdd_kanban_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL!).pathname)) throw new Error('ISOLATED_DB_REQUIRED');
   app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
   app.use(cookieParser()); app.useGlobalFilters(new ApiExceptionFilter()); await app.init();
   app.get(AgentService).onModuleDestroy(); app.get(AiAnalysisService).onModuleDestroy(); app.get(QuotationService).onModuleDestroy();
   db = app.get(DatabaseService); service = app.get(OpportunityService);
   scope = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } });
   actorId = (await db.iamUser.findFirstOrThrow({ where: { tenantId: scope.tenantId, account: 'admin' } })).id;
   copy = await db.sdOpp.findFirstOrThrow({ where: { applicationId: scope.id } });
   const t = await db.sdOppTemplate.create({ data: { applicationId: scope.id, tenantId: scope.tenantId, templateCode: 'KB-T', templateName: '看板测试', createdBy: 'test', updatedBy: 'test' } }); templateId = t.id;
   const stage = (code: string, sortNo: number, status: 'ACTIVE' | 'DISABLED' = 'ACTIVE') => db.sdOppStage.create({ data: { templateId, stageCode: code, stageName: code, sortNo, probability: 20, status, createdBy: 'test', updatedBy: 'test' } });
   first = (await stage('阶段一', 1)).id; second = (await stage('阶段二', 2)).id; disabled = (await stage('停用阶段', 3, 'DISABLED')).id;
 }, 60000);
 afterAll(async () => { await app?.close(); });
 it('summarizes all filtered rows with exact money and stable independent paging, retaining historical columns', async () => {
   for (let n = 0; n < 21; n++) await make({ opportunityName: 'KB-aggregate', expectedAmount: n === 20 ? null : '0.10' });
   await make({ opportunityName: 'KB-aggregate', stageId: disabled, expectedAmount: '5.00' });
   await make({ opportunityName: 'KB-aggregate', businessStatus: 'SIGNED', expectedAmount: '900.00' });
   await make({ opportunityName: 'KB-aggregate', status: 'DISABLED' });
   const data = await service.board('demo-portal', { templateId, keyword: 'KB-aggregate' });
   expect(opportunityBoardSchema.safeParse(data).success).toBe(true);
   expect(data.columns.map(c => c.stage.id)).toEqual([first, second, disabled]);
   expect(data.columns[0]).toMatchObject({ total: 21, amount: '2.00', missingAmount: 1 }); expect(data.columns[0].items).toHaveLength(20);
   const next = await service.board('demo-portal', { templateId, keyword: 'KB-aggregate', stageId: first, after: data.columns[0].nextCursor });
   expect(next.columns[0].items).toHaveLength(1); expect(next.columns[0].nextCursor).toBeNull(); expect(next.columns[0].total).toBe(21);
   expect(new Set([...data.columns[0].items, ...next.columns[0].items].map(r => r.id)).size).toBe(21);
   const history = await service.board('demo-portal', { templateId, keyword: 'KB-aggregate', businessStatus: 'SIGNED' }); expect(history.columns[0].total).toBe(1);
 });
 it('moves atomically, retries idempotently, rejects changed payload and stale versions, never changes lifecycle', async () => {
   const row = await make(), input = cmd(second);
   const result = await service.changeStage('demo-portal', row.id, 'admin', input);
   expect(result.opportunity).toMatchObject({ stageId: second, businessStatus: 'FOLLOWING', version: 2 });
   await service.changeStage('demo-portal', row.id, 'admin', input);
   expect(await db.sdOppStageEvent.count({ where: { opportunityId: row.id } })).toBe(1);
   await expect(service.changeStage('demo-portal', row.id, 'admin', { ...input, reason: 'different' })).rejects.toThrow('请求号');
   await expect(service.changeStage('demo-portal', row.id, 'admin', cmd(first))).rejects.toThrow('已被其他');
   const event = await db.sdOppStageEvent.findFirstOrThrow({ where: { opportunityId: row.id } }); expect(event).toMatchObject({ fromStageId: first, toStageId: second, reason: input.reason, source: 'KANBAN', actor: 'admin' });
 });
 it('serializes concurrent duplicate commands and detects different commands at the same version', async () => {
   const row = await make(), input = cmd(second);
   await Promise.all([service.changeStage('demo-portal', row.id, 'admin', input), service.changeStage('demo-portal', row.id, 'admin', input)]);
   expect(await db.sdOppStageEvent.count({ where: { opportunityId: row.id } })).toBe(1);
   const other = await make(); const results = await Promise.allSettled([service.changeStage('demo-portal', other.id, 'admin', cmd(second)), service.changeStage('demo-portal', other.id, 'admin', cmd(second))]);
   expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(1);
 });
 it('rejects closed/disabled sources, disabled/cross-template targets and blank reasons without events', async () => {
   for (const businessStatus of ['SIGNED','LOST','VOID'] as const) { const row = await make({ businessStatus }); await expect(service.changeStage('demo-portal', row.id, 'admin', cmd(second))).rejects.toThrow('已关闭'); }
   for (const extra of [{ status: 'DISABLED' }, { stageId: disabled }]) { const row = await make(extra); await expect(service.changeStage('demo-portal', row.id, 'admin', cmd(second))).rejects.toThrow(); }
   const row = await make(); await expect(service.changeStage('demo-portal', row.id, 'admin', cmd(disabled))).rejects.toThrow('停用');
   await expect(service.changeStage('demo-portal', row.id, 'admin', cmd(copy.stageId))).rejects.toThrow('模板');
   await expect(service.changeStage('demo-portal', row.id, 'admin', { ...cmd(second), reason: ' ' })).rejects.toThrow();
   await service.changeStage('demo-portal', row.id, 'admin', cmd(first)); expect(await db.sdOppStageEvent.count({ where: { opportunityId: row.id } })).toBe(0);
 });
 it('detail and analysis use the same stage validation/events; failed writes roll back events', async () => {
   const row = await make();
   await expect(service.updateOpportunity('demo-portal', row.id, 'admin', { version: 1, stageId: second })).rejects.toThrow('理由');
   expect((await db.sdOpp.findUniqueOrThrow({ where: { id: row.id } })).version).toBe(1);
   await service.updateOpportunity('demo-portal', row.id, 'admin', { version: 1, stageId: second, stageReason: '详情修正' });
   const result = await service.createAnalysis('demo-portal', row.id, actorId, { stageId: first, opportunityVersion: 2, confidence: 50, opportunityPoint: '真实机会点', risk: '真实风险', nextPlan: '真实计划', stageReason: '分析后回退' });
   expect(result.analyses).toHaveLength(1); expect(result.analyses[0].opportunityPoint).toBe('真实机会点');
   expect(await db.sdOppStageEvent.findMany({ where: { opportunityId: row.id }, orderBy: { createdAt: 'asc' } })).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'DETAIL' }), expect.objectContaining({ source: 'ANALYSIS' })]));
   const invalid = await make(); await expect(service.updateOpportunity('demo-portal', invalid.id, 'admin', { version: 1, stageId: second, stageReason: '必须回滚', products: [{ productId: randomUUID(), quantity: 1, unitPrice: 1, sortNo: 0 }] })).rejects.toThrow();
   expect(await db.sdOppStageEvent.count({ where: { opportunityId: invalid.id } })).toBe(0);
   expect((await db.sdOpp.findUniqueOrThrow({ where: { id: invalid.id } })).stageId).toBe(first);
 });
 it('rejects a target disabled by a concurrent stage-configuration transaction', async () => {
   const row = await make(); let locked!: () => void, release!: () => void;
   const ready = new Promise<void>(r => { locked = r; }), done = new Promise<void>(r => { release = r; });
   const config = db.$transaction(async tx => {
     await tx.sdOppTemplate.update({ where: { id: templateId }, data: { version: { increment: 1 } } });
     await tx.sdOppStage.update({ where: { id: second }, data: { status: 'DISABLED', version: { increment: 1 } } }); locked(); await done;
   });
   await ready;
   const change = service.changeStage('demo-portal', row.id, 'admin', cmd(second));
   release(); await config; await expect(change).rejects.toThrow();
   expect(await db.sdOppStageEvent.count({ where: { opportunityId: row.id } })).toBe(0);
   await db.sdOppStage.update({ where: { id: second }, data: { status: 'ACTIVE', version: { increment: 1 } } });
 });
 it('database enforces scope foreign key, event uniqueness and changed-stage constraint', async () => {
   const row = await make(); await service.changeStage('demo-portal', row.id, 'admin', cmd(second));
   const event = await db.sdOppStageEvent.findFirstOrThrow({ where: { opportunityId: row.id } });
   await expect(db.sdOppStageEvent.create({ data: { ...event, id: randomUUID() } })).rejects.toThrow();
   await expect(db.sdOppStageEvent.create({ data: { ...event, id: randomUUID(), requestId: randomUUID(), tenantId: randomUUID() } })).rejects.toThrow();
   await expect(db.sdOppStageEvent.create({ data: { ...event, id: randomUUID(), requestId: randomUUID(), toStageId: event.fromStageId } })).rejects.toThrow();
   await expect(db.sdOpp.delete({ where: { id: row.id } })).rejects.toThrow();
 });
 it('persists personal board settings without changing columns and denies fields outside the system baseline', async () => {
   const views = app.get(ListViewService); const resolved = await views.resolve(actorId, 'demo-portal', 'opportunity-directory', 'view');
   const base = resolved.views.find(v => v.scope === 'SYSTEM')!;
   expect(listViewConfigSchema.parse(businessListDefaultConfig('opportunity-directory')).viewMode).toBeUndefined();
   const created = await views.createPersonal(actorId, 'demo-portal', 'opportunity-directory', 'view', { baseViewId: base.id, viewName: '看板测试', isDefault: true, config: { ...base.config, viewMode: 'KANBAN', schemaVersion: 2, kanban: { templateId, cardFields: ['customerName'] } } });
   const after = await views.resolve(actorId, 'demo-portal', 'opportunity-directory', 'view'); const saved = after.views.find(v => v.id === created.id)!; expect(saved.config.viewMode).toBe('KANBAN'); expect(saved.config.columns).toEqual(base.config.columns);
   await expect(views.createPersonal(actorId, 'demo-portal', 'opportunity-directory', 'view', { baseViewId: base.id, viewName: '无效', isDefault: false, config: { ...base.config, viewMode: 'KANBAN', kanban: { templateId, cardFields: ['remark'] } } })).rejects.toThrow();
 });
 it('enforces authenticated view/update permissions at HTTP boundary', async () => {
   const viewer = await db.iamUser.findFirstOrThrow({ where: { tenantId: scope.tenantId, account: 'viewer' } });
   const roles = await resolveEffectiveRoleIds(db, scope.id, viewer.id);
   await db.iamRolePermission.updateMany({ where: { roleId: { in: roles }, permission: { resourceCode: 'opportunity-directory', actionCode: 'update' } }, data: { status: 'DISABLED' } });
   const api = request.agent(app.getHttpServer()); const session = await api.get('/api/auth/session');
   const csrf = (session.headers['set-cookie'] as unknown as string[]).map(c => c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
   expect((await api.post('/api/auth/login').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send({ account: 'viewer', password: process.env.INITIAL_VIEWER_PASSWORD })).status).toBe(201);
   const fresh = await api.get('/api/auth/session'); const token = (fresh.headers['set-cookie'] as unknown as string[] | undefined)?.map(c => c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean) ?? csrf;
   const row = await make();
   expect((await api.get(`/api/systems/demo-portal/opportunities/board?templateId=${templateId}`)).status).toBe(200);
   const denied = await api.post(`/api/systems/demo-portal/opportunities/${row.id}/stage`).set('Origin','http://localhost:5173').set('X-CSRF-Token',token).send(cmd(second)); expect(denied.status).toBe(403); expect(JSON.stringify(denied.body)).not.toMatch(/CSRF|来源/);
 });
});
