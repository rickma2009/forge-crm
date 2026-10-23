import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { AgentService } from '../agent/agent.service';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { QuotationService } from '../quotation/quotation.service';
import { CustomerService } from './customer.service';
import { SalesService } from '../sales/sales.service';
import { resolveEffectiveRoleIds } from '../rbac/role-scope';
const run = process.env.RUN_CUSTOMER_360_DB_TESTS === '1' ? describe : describe.skip;
run('customer360 authenticated isolated PostgreSQL', () => {
  let app: INestApplication, db: DatabaseService, api: ReturnType<typeof request.agent>, viewer: ReturnType<typeof request.agent>;
  let a: string, b: string, other: string, actor: string, viewerId: string, applicationId: string, tenantId: string;
  const root = '/api/systems/demo-portal/customers';
  async function login(account: string, password: string) {
    const client = request.agent(app.getHttpServer()); const session = await client.get('/api/auth/session');
    const csrf = (session.headers['set-cookie'] as unknown as string[]).map(x => x.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
    expect((await client.post('/api/auth/login').set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrf).send({ account, password })).status).toBe(201); return client;
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!/^\/sdd_c360_[0-9a-f]{12}$/.test(url.pathname) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('ISOLATED_TEST_DB_REQUIRED');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    app.use(cookieParser()); app.useGlobalFilters(new ApiExceptionFilter()); await app.init();
    app.get(AgentService).onModuleDestroy(); app.get(AiAnalysisService).onModuleDestroy(); app.get(QuotationService).onModuleDestroy();
    db = app.get(DatabaseService);
    const scope = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } }); applicationId = scope.id; tenantId = scope.tenantId;
    actor = (await db.iamUser.findFirstOrThrow({ where: { tenantId, account: 'admin' } })).id;
    viewerId = (await db.iamUser.findFirstOrThrow({ where: { tenantId, account: 'viewer' } })).id;
    const createCustomer = (code: string, systemCode = 'demo-portal') => db.crmCustomer.create({ data: { systemCode, customerCode: code, customerName: code, shortName: code, categoryValue: 'direct', statusValue: 'active', createdBy: 'test', updatedBy: 'test' } });
    a = (await createCustomer('C360-A')).id; b = (await createCustomer('C360-B')).id; other = (await createCustomer('C360-A', 'other-system')).id;
    const ref = await db.sdOpp.findFirstOrThrow({ where: { applicationId } }); const { id: _id, ...copy } = ref;
    for (const [customerId, suffix] of [[a, 'A1'], [a, 'A2'], [b, 'B']] as const) {
      await db.sdOpp.create({ data: { ...copy, opportunityCode: `C360-O-${suffix}`, opportunityName: suffix, customerId, customerName: '相同历史名称' } });
      await db.sdQuotation.create({ data: { tenantId, applicationId, systemCode: 'demo-portal', quoteCode: `C360-Q-${suffix}`, title: suffix, customerId, customerName: '相同历史名称', ownerUserId: suffix === 'A1' ? viewerId : actor, quoteDate: new Date('2026-10-03'), validUntil: new Date('2099-01-01'), total: '100', createdBy: actor, updatedBy: actor } });
      const order = await db.sdSalesOrder.create({ data: { tenantId, applicationId, orderNo: `C360-S-${suffix}`, orderDate: new Date('2026-10-03'), sourceType: 'MANUAL', customerId, customerCode: suffix, customerName: '相同历史名称', salespersonId: actor, salespersonName: '测试', organizationName: '', region: '', orderType: 'NORMAL', netAmount: '100', creatorId: actor } });
      const warehouse = await db.scmWarehouse.findFirstOrThrow({ where: { tenantId } });
      await db.sdSalesOutbound.create({ data: { tenantId, applicationId, outboundNo: `C360-X-${suffix}`, orderId: order.id, orderNo: order.orderNo, customerName: '相同历史名称', documentDate: new Date('2026-10-03'), legalEntityId: warehouse.legalEntityId, warehouseId: warehouse.id, warehouseName: warehouse.warehouseName, shipperId: actor, shipperName: '测试', creatorId: actor, salesAmount: '100' } });
    }
    // Read-only synthetic drafts: no posting, no inventory balances are fabricated.
    api = await login('admin', process.env.INITIAL_ADMIN_PASSWORD!); viewer = await login('viewer', process.env.INITIAL_VIEWER_PASSWORD!);
  }, 60000);
  afterAll(async () => { await app?.close(); });
  it('filters all four business sources by exact ID despite identical historical customer names', async () => {
    for (const kind of ['opportunities', 'quotations', 'sales-orders', 'sales-outbounds']) {
      const first = await api.get(`${root}/${a}/related/${kind}?pageSize=1`);
      expect(first.status).toBe(200); expect(first.body.pagination).toMatchObject({ total: 2, totalPages: 2, page: 1 });
      const second = await api.get(`${root}/${a}/related/${kind}?pageSize=1&page=2`);
      expect(second.status).toBe(200); expect(second.body.items[0].id).not.toBe(first.body.items[0].id);
      expect([first.body.items[0].code, second.body.items[0].code].every(x => x.includes('-A'))).toBe(true);
      const injected = await api.get(`${root}/${a}/related/${kind}?customerId=${b}`);
      expect(injected.body.pagination.total).toBe(2);
    }
    const overview = await api.get(`${root}/${a}/overview`); expect(overview.status).toBe(200);
    expect(overview.body.items).toHaveLength(4); expect(overview.body.items.every((x: { count: number }) => x.count === 2)).toBe(true);
  });
  it('blocks anonymous and other-system customer IDs before returning any source records', async () => {
    expect((await request(app.getHttpServer()).get(`${root}/${a}/overview`)).status).toBe(401);
    expect((await api.get(`${root}/${other}/overview`)).status).toBe(404);
    expect((await api.get(`${root}/${other}/related/sales-orders`)).status).toBe(404);
  });
  it('applies real customer row predicates and fails for out-of-scope rows', async () => {
    const service = app.get(CustomerService);
    await expect(service.assertScopedCustomer('demo-portal', a, { where: { id: b }, fields: [], rules: [] } as never)).rejects.toThrow('客户不存在');
    await expect(service.assertScopedCustomer('demo-portal', a, { where: { id: a }, fields: [], rules: [] } as never)).resolves.toBeUndefined();
  });
  it('rejects malformed kinds and paging without altering source documents', async () => {
    for (const suffix of ['/related/unknown', '/related/sales-orders?page=0', '/related/sales-orders?pageSize=101']) expect((await api.get(`${root}/${a}${suffix}`)).status).toBe(400);
    expect(await db.sdSalesOrder.count({ where: { customerId: a, status: 'DRAFT' } })).toBe(2);
  });
  it('preserves quotation ownership filtering in the actual source service', async () => {
    // Grant only the existing quotation page/view to the non-system viewer role in this isolated DB.
    const role = await db.iamRole.findFirstOrThrow({ where: { applicationId, roleCode: 'viewer' } });
    const menu = await db.uiMenu.findFirstOrThrow({ where: { applicationId, menuCode: 'quotation-directory' }, include: { actions: true } });
    const ids = [menu.accessPermissionId, menu.actions.find(x => x.actionCode === 'view')?.permissionId].filter((x): x is string => !!x);
    for (const permissionId of ids) await db.iamRolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId } }, update: { status: 'ACTIVE' }, create: { applicationId, roleId: role.id, permissionId } });
    const result = await app.get(QuotationService).list('demo-portal', viewerId, { customerId: a });
    expect(result.pagination.total).toBe(1); expect(result.items[0].quoteCode).toBe('C360-Q-A1');
    const viewerRoles = await resolveEffectiveRoleIds(db, applicationId, viewerId);
    await db.iamRolePermission.updateMany({ where: { roleId: { in: viewerRoles }, permission: { resourceCode: 'sales-outbound-directory' } }, data: { status: 'DISABLED' } });
    const denied = await viewer.get(`${root}/${a}/related/sales-outbounds`); expect(denied.status).toBe(403);
    const overview = await viewer.get(`${root}/${a}/overview`);
    if (overview.status === 200) expect(overview.body.items.some((x: { kind: string }) => x.kind === 'sales-outbounds')).toBe(false);
    else expect([403,404]).toContain(overview.status);
  });
  it('keeps new sales filters scoped and rejects invalid identifiers at the source service', async () => {
    const service = app.get(SalesService);
    await expect(service.listOrders('demo-portal', { customerId: 'bad-id' })).rejects.toThrow();
    expect((await service.listOutbounds('demo-portal', { customerId: b })).pagination.total).toBe(1);
    expect((await service.listOrders('demo-portal', { customerId: other })).pagination.total).toBe(0);
  });
});
