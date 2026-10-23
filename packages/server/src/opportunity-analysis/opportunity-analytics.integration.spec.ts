import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { AgentService } from '../agent/agent.service';
import { AiAnalysisService } from '../ai/ai-analysis.service';
const run = process.env.RUN_AGENT_DB_TESTS === '1' ? describe : describe.skip;
run('opportunity analytics authenticated integration', () => {
  let app: INestApplication, db: DatabaseService, api: ReturnType<typeof request.agent>;
  let parent: string, child: string, stage: string;
  const base = '/api/systems/demo-portal/opportunity-analysis';
  const period = '?dateFrom=2026-10-01&dateTo=2027-03-31';
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/sdd_agent_')) throw new Error('ISOLATED_TEST_DB_REQUIRED');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    app.use(cookieParser()); app.useGlobalFilters(new ApiExceptionFilter()); await app.init();
    app.get(AgentService).onModuleDestroy(); app.get(AiAnalysisService).onModuleDestroy(); db = app.get(DatabaseService); api = request.agent(app.getHttpServer());
    const session = await api.get('/api/auth/session'); const csrf = (session.headers['set-cookie'] as unknown as string[]).map(c => c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
    expect((await api.post('/api/auth/login').set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrf).send({ account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD })).status).toBe(201);
    const reference = await db.sdOpp.findFirstOrThrow({ where: { systemCode: 'demo-portal' } }); stage = reference.stageId;
    const organization = await db.orgUnit.create({ data: { tenantId: reference.tenantId, unitCode: 'analytics-test-parent', unitName: '分析测试部门', unitType: 'DEPARTMENT', isSalesOrg: true, createdBy: reference.ownerUserId, updatedBy: reference.ownerUserId } }); parent = organization.id;
    const subtree = await db.orgUnit.create({ data: { tenantId: reference.tenantId, parentId: parent, unitCode: 'analytics-test-child', unitName: '分析测试团队', unitType: 'TEAM', isSalesOrg: true, createdBy: reference.ownerUserId, updatedBy: reference.ownerUserId } }); child = subtree.id;
    const owner = await db.iamUser.create({ data: { tenantId: reference.tenantId, account: 'analytics-test-owner', normalizedAccount: 'analytics-test-owner', displayName: '分析测试负责人' } });
    await db.orgUserAssignment.create({ data: { tenantId: reference.tenantId, userId: owner.id, orgUnitId: child, effectiveAt: new Date('2026-01-01'), createdBy: reference.ownerUserId, updatedBy: reference.ownerUserId } });
    const { id, ...copy } = reference; expect(id).toBeTruthy();
    const fixtures = [
      { code: 'AT-01', date: '2026-10-01', amount: 200000, businessStatus: 'INITIAL', status: 'ACTIVE' as const },
      { code: 'AT-02', date: '2027-03-31', amount: 100000, businessStatus: 'FOLLOWING', status: 'ACTIVE' as const },
      { code: 'AT-03', date: '2026-10-15', amount: 900000, businessStatus: 'SIGNED', status: 'ACTIVE' as const },
      { code: 'AT-04', date: '2026-10-15', amount: 900000, businessStatus: 'LOST', status: 'ACTIVE' as const },
      { code: 'AT-05', date: '2026-10-15', amount: 900000, businessStatus: 'VOID', status: 'ACTIVE' as const },
      { code: 'AT-06', date: '2026-10-15', amount: 900000, businessStatus: 'FOLLOWING', status: 'DISABLED' as const },
      { code: 'AT-07', date: '2027-04-01', amount: 900000, businessStatus: 'FOLLOWING', status: 'ACTIVE' as const },
    ];
    for (const item of fixtures) await db.sdOpp.create({ data: { ...copy, opportunityCode: item.code, opportunityName: '统计测试', ownerUserId: owner.id, ownerName: owner.displayName, expectedSignDate: new Date(item.date), expectedAmount: item.amount, businessStatus: item.businessStatus, status: item.status, signedDate: item.businessStatus === 'SIGNED' ? new Date('2026-09-01') : null, lostDate: item.businessStatus === 'LOST' ? new Date('2026-09-01') : null } });
  }, 30000);
  afterAll(async () => { await app?.close(); });
  it('includes child organizations and only open enabled opportunities at both date boundaries', async () => {
    const result = await api.get(base + period + `&orgUnitId=${parent}`);
    expect(result.status).toBe(200); expect(result.body.totals.count).toBe(2); expect(result.body.totals.amount).toBe('300000.00');
    expect(result.body.organizations.some((item: { id: string }) => item.id === parent)).toBe(true);
    expect(result.body.months).toEqual(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
    expect(result.body.totals.monthlyAmounts).toEqual(['200000.00', '0.00', '0.00', '0.00', '0.00', '100000.00']);
    const configured = await db.sdOppStage.findUniqueOrThrow({ where: { id: stage } });
    expect(Number(result.body.totals.weightedAmounts[0])).toBe(200000 * configured.probability / 100);
    const childResult = await api.get(base + period + `&orgUnitId=${child}`); expect(childResult.body.totals.count).toBe(2);
  });
  it('drills into an identical filtered dataset with pagination', async () => {
    const first = await api.get(base + '/records' + period + `&orgUnitId=${parent}&stageId=${stage}&pageSize=1`);
    expect(first.status).toBe(200); expect(first.body.pagination.total).toBe(2); expect(first.body.items[0].code).toBe('AT-01');
    const next = await api.get(base + '/records' + period + `&orgUnitId=${parent}&stageId=${stage}&pageSize=1&page=2`); expect(next.body.items[0].code).toBe('AT-02');
  });
  it('rejects invalid ranges, unknown organizations, anonymous access and a role without analysis permissions', async () => {
    expect((await api.get(base + '?dateFrom=2026-11-01&dateTo=2026-10-01')).status).toBe(400);
    expect((await api.get(base + period + '&orgUnitId=11111111-1111-4111-8111-111111111111')).status).toBe(400);
    expect((await request(app.getHttpServer()).get(base + period)).status).toBe(401);
    const viewer = request.agent(app.getHttpServer()); const session = await viewer.get('/api/auth/session'); const csrf = (session.headers['set-cookie'] as unknown as string[]).map(c => c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
    expect((await viewer.post('/api/auth/login').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send({account:'viewer',password:process.env.INITIAL_VIEWER_PASSWORD})).status).toBe(201);
    expect((await viewer.get(base + period)).status).toBe(403); expect((await viewer.get(base + '/records' + period)).status).toBe(403);
  });
});
