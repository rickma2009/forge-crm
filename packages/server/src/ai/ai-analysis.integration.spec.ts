import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { AiAnalysisService } from './ai-analysis.service';
import { AiProvider } from './ai-provider';
import type { AiSnapshot } from '@forge-crm/contracts';
import { mockAnalysis } from './analysis-domain';
const run = process.env.RUN_AI_DB_TESTS === '1' ? describe : describe.skip;
run('AI analysis real database and authenticated API', () => {
  let app: INestApplication, db: DatabaseService, agent: ReturnType<typeof request.agent>, csrf: string, id: string, userId: string;
  const base = () => `/api/systems/demo-portal/opportunities/${id}/ai-analyses`;
  const post = (url: string, body: object) => agent.post(url).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrf).send(body);
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/sdd_ai_')) throw new Error('ISOLATED_AI_TEST_DATABASE_REQUIRED');
    process.env.AI_PROVIDER = 'mock'; process.env.AI_MODEL = 'mock';
    app = (await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(AiProvider).useValue({ status: () => ({ configured: true, provider: 'mock', model: 'mock' }), analyze: async (s: AiSnapshot) => ({ result: mockAnalysis(s.sources), requestId: null, usage: {}, model: 'mock' }) }).compile()).createNestApplication();
    app.use(cookieParser()); app.useGlobalFilters(new ApiExceptionFilter()); await app.init();
    app.get(AiAnalysisService).onModuleDestroy(); // deterministic worker ticks below
    db = app.get(DatabaseService); agent = request.agent(app.getHttpServer());
    const session = await agent.get('/api/auth/session'); csrf = (session.headers['set-cookie'] as unknown as string[]).map(c => c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
    const login = await post('/api/auth/login', { account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD }); expect(login.status).toBe(201);
    const opp = await db.sdOpp.findFirstOrThrow({ where: { systemCode: 'demo-portal' } }); id = opp.id;
    userId = (await db.iamUser.findFirstOrThrow({ where: { account: 'admin' } })).id;
  }, 30000);
  afterAll(async () => { await app?.close(); });
  it('persists jobs, deduplicates generation, checks stale data, saves once and never changes opportunity state', async () => {
    const before = await db.sdOpp.findUniqueOrThrow({ where: { id } });
    const input = { requestId: randomUUID(), focus: '交期', issues: [] };
    const [a, b] = await Promise.all([post(base(), input), post(base(), input)]);
    expect(a.status).toBe(201); expect(b.status).toBe(201); expect(a.body.id).toBe(b.body.id);
    const taskId = a.body.id;
    const conflict = await post(base(), { ...input, requestId: randomUUID() }); expect(conflict.status).toBe(409);
    await app.get(AiAnalysisService).tick();
    const draft = await agent.get(`${base()}/${taskId}`); expect(draft.body.status).toBe('SUCCEEDED'); expect(draft.body.result.sections).toHaveLength(6);
    expect(draft.body.analysisId).toBeNull();
    const stranger = (await db.iamUser.findFirstOrThrow({ where: { account: { not: 'admin' }, status: 'ACTIVE' } })).id;
    expect((await app.get(AiAnalysisService).list('demo-portal', id, stranger)).items).toHaveLength(0);
    await expect(app.get(AiAnalysisService).detail('demo-portal', id, taskId, stranger)).rejects.toThrow('不存在');
    expect((await agent.get(`/api/systems/demo-portal/opportunities/${randomUUID()}/ai-analyses/${taskId}`)).status).toBe(404);
    await db.sdOppFollowUp.create({ data: { opportunityId: id, followedAt: new Date(), followerUserId: userId, followerName: '测试', workItem: '新增交期要求', status: 'ACTIVE', createdBy: 'test', updatedBy: 'test' } });
    const stale = await post(`${base()}/${taskId}/confirm`, { result: draft.body.result }); expect(stale.status).toBe(409);
    const updated = structuredClone(draft.body.result); updated.sections[0].items[0].text = '人工确认后的完整内容';
    const [c, d] = await Promise.all([post(`${base()}/${taskId}/confirm`, { result: updated, acceptStale: true }), post(`${base()}/${taskId}/confirm`, { result: updated, acceptStale: true })]);
    expect(c.status).toBe(201); expect(d.status).toBe(201); expect(c.body.analysisId).toBe(d.body.analysisId); expect(c.body.staleAtConfirmation).toBe(true);
    expect(await db.sdOppAnalysis.count({ where: { aiTaskId: taskId } })).toBe(1);
    expect(c.body.result.sections[0].items[0].text).not.toBe(updated.sections[0].items[0].text);
    const after = await db.sdOpp.findUniqueOrThrow({ where: { id } });
    expect({ stage: after.stageId, probability: after.stageProbability, confidence: after.confidence, version: after.version }).toEqual({ stage: before.stageId, probability: before.stageProbability, confidence: before.confidence, version: before.version });
    const visible = await app.get(AiAnalysisService).detail('demo-portal', id, taskId, stranger); expect(visible.confirmedResult?.sections[0].items[0].text).toBe('人工确认后的完整内容');
    await expect(app.get(AiAnalysisService).confirm('demo-portal', id, taskId, stranger, { result: updated })).rejects.toThrow('不存在');
    const detail = await agent.get(`/api/systems/demo-portal/opportunities/${id}`); expect(detail.body.analyses.some((row: { aiTaskId: string }) => row.aiTaskId === taskId)).toBe(true);
    expect(JSON.stringify(c.body)).not.toContain('AI_AUTH_TOKEN');
  });
  it('fails interrupted tasks visibly instead of leaving them running forever', async () => {
    const created = await post(base(), { requestId: randomUUID() }); expect(created.status).toBe(201);
    await db.aiAnalysisTask.update({ where: { id: created.body.id }, data: { status: 'RUNNING', startedAt: new Date(Date.now() - 10 * 60000) } });
    await app.get(AiAnalysisService).tick();
    const done = await agent.get(`${base()}/${created.body.id}`); expect(done.body.status).toBe('FAILED'); expect(done.body.error).toContain('中断');
  });
  it('enforces the independent AI permission and CSRF at the HTTP boundary', async () => {
    const noCsrf = await agent.post(base()).set('Origin', 'http://localhost:5173').send({ requestId: randomUUID() }); expect(noCsrf.status).toBe(403);
    const permission = await db.sysPermission.findFirstOrThrow({ where: { permissionCode: 'menu.opportunity-directory.ai-analyze' } });
    await db.iamRolePermission.updateMany({ where: { permissionId: permission.id }, data: { status: 'DISABLED' } });
    const denied = await post(base(), { requestId: randomUUID() }); expect(denied.status).toBe(403);
    expect((await agent.get(base())).status).toBe(200);
  });

});
