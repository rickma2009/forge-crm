import { NumberingService } from '../numbering/numbering.service';
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { quotationCreateSchema, quotationDraftSchema, quotationCommandSchema, quotationLineAmount, quotationTotal, type QuotationCreate, type QuotationDraft } from '@forge-crm/contracts';
import type { Prisma, SdQuotation, SdQuotationLine } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { AuthorizationService } from '../rbac/authorization.service';
import { resolveEffectiveRoleIds } from '../rbac/role-scope';
import { RolePolicyService } from '../role-management/role-policy.service';
import { PricingService } from './pricing.service';
import { assertQuoteTransition, quoteObjectWhere } from './quotation-domain';

type Tx = Prisma.TransactionClient;
type Scope = { id: string; tenantId: string; systemCode: string; actorId: string; systemRole: boolean };
type Quote = SdQuotation & { lines: SdQuotationLine[] };
const conflict = () => new ApiException('BAD_REQUEST', 409, '记录已被修改或状态变化，请重新加载');
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const businessDate = (now = new Date()) => new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
const querySchema = z.object({ sortBy: z.enum(['updatedAt', 'createdAt']).default('updatedAt'), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), keyword: z.string().max(200).optional(), customerKeyword: z.string().max(200).optional(), opportunityKeyword: z.string().max(200).optional(), ownerKeyword: z.string().max(200).optional(), status: z.enum(['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(), customerId: z.string().uuid().optional(), opportunityId: z.string().uuid().optional(), ownerUserId: z.string().uuid().optional(), dateFrom: z.string().date().optional(), dateTo: z.string().date().optional(), validUntil: z.string().date().optional() });

@Injectable()
export class QuotationService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private expiring = false;
  constructor(private readonly db: DatabaseService, private readonly pricing: PricingService, private readonly auth: AuthorizationService, private readonly policies: RolePolicyService, private readonly numbers: NumberingService = new NumberingService(db)) {}
  onModuleInit() { this.timer = setInterval(() => { void this.expire().catch(() => Logger.warn('报价失效扫描失败，将在下一周期重试', 'QuotationService')); }, 60000); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async scope(code: string, actorId: string, action: string): Promise<Scope> {
    await this.auth.assertAction(actorId, code, 'quotation-directory', action);
    const app = await this.pricing.context(code);
    const ids = await resolveEffectiveRoleIds(this.db, app.id, actorId);
    const systemRole = !!await this.db.iamRole.findFirst({ where: { id: { in: ids }, applicationId: app.id, isSystem: true } });
    return { id: app.id, tenantId: app.tenantId, systemCode: code, actorId, systemRole };
  }
  private async where(scope: Scope): Promise<Prisma.SdQuotationWhereInput> {
    const own = quoteObjectWhere(scope.actorId, scope.systemRole);
    const opps = await this.db.sdOpp.findMany({ where: { applicationId: scope.id, tenantId: scope.tenantId, ...own }, select: { id: true } });
    return { applicationId: scope.id, tenantId: scope.tenantId, ...own, OR: [{ opportunityId: null }, { opportunityId: { in: opps.map((o) => o.id) } }] };
  }
  private async record(tx: Tx, scope: Scope, id: string): Promise<Quote> {
    const row = await tx.sdQuotation.findFirst({ where: { ...await this.where(scope), id }, include: { lines: { orderBy: { sortNo: 'asc' } } } });
    if (!row) throw new ApiException('NOT_FOUND', 404, '报价不存在或无权访问'); return row;
  }
  async list(code: string, actor: string, raw: unknown) {
    const scope = await this.scope(code, actor, 'view'), q = querySchema.parse(raw);
    await this.expire();
    const extra: Prisma.SdQuotationWhereInput[] = [];
    if (q.customerKeyword) extra.push({ customerName: { contains: q.customerKeyword, mode: 'insensitive' } });
    if (q.opportunityKeyword) {
      const matches = await this.db.sdOpp.findMany({ where: { tenantId: scope.tenantId, applicationId: scope.id, ...quoteObjectWhere(actor, scope.systemRole), opportunityName: { contains: q.opportunityKeyword, mode: 'insensitive' } }, select: { id: true } });
      extra.push({ opportunityId: { in: matches.map((o) => o.id) } });
    }
    if (q.ownerKeyword) {
      const matches = await this.db.iamUser.findMany({ where: { tenantId: scope.tenantId, displayName: { contains: q.ownerKeyword, mode: 'insensitive' } }, select: { id: true } });
      extra.push({ ownerUserId: { in: matches.map((u) => u.id) } });
    }
    const where: Prisma.SdQuotationWhereInput = { AND: [await this.where(scope), { ...(q.keyword ? { OR: [{ title: { contains: q.keyword, mode: 'insensitive' } }, { quoteCode: { contains: q.keyword, mode: 'insensitive' } }] } : {}), ...(q.status ? { status: q.status } : {}), ...(q.customerId ? { customerId: q.customerId } : {}), ...(q.opportunityId ? { opportunityId: q.opportunityId } : {}), ...(q.ownerUserId ? { ownerUserId: q.ownerUserId } : {}), ...(q.dateFrom || q.dateTo ? { quoteDate: { ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}), ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}) } } : {}), ...(q.validUntil ? { validUntil: new Date(q.validUntil) } : {}) }] };
    const filtered = { AND: [where, ...extra] };
    const [items, total] = await Promise.all([this.db.sdQuotation.findMany({ where: filtered, orderBy: [q.sortBy === 'createdAt' ? { createdAt: 'desc' } : { updatedAt: 'desc' }, { id: 'asc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: { lines: { orderBy: { sortNo: 'asc' } } } }), this.db.sdQuotation.count({ where: filtered })]);
    return { items: items.map((x) => this.dto(x)), pagination: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) } };
  }
  async detail(code: string, actor: string, id: string) {
    const scope = await this.scope(code, actor, 'view'); await this.expire();
    const row = await this.record(this.db, scope, id);
    const events = await this.db.sdQuoteEvent.findMany({ where: { quotationId: id, applicationId: scope.id }, select: { id: true, action: true, note: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    const opp = row.opportunityId ? await this.db.sdOpp.findFirst({ where: { id: row.opportunityId, applicationId: scope.id, ...quoteObjectWhere(actor, scope.systemRole) }, select: { id: true, opportunityName: true, version: true, expectedAmount: true } }) : null;
    const source = opp ? await this.db.sdOppAmountEvent.findFirst({ where: { opportunityId: opp.id, applicationId: scope.id }, orderBy: { opportunityVersion: 'desc' } }) : null;
    const users = await this.db.iamUser.findMany({ where: { tenantId: scope.tenantId, id: { in: [row.ownerUserId, row.createdBy] } }, select: { id: true, displayName: true } });
    return { ...this.dto(row), creatorName: users.find((u) => u.id === row.createdBy)?.displayName ?? '未知用户', ownerName: users.find((u) => u.id === row.ownerUserId)?.displayName ?? '未知用户', events, opportunity: opp ? { ...opp, expectedAmount: opp.expectedAmount?.toFixed(2) ?? null, amountSource: source?.quotationId ? '报价回写' : '人工维护' } : null };
  }
  private async references(tx: Tx, scope: Scope, input: Pick<QuotationDraft, 'customerId' | 'contactId' | 'opportunityId'>) {
    await this.auth.assertAction(scope.actorId, scope.systemCode, 'customer-directory', 'view');
    const policy = await this.policies.customerScope(scope.systemCode, scope.actorId, 'read');
    const customer = await tx.crmCustomer.findFirst({ where: { id: input.customerId, systemCode: scope.systemCode, ...(policy ? { AND: [policy.where as Prisma.CrmCustomerWhereInput] } : {}) } });
    if (!customer) throw new ApiException('BAD_REQUEST', 400, '客户不存在或无权引用');
    if (policy?.fields.some((f) => f.field === 'customerName' && (!f.visible || f.mask !== 'NONE'))) throw new ApiException('FORBIDDEN', 403, '客户抬头字段不可用于报价');
    const contact = input.contactId ? await tx.crmCustomerContact.findFirst({ where: { id: input.contactId, customerId: customer.id, systemCode: scope.systemCode } }) : null;
    if (input.contactId && (!contact || contact.status !== 'ACTIVE')) throw new ApiException('BAD_REQUEST', 400, '联系人不属于客户或已停用');
    if (input.opportunityId) {
      await this.auth.assertAction(scope.actorId, scope.systemCode, 'opportunity-directory', 'view');
      const opp = await tx.sdOpp.findFirst({ where: { id: input.opportunityId, tenantId: scope.tenantId, applicationId: scope.id, customerId: customer.id, ...quoteObjectWhere(scope.actorId, scope.systemRole) } });
      if (!opp) throw new ApiException('BAD_REQUEST', 400, '商机与客户不匹配或无权访问');
    }
    return { customerName: customer.customerName, contactName: contact?.name ?? null };
  }
  private async replay(tx: Tx, scope: Scope, requestKey: string, requestHash: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope.id + scope.actorId + requestKey}, 0))`;
    const old = await tx.sdQuoteEvent.findUnique({ where: { applicationId_actorId_requestKey: { applicationId: scope.id, actorId: scope.actorId, requestKey } } });
    if (old && old.requestHash !== requestHash) throw new ApiException('BAD_REQUEST', 409, '请求标识已用于不同操作');
    if (old) await this.record(tx, scope, old.quotationId);
    return old?.result;
  }
  private async event(tx: Tx, scope: Scope, id: string, action: string, requestKey: string, requestHash: string, result: Prisma.InputJsonValue, note = '') {
    await tx.sdQuoteEvent.create({ data: { quotationId: id, tenantId: scope.tenantId, applicationId: scope.id, actorId: scope.actorId, action, requestKey, requestHash, result, note } });
  }
  private async initialize(tx: Tx, scope: Scope, selection: QuotationCreate): Promise<QuotationDraft> {
    const date = businessDate();
    const input: QuotationDraft = { title: '新报价单', customerId: '', contactId: null, opportunityId: null, quoteDate: date, validUntil: businessDate(new Date(Date.now() + 30 * 86400000)), terms: '', remark: '', lines: [], version: 0, requestKey: selection.requestKey };
    if (selection.mode === 'INDEPENDENT') { input.customerId = selection.customerId; return input; }
    await this.auth.assertAction(scope.actorId, scope.systemCode, 'opportunity-directory', 'view');
    // Hold the parent row while taking the creation snapshot; opportunity edits update this row first.
    await tx.$queryRaw`SELECT id FROM sd_opp WHERE id = ${selection.opportunityId}::uuid AND tenant_id = ${scope.tenantId}::uuid AND application_id = ${scope.id}::uuid FOR UPDATE`;
    const opp = await tx.sdOpp.findFirst({ where: { id: selection.opportunityId, tenantId: scope.tenantId, applicationId: scope.id, status: 'ACTIVE', ...quoteObjectWhere(scope.actorId, scope.systemRole) }, include: { products: { orderBy: [{ sortNo: 'asc' }, { id: 'asc' }] } } });
    if (!opp) throw new ApiException('BAD_REQUEST', 400, '商机已关闭、不存在或无权访问，请重新选择');
    if (opp.version !== selection.opportunityVersion) throw new ApiException('BAD_REQUEST', 409, '商机信息已更新，请重新核对后创建');
    input.customerId = opp.customerId; input.opportunityId = opp.id;
    await this.references(tx, scope, input);
    const problems: string[] = [];
    for (const line of opp.products) {
      try { await this.pricing.eligible(tx, scope.systemCode, scope.tenantId, line.productId); }
      catch (error) { if (!(error instanceof ApiException)) throw error; problems.push(`产品「${line.productName}」：${error.message}`); continue; }
      const price = await tx.sdProductPrice.findFirst({ where: { tenantId: scope.tenantId, productId: line.productId, status: 'ACTIVE', currencyCode: 'CNY', effectiveDate: { lte: new Date(date) }, OR: [{ expiresDate: null }, { expiresDate: { gte: new Date(date) } }] }, orderBy: { version: 'desc' } });
      input.lines.push({ id: randomUUID(), productId: line.productId, priceId: price?.id ?? null, quantity: line.quantity.toString(), unitPrice: line.unitPrice.toFixed(2), discount: '1', delivery: '', remark: line.requirement ?? '' });
    }
    if (problems.length) throw new ApiException('BAD_REQUEST', 400, problems.join('；'));
    return quotationDraftSchema.parse(input);
  }
  async save(code: string, actor: string, id: string | null, raw: unknown) {
    const scope = await this.scope(code, actor, id ? 'edit' : 'create');
    const payload = id ? quotationDraftSchema.parse(raw) : quotationCreateSchema.parse(raw), requestHash = hash({ id, input: payload });
    const generatedCode = id ? '' : await this.numbers.allocate(code, 'QUOTATION', payload.requestKey);
    return this.db.$transaction(async (tx) => {
      const replay = await this.replay(tx, scope, payload.requestKey, requestHash); if (replay) return replay;
      const input = 'mode' in payload ? await this.initialize(tx, scope, payload) : payload;
      const current = id ? await this.record(tx, scope, id) : null;
      if (current && (current.status !== 'DRAFT' || current.version !== input.version)) throw conflict();
      if (!current && input.version !== 0) throw conflict();
      if (current && (current.customerId !== input.customerId || current.opportunityId !== input.opportunityId)) throw new ApiException('BAD_REQUEST', 400, '报价单生成后不能更改客户、报价方式或关联商机');
      const refs = await this.references(tx, scope, input);
      const lines = [];
      for (const [sortNo, line] of input.lines.entries()) {
        const product = await this.pricing.eligible(tx, code, scope.tenantId, line.productId);
        const suggestion = line.priceId
          ? (await this.pricing.reference(tx, scope.tenantId, product.id, line.priceId, line.quantity, input.quoteDate)).suggestion
          : { price: '0.00', source: 'UNPRICED' as const, from: null, to: null };
        const old = current?.lines.find((l) => l.id === line.id && l.productId === line.productId);
        try { quotationLineAmount(line.quantity, line.unitPrice, line.discount); }
        catch { throw new ApiException('BAD_REQUEST', 400, `第 ${sortNo + 1} 行金额超出范围，请调整数量或成交单价`); }
        lines.push({ id: line.id, tenantId: scope.tenantId, applicationId: scope.id, productId: product.id, priceId: line.priceId, productCode: old?.productCode ?? product.productCode, productName: old?.productName ?? product.productName, model: old ? old.model : product.model, unit: old?.unit ?? product.unit!, productLine: old ? old.productLine : product.productLine ?? '', quantity: line.quantity, suggestedPrice: suggestion.price, priceSource: suggestion.source, lowerQty: suggestion.from, upperQty: suggestion.to, unitPrice: line.unitPrice, discount: line.discount, amount: quotationLineAmount(line.quantity, line.unitPrice, line.discount), sortNo, delivery: line.delivery, remark: line.remark });
      }
      let total: string;
      try { total = quotationTotal(lines.map((l) => l.amount)); }
      catch { throw new ApiException('BAD_REQUEST', 400, '报价总金额超出允许范围'); }
      const data = { title: input.title, customerId: input.customerId, contactId: input.contactId, opportunityId: input.opportunityId, quoteDate: new Date(input.quoteDate), validUntil: new Date(input.validUntil), terms: input.terms, remark: input.remark, total, ...refs, updatedBy: actor };
      const quoteId = current?.id ?? randomUUID();
      if (current) {
        const changed = await tx.sdQuotation.updateMany({ where: { id: current.id, version: input.version, status: 'DRAFT' }, data: { ...data, version: { increment: 1 } } });
        if (!changed.count) throw conflict();
        await tx.sdQuotationLine.deleteMany({ where: { quotationId: quoteId, id: { notIn: lines.map((l) => l.id) } } });
        for (const line of lines) {
          const existing = current.lines.find((l) => l.id === line.id);
          if (existing) await tx.sdQuotationLine.update({ where: { id: line.id }, data: line });
          else await tx.sdQuotationLine.create({ data: { ...line, quotationId: quoteId } });
        }
      } else {
        await tx.sdQuotation.create({ data: { ...data, id: quoteId, tenantId: scope.tenantId, applicationId: scope.id, systemCode: code, quoteCode: generatedCode, ownerUserId: actor, createdBy: actor } });
        if (lines.length) await tx.sdQuotationLine.createMany({ data: lines.map((line) => ({ ...line, quotationId: quoteId })) });
      }
      const result = this.dto(await this.record(tx, scope, quoteId));
      await this.event(tx, scope, quoteId, current ? 'save' : 'create', input.requestKey, requestHash, result);
      return result;
    }, { timeout: 15000 });
  }
  async command(code: string, actor: string, id: string, action: string, raw: unknown) {
    const scope = await this.scope(code, actor, action === 'accept' || action === 'reject' ? 'feedback' : action), input = quotationCommandSchema.parse(raw), requestHash = hash({ id, action, input });
    return this.db.$transaction(async (tx) => {
      const replay = await this.replay(tx, scope, input.requestKey, requestHash); if (replay) return replay;
      const row = await this.record(tx, scope, id);
      if (row.version !== input.version) throw conflict();
      const next = assertQuoteTransition(row.status, action, row.validUntil.toISOString().slice(0, 10));
      if (action === 'submit') {
        await this.references(tx, scope, row);
        if (!row.lines.length) throw new ApiException('BAD_REQUEST', 400, '至少添加一条报价明细');
        for (const line of row.lines) {
          await this.pricing.eligible(tx, code, scope.tenantId, line.productId);
          if (line.priceId) await this.pricing.reference(tx, scope.tenantId, line.productId, line.priceId, line.quantity.toString(), row.quoteDate.toISOString().slice(0, 10));
        }
      }
      const changed = await tx.sdQuotation.updateMany({ where: { id, applicationId: scope.id, version: input.version, status: row.status }, data: { status: next, version: { increment: 1 }, updatedBy: actor } });
      if (!changed.count) throw conflict();
      const result = this.dto({ ...row, status: next, version: row.version + 1 });
      await this.event(tx, scope, id, action, input.requestKey, requestHash, result, input.note);
      return result;
    });
  }
  async copy(code: string, actor: string, id: string, raw: unknown) {
    const scope = await this.scope(code, actor, 'copy'), input = quotationCommandSchema.parse(raw), requestHash = hash({ id, action: 'copy', input });
    const generatedCode = await this.numbers.allocate(code, 'QUOTATION', input.requestKey);
    return this.db.$transaction(async (tx) => {
      const replay = await this.replay(tx, scope, input.requestKey, requestHash); if (replay) return replay;
      const row = await this.record(tx, scope, id); if (row.version !== input.version || row.status === 'DRAFT') throw conflict();
      const { lines, id: oldId, createdAt, updatedAt, ...base } = row; void createdAt; void updatedAt;
      const header = await tx.sdQuotation.create({ data: { ...base, quoteCode: generatedCode, sourceQuoteId: oldId, status: 'DRAFT', version: 1, ownerUserId: actor, createdBy: actor, updatedBy: actor, quoteDate: new Date(businessDate()), validUntil: new Date(businessDate(new Date(Date.now() + 30 * 86400000))) } });
      if (lines.length) await tx.sdQuotationLine.createMany({ data: lines.map(({ id: lineId, quotationId, ...l }) => { void lineId; void quotationId; return { ...l, id: randomUUID(), quotationId: header.id }; }) });
      const created = await this.record(tx, scope, header.id);
      const result = this.dto(created); await this.event(tx, scope, created.id, 'copy', input.requestKey, requestHash, result, `来源 ${row.quoteCode}`); return result;
    });
  }
  async expire() {
    if (this.expiring) return; this.expiring = true;
    try {
      const rows = await this.db.sdQuotation.findMany({ where: { status: 'SUBMITTED', validUntil: { lt: new Date(businessDate()) } }, take: 500 });
      for (const row of rows) await this.db.$transaction(async (tx) => {
        const changed = await tx.sdQuotation.updateMany({ where: { id: row.id, status: 'SUBMITTED', version: row.version }, data: { status: 'EXPIRED', version: { increment: 1 } } });
        if (changed.count) await tx.sdQuoteEvent.create({ data: { quotationId: row.id, tenantId: row.tenantId, applicationId: row.applicationId, action: 'expire', actorId: '00000000-0000-0000-0000-000000000000', requestKey: randomUUID(), requestHash: hash({ id: row.id, version: row.version }), note: '系统任务按有效期自动失效（非用户操作）', result: { status: 'EXPIRED' } } });
      });
    } finally { this.expiring = false; }
  }
  async auditExport(code: string, actor: string, id: string) {
    const scope = await this.scope(code, actor, 'export');
    const row = await this.record(this.db, scope, id);
    await this.db.sysAuditLog.create({ data: { requestId: randomUUID(), tenantId: scope.tenantId, applicationId: scope.id, actorUserId: actor, actionCode: 'quotation.pdf.generated', resourceType: 'quotation', resourceId: id, afterSnapshot: { version: row.version, quoteCode: row.quoteCode } } });
  }
  dto(row: Quote) {
    return { ...row, total: row.total.toFixed(2), quoteDate: row.quoteDate.toISOString().slice(0, 10), validUntil: row.validUntil.toISOString().slice(0, 10), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), lines: row.lines.map((l) => ({ ...l, quantity: l.quantity.toString(), unitPrice: l.unitPrice.toFixed(2), discount: l.discount.toString(), amount: l.amount.toFixed(2), suggestedPrice: l.suggestedPrice.toFixed(2), lowerQty: l.lowerQty?.toString() ?? null, upperQty: l.upperQty?.toString() ?? null })) };
  }
}
