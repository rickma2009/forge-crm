import { DatabaseService } from '../database/database.service';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { AgentService } from '../agent/agent.service';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { MailAutomationService } from '../digital-employee/mail-automation.service';
import { CommodityMarketService } from '../digital-employee/commodity-market.service';
const run = process.env.RUN_PURCHASE_DB_TESTS === '1' ? describe : describe.skip;
run('purchasing guarded HTTP API', () => {
    let app: INestApplication, api: ReturnType<typeof request.agent>, csrf: string;
    const root = '/api/systems/demo-portal';
    const post = (path: string, body: object) => api.post(path).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrf).send(body);
    beforeAll(async () => { if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/sdd_purchase_'))
        throw new Error('ISOLATED_DB_REQUIRED'); app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication(); app.use(cookieParser()); app.useGlobalFilters(new ApiExceptionFilter()); await app.listen(0); app.get(AgentService).onModuleDestroy(); app.get(AiAnalysisService).onModuleDestroy(); app.get(MailAutomationService).onModuleDestroy(); app.get(CommodityMarketService).onModuleDestroy(); api = request.agent(app.getHttpServer()); const session = await api.get('/api/auth/session'); csrf = (session.headers['set-cookie'] as unknown as string[]).map(v => v.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!; expect((await post('/api/auth/login', { account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD })).status).toBe(201); }, 30000);
    afterAll(async () => { await app?.close(); });
    it('registers menus, three default views, lookup options and server pagination', async () => { const nav = await api.get(`${root}/navigation`); expect(nav.status).toBe(200); expect(JSON.stringify(nav.body)).toContain('purchase-management'); for (const page of ['supplier-directory', 'purchase-order-directory', 'purchase-receipt-directory']) {
        const views = await api.get(`${root}/list-views/${page}/view`);
        expect(views.status).toBe(200);
        expect(views.body.pageCode).toBe(page);
    } for (const endpoint of ['suppliers', 'purchase-orders', 'purchase-receipts'])
        expect((await api.get(`${root}/${endpoint}?page=1&pageSize=20`)).status).toBe(200); expect((await api.get(`${root}/purchasing/options/receipt`)).status).toBe(200); });
    it('requires CSRF and validates supplier payloads; cancelling a draft does not alter records', async () => { expect((await api.post(`${root}/suppliers`).send({ supplierName: '未授权' })).status).toBe(403); expect((await post(`${root}/suppliers`, { supplierName: '', extra: '拒绝' })).status).toBe(400); const created = await post(`${root}/suppliers`, { supplierName: '接口验证供应商' }); expect(created.status).toBe(201); const row = await api.get(`${root}/suppliers/${created.body.id}`); expect(row.status).toBe(200); expect(row.body.supplierName).toBe('接口验证供应商'); expect((await api.get(`${root}/purchase-orders/not-a-uuid`)).status).toBe(400); });
    it('rejects a viewer from procurement API even if a direct URL is known', async () => { const viewer = request.agent(app.getHttpServer()); const session = await viewer.get('/api/auth/session'); const token = (session.headers['set-cookie'] as unknown as string[]).map(v => v.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!; expect((await viewer.post('/api/auth/login').set('Origin', 'http://localhost:5173').set('X-CSRF-Token', token).send({ account: 'viewer', password: process.env.INITIAL_VIEWER_PASSWORD })).status).toBe(201); const db = app.get(DatabaseService); const role = await db.iamRole.findFirstOrThrow({ where: { systemCode: 'demo-portal', roleCode: 'viewer' } }); await db.iamRolePermission.deleteMany({ where: { roleId: role.id, permission: { resourceCode: { in: ['purchase-order-directory', 'purchase-receipt-directory', 'supplier-directory'] } } } }); expect((await viewer.get(`${root}/purchase-orders`)).status).toBe(403); expect((await viewer.get(`${root}/purchasing/options/order`)).status).toBe(403); });
});
