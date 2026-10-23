import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { QuotationService } from './quotation.service';

const run = process.env.RUN_QUOTATION_DB_TESTS === '1' ? describe : describe.skip;
run('quotation real database/API flow', () => {
  let app: INestApplication, db: DatabaseService, agent: ReturnType<typeof request.agent>, csrf: string;
  const root = '/api/systems/demo-portal';
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/sdd_quote_')) throw new Error('QUOTATION_TEST_DB_REQUIRED');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    app.use(cookieParser()); app.useGlobalFilters(new ApiExceptionFilter()); await app.init(); db = app.get(DatabaseService);
    agent = request.agent(app.getHttpServer()); const anonymous = await agent.get('/api/auth/session');
    csrf = (anonymous.headers['set-cookie'] as unknown as string[]).map((c) => c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
    const logged = await agent.post('/api/auth/login').set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrf).send({ account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD }); expect(logged.status).toBe(201);
  });
  afterAll(async () => { await app?.close(); });
  const post = (url: string, body: object) => agent.post(url).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrf).send(body);
  const patch = (url: string, body: object) => agent.patch(url).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrf).send(body);
  const cmd = (version: number) => ({ version, requestKey: randomUUID(), note: 'integration evidence', keepPrices: true });
  it('persists priced rows, freezes snapshots and performs idempotent scoped amount replacement', async () => {
    const opp = await db.sdOpp.findFirstOrThrow({ where: { systemCode: 'demo-portal' } });
    const p = await db.mdItem.findFirstOrThrow({ where: { tenantId: opp.tenantId, itemType: 'PRODUCT', status: 'ACTIVE' }, orderBy: { itemCode: 'asc' } });
    const current = await agent.get(`${root}/pricing/${p.id}`); expect(current.status).toBe(200);
    const price = await post(`${root}/pricing/${p.id}`, { version: current.body.history[0]?.version ?? 0, pricingType: 'STANDARD', currencyCode: 'CNY', unitPrice: '0.05', effectiveDate: '2026-09-23', expiresDate: null, remark: '集成测试', tiers: [] }); expect(price.status).toBe(201);
    const badPrice = await post(`${root}/pricing/${p.id}`, { version: price.body.version, pricingType: 'TIERED', currencyCode: 'CNY', unitPrice: null, effectiveDate: '2099-01-01', expiresDate: null, remark: null, tiers: [{ from: '1', to: null, price: '1' }] }); expect(badPrice.status).toBe(400);
    const line = () => ({ id: randomUUID(), productId: p.id, priceId: price.body.id, quantity: '3', unitPrice: '0.05', discount: '0.9', delivery: '月底', remark: '' });
    const input = { title: '报价真实集成测试', customerId: opp.customerId, contactId: null, opportunityId: opp.id, quoteDate: '2026-09-23', validUntil: '2099-01-01', terms: '测试条款', remark: 'INTERNAL_TEST_SECRET', version: 0, requestKey: randomUUID(), lines: [line(), line()] };
    await db.sdOpp.update({ where: { id: opp.id }, data: { status: 'ACTIVE' } });
    await db.sdOppProduct.deleteMany({ where: { opportunityId: opp.id } });
    await db.sdOppProduct.create({ data: { tenantId: opp.tenantId, opportunityId: opp.id, productId: p.id, productCode: p.itemCode, productName: p.itemName, quantity: '3', unitPrice: '0.05', expectedAmount: '0.15', sortNo: 0, createdBy: 'test', updatedBy: 'test' } });
    const selection = { mode: 'OPPORTUNITY', opportunityId: opp.id, opportunityVersion: opp.version, requestKey: randomUUID() };
    const countBefore = await db.sdQuotation.count();
    const stale = await post(`${root}/quotations`, { ...selection, opportunityVersion: opp.version + 1, requestKey: randomUUID() });
    expect(stale.status).toBe(409); expect(await db.sdQuotation.count()).toBe(countBefore);
    const created = await post(`${root}/quotations`, selection); expect(created.status).toBe(201);
    expect(created.body.lines).toHaveLength(1); expect(created.body.lines[0].quantity).toBe('3');
    expect(created.body.customerId).toBe(opp.customerId);
    const duplicate = await post(`${root}/quotations`, selection); expect(duplicate.body.id).toBe(created.body.id);
    expect((await post(`${root}/quotations`, { mode: 'INDEPENDENT', customerId: opp.customerId, requestKey: selection.requestKey })).status).toBe(409);
    const saved = await patch(`${root}/quotations/${created.body.id}`, { ...input, version: created.body.version }); expect(saved.status).toBe(200); expect(saved.body.total).toBe('0.28');
    for (const change of [{ customerId: randomUUID() }, { opportunityId: null }, { opportunityId: randomUUID() }]) expect((await patch(`${root}/quotations/${saved.body.id}`, { ...input, ...change, version: saved.body.version, requestKey: randomUUID() })).status).toBe(400);
    const createDraft = async (draft: typeof input) => {
      const created = await post(`${root}/quotations`, { mode: 'INDEPENDENT', customerId: draft.customerId, requestKey: randomUUID() });
      expect(created.status).toBe(201);
      return patch(`${root}/quotations/${created.body.id}`, { ...draft, opportunityId: null, version: created.body.version });
    };
    const url = `${root}/quotations/${saved.body.id}`;
    expect((await post(`${url}/accept`, cmd(1))).status).toBe(409);
    const submitted = await post(`${url}/submit`, cmd(saved.body.version)); expect(submitted.status).toBe(201); expect(submitted.body.status).toBe('SUBMITTED');
    const frozen = await patch(url, { ...input, version: submitted.body.version, requestKey: randomUUID(), title: '非法改头' }); expect(frozen.status).toBe(409);
    const accepted = await post(`${url}/accept`, cmd(submitted.body.version)); expect(accepted.status).toBe(201);
    const unchanged = await db.sdOpp.findUniqueOrThrow({ where: { id: opp.id } }); expect(unchanged.version).toBe(opp.version); expect(unchanged.stageId).toBe(opp.stageId);
    const backInput = { ...cmd(accepted.body.version), opportunityVersion: opp.version };
    const back = await post(`${url}/writeback`, backInput); expect(back.status).toBe(201); expect(back.body.expectedAmount).toBe('0.28');
    const updated = await db.sdOpp.findUniqueOrThrow({ where: { id: opp.id } }); expect(updated.stageId).toBe(opp.stageId); expect(updated.customerBudget?.toString()).toBe(opp.customerBudget?.toString());
    // Legacy opportunity editors resubmit numeric projections even for unrelated edits.
    // Those projections must never replace a more precise stored quotation amount.
    await db.sdOpp.update({ where: { id: opp.id }, data: { expectedAmount: '9007199254740991.23' } });
    const beforeEvents = await db.sdOppAmountEvent.count({ where: { opportunityId: opp.id } });
    for (const includeProducts of [false, true]) {
      const detail = await agent.get(`${root}/opportunities/${opp.id}`), o = detail.body.opportunity;
      const edit = { opportunityName: o.opportunityName, customerId: o.customerId, contactId: o.contactId, ownerUserId: o.ownerUserId, source: o.source, templateId: o.templateId, stageId: o.stageId, confidence: o.confidence, confirmedDate: o.confirmedDate, expectedSignDate: o.expectedSignDate, customerBudget: o.customerBudget, expectedAmount: o.expectedAmount, partner: o.partner, status: o.status, remark: '仅修改非金额字段', version: o.version, ...(includeProducts ? { products: o.products.map((l: { productId: string; quantity: number; unitPrice: number; requirement: string | null; sortNo: number }) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, requirement: l.requirement, sortNo: l.sortNo })) } : {}) };
      expect((await patch(`${root}/opportunities/${opp.id}`, edit)).status).toBe(200);
      expect((await db.sdOpp.findUniqueOrThrow({ where: { id: opp.id } })).expectedAmount!.toFixed(2)).toBe('9007199254740991.23');
    }
    expect(await db.sdOppAmountEvent.count({ where: { opportunityId: opp.id } })).toBe(beforeEvents);
    // An old request must not overwrite a later manual amount.
    await db.sdOpp.update({ where: { id: opp.id }, data: { expectedAmount: '99.00', version: { increment: 1 } } });
    expect((await post(`${url}/writeback`, backInput)).body.expectedAmount).toBe('0.28');
    expect((await db.sdOpp.findUniqueOrThrow({ where: { id: opp.id } })).expectedAmount!.toFixed(2)).toBe('99.00');
    const copy = await post(`${url}/copy`, cmd(back.body.version)); expect(copy.status).toBe(201); expect(copy.body.status).toBe('DRAFT'); expect(copy.body.sourceQuoteId).toBe(saved.body.id); expect(copy.body.lines[0].id).not.toBe(saved.body.lines[0].id);
    const name = p.itemName; await db.mdItem.update({ where: { id: p.id }, data: { itemName: '改名后的产品' } });
    const historical = await agent.get(url); expect(historical.body.lines[0].productName).toBe(name);
    await db.mdItem.update({ where: { id: p.id }, data: { itemName: name } });
    const pdf = await agent.get(`${url}/pdf`); expect(pdf.status).toBe(200); expect(pdf.headers['content-type']).toContain('application/pdf'); expect(Buffer.isBuffer(pdf.body)).toBe(true); expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
    await expect(db.sdQuotationLine.update({ where: { id: saved.body.lines[0].id }, data: { discount: '1.01' } })).rejects.toThrow();
    await expect(db.sdQuotationLine.update({ where: { id: saved.body.lines[0].id }, data: { tenantId: randomUUID() } })).rejects.toThrow();
    const editable = await createDraft({ ...input, requestKey: randomUUID(), lines: [line()] });
    const edits = await Promise.all(['并发A', '并发B'].map((title) => patch(`${root}/quotations/${editable.body.id}`, { ...input, title, opportunityId: null, version: editable.body.version, requestKey: randomUUID(), lines: [{ ...line(), id: editable.body.lines[0].id }] })));
    expect(edits.map((x) => x.status).sort()).toEqual([200, 409]);
    const overdue = await createDraft({ ...input, requestKey: randomUUID(), lines: [line()] });
    await db.sdQuotation.update({ where: { id: overdue.body.id }, data: { quoteDate: new Date('2020-01-01'), validUntil: new Date('2020-01-02'), status: 'SUBMITTED' } });
    expect((await post(`${root}/quotations/${overdue.body.id}/accept`, cmd(1))).status).toBe(409);
    await app.get(QuotationService).expire(); await app.get(QuotationService).expire();
    expect((await db.sdQuotation.findUniqueOrThrow({ where: { id: overdue.body.id } })).status).toBe('EXPIRED');
    expect(await db.sdQuoteEvent.count({ where: { quotationId: overdue.body.id, action: 'expire' } })).toBe(1);
    const broken = await createDraft({ ...input, requestKey: randomUUID(), lines: [line()] });
    await db.mdItem.update({ where: { id: p.id }, data: { status: 'DISABLED' } });
    try { expect((await post(`${root}/quotations/${broken.body.id}/submit`, cmd(broken.body.version))).status).toBe(400); }
    finally { await db.mdItem.update({ where: { id: p.id }, data: { status: 'ACTIVE' } }); }
  }, 90000);
  it('keeps viewer own-scope empty and denies quotation writes and price maintenance', async () => {
    const viewer = request.agent(app.getHttpServer()), anon = await viewer.get('/api/auth/session');
    const token = (anon.headers['set-cookie'] as unknown as string[]).map((c) => c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
    expect((await viewer.post('/api/auth/login').set('Origin', 'http://localhost:5173').set('X-CSRF-Token', token).send({ account: 'viewer', password: process.env.INITIAL_VIEWER_PASSWORD })).status).toBe(201);
    const listing = await viewer.get(`${root}/quotations`); expect(listing.status).toBe(200); expect(listing.body.items).toEqual([]);
    expect((await viewer.post(`${root}/quotations`).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', token).send({})).status).toBe(403);
    expect((await viewer.get(`${root}/pricing/${randomUUID()}`)).status).toBe(403);
  });
});
