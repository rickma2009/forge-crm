import { randomUUID } from 'node:crypto';
import { QuotationService } from './quotation.service';
import { ApiException } from '../http/api-exceptions';
import { Prisma } from '../generated/prisma/client';

const uuid = () => randomUUID();
const decimal = (v: string) => new Prisma.Decimal(v);
function setup() {
  const actor = uuid(), customerId = uuid(), oppId = uuid(), productId = uuid(), priceId = uuid();
  const scope = { id: uuid(), tenantId: uuid(), systemCode: 'demo-portal', actorId: actor, systemRole: true };
  const line = { productId, productName: '设备', quantity: decimal('2.5'), unitPrice: decimal('12.34'), requirement: '蓝色' };
  let header: Record<string, unknown> | null = null;
  let lines: Record<string, unknown>[] = [];
  const tx = {
    $executeRaw: jest.fn(), $queryRaw: jest.fn().mockResolvedValue([{ sequence: 123n }]),
    sdOpp: { findMany: jest.fn().mockResolvedValue([{ id: oppId }]), findFirst: jest.fn().mockResolvedValue({ id: oppId, customerId, version: 1, products: [line, line] }) },
    sdProductPrice: { findFirst: jest.fn().mockResolvedValue({ id: priceId }) },
    crmCustomer: { findFirst: jest.fn().mockResolvedValue({ customerName: '客户', id: customerId }) },
    sdQuoteEvent: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    sdQuotation: {
      findFirst: jest.fn().mockImplementation(async () => header && ({ ...header, total: decimal(String(header.total)), lines, status: 'DRAFT', version: 1, createdAt: new Date(), updatedAt: new Date() })),
      create: jest.fn().mockImplementation(async ({ data }) => { header = data; }), updateMany: jest.fn(),
    },
    sdQuotationLine: { createMany: jest.fn().mockImplementation(async ({ data }) => { lines = data.map((l: Record<string, unknown>) => ({ ...l, quantity: decimal(String(l.quantity)), unitPrice: decimal(String(l.unitPrice)), discount: decimal(String(l.discount)), amount: decimal(String(l.amount)), suggestedPrice: decimal(String(l.suggestedPrice)) })); }) },
  };
  const db = { ...tx, $transaction: jest.fn().mockImplementation((work) => work(tx)) };
  const pricing = { eligible: jest.fn().mockResolvedValue({ id: productId, productCode: 'P1', productName: '设备', model: null, unit: '件', productLine: '通用' }), reference: jest.fn().mockResolvedValue({ suggestion: { price: '15.00', source: 'STANDARD', from: null, to: null } }) };
  const auth = { assertAction: jest.fn() }, policies = { customerScope: jest.fn().mockResolvedValue(null) };
  const service = new QuotationService(db as never, pricing as never, auth as never, policies as never);
  jest.spyOn(service, 'scope').mockResolvedValue(scope);
  return { service, tx, scope, actor, customerId, oppId, pricing, line };
}
describe('quotation creation invariants', () => {
  it('derives the customer and imports every opportunity row without merging or losing decimal precision', async () => {
    const { service, actor, oppId, customerId, tx } = setup();
    const result = await service.save('demo-portal', actor, null, { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 1, requestKey: uuid() }) as { customerId: string; total: string; lines: Array<{ id: string; quantity: string; remark: string }> };
    expect(result.customerId).toBe(customerId); expect(result.lines).toHaveLength(2);
    expect(result.lines[0].id).not.toBe(result.lines[1].id);
    expect(result.lines[0]).toMatchObject({ quantity: '2.5', remark: '蓝色' }); expect(result.total).toBe('61.70');
    expect(tx.sdOpp.findFirst.mock.calls[0][0].where).toMatchObject({ status: 'ACTIVE' });
  });
  it('imports active products with no product line and stores an empty legacy snapshot', async () => {
    const { service, actor, oppId, pricing } = setup();
    pricing.eligible.mockResolvedValue({ ...await pricing.eligible(), productLine: null } as never);
    const result = await service.save('demo-portal', actor, null, { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 1, requestKey: uuid() }) as { lines: Array<{ productLine: string }> };
    expect(result.lines).toHaveLength(2);
    expect(result.lines.every((line) => line.productLine === '')).toBe(true);
  });
  it('creates an independent empty draft with immutable system fields', async () => {
    const { service, actor, customerId, tx } = setup();
    const result = await service.save('demo-portal', actor, null, { mode: 'INDEPENDENT', customerId, requestKey: uuid() }) as { opportunityId: null; total: string; quoteCode: string; createdBy: string };
    expect(result).toMatchObject({ opportunityId: null, total: '0.00', createdBy: actor });
    expect(result.quoteCode).toMatch(/^Q\d+$/); expect(tx.sdQuotationLine.createMany).not.toHaveBeenCalled();
  });
  it.each(['closed', 'missing-price', 'customer-denied'])('does not persist a partial quote when %s', async (failure) => {
    const { service, actor, oppId, tx } = setup();
    if (failure === 'closed') tx.sdOpp.findFirst.mockResolvedValue(null);
    if (failure === 'missing-price') tx.sdProductPrice.findFirst.mockResolvedValue(null);
    if (failure === 'customer-denied') tx.crmCustomer.findFirst.mockResolvedValue(null);
    await expect(service.save('demo-portal', actor, null, { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 1, requestKey: uuid() })).rejects.toThrow();
    expect(tx.sdQuotation.create).not.toHaveBeenCalled(); expect(tx.sdQuotationLine.createMany).not.toHaveBeenCalled();
  });
  it('rejects changing customer, removing, adding, or changing the opportunity through PATCH', async () => {
    const { service, actor, oppId, tx } = setup();
    const result = await service.save('demo-portal', actor, null, { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 1, requestKey: uuid() }) as { id: string; title: string; customerId: string; opportunityId: string; quoteDate: string; validUntil: string };
    const draft = { title: result.title, customerId: result.customerId, opportunityId: result.opportunityId, quoteDate: result.quoteDate, validUntil: result.validUntil, contactId: null, terms: '', remark: '', version: 1, lines: [], requestKey: uuid() };
    for (const change of [{ customerId: uuid() }, { opportunityId: null }, { opportunityId: uuid() }]) await expect(service.save('demo-portal', actor, result.id, { ...draft, ...change })).rejects.toThrow('不能更改');
    tx.sdQuotation.findFirst.mockResolvedValueOnce({ ...result, status: 'DRAFT', version: 1, opportunityId: null, lines: [] });
    await expect(service.save('demo-portal', actor, result.id, draft)).rejects.toThrow('不能更改');
    expect(tx.sdQuotation.updateMany).not.toHaveBeenCalled();
  });
  it('replays the original creation before reading changed opportunity data', async () => {
    const { service, actor, oppId, tx } = setup();
    const input = { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 1, requestKey: uuid() };
    const result = await service.save('demo-portal', actor, null, input);
    const event = tx.sdQuoteEvent.create.mock.calls[0][0].data;
    tx.sdQuoteEvent.findUnique.mockResolvedValue(event);
    tx.sdOpp.findFirst.mockClear();
    expect(await service.save('demo-portal', actor, null, input)).toEqual(result);
    expect(tx.sdOpp.findFirst).not.toHaveBeenCalled(); expect(tx.sdQuotation.create).toHaveBeenCalledTimes(1);
  });
});

describe('opportunity entry creation guards', () => {
  it('rejects a stale source version before creating any quotation', async () => {
    const { service, actor, oppId, tx } = setup();
    await expect(service.save('demo-portal', actor, null, { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 2, requestKey: uuid() })).rejects.toThrow('商机信息已更新');
    expect(tx.sdQuotation.create).not.toHaveBeenCalled(); expect(tx.sdProductPrice.findFirst).not.toHaveBeenCalled();
  });
  it('collects invalid product reasons and persists nothing', async () => {
    const { service, actor, oppId, customerId, tx, pricing, line } = setup();
    tx.sdOpp.findFirst.mockResolvedValue({ id: oppId, customerId, version: 1, products: [{ ...line, productName: '停用产品' }, { ...line, productName: '未定价产品' }] });
    pricing.eligible.mockRejectedValueOnce(new ApiException('BAD_REQUEST', 400, '产品已停用'));
    tx.sdProductPrice.findFirst.mockResolvedValue(null);
    await expect(service.save('demo-portal', actor, null, { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 1, requestKey: uuid() })).rejects.toThrow(/停用产品.*产品已停用.*未定价产品.*没有有效定价/);
    expect(tx.sdQuotation.create).not.toHaveBeenCalled();
  });
  it('allows multiple separate confirmations and an empty opportunity draft', async () => {
    const { service, actor, oppId, customerId, tx } = setup();
    tx.sdOpp.findFirst.mockResolvedValue({ id: oppId, customerId, version: 1, products: [] });
    const first = await service.save('demo-portal', actor, null, { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 1, requestKey: uuid() });
    const second = await service.save('demo-portal', actor, null, { mode: 'OPPORTUNITY', opportunityId: oppId, opportunityVersion: 1, requestKey: uuid() });
    expect(first).toMatchObject({ total: '0.00', lines: [] }); expect(second).toMatchObject({ total: '0.00', lines: [] });
    expect(tx.sdQuotation.create).toHaveBeenCalledTimes(2);
    expect(tx.sdQuotation.create.mock.calls[0][0].data.id).not.toBe(tx.sdQuotation.create.mock.calls[1][0].data.id);
  });
});

describe('latest opportunity quotation lookup', () => {
  it('orders by creation time before limiting, preserving the association filter', async () => {
    const { service, tx, actor, oppId } = setup();
    const findMany = jest.fn().mockResolvedValue([]);
    Object.assign(tx.sdQuotation, { findMany, count: jest.fn().mockResolvedValue(0) });
    jest.spyOn(service, 'expire').mockResolvedValue(undefined);
    await service.list('demo-portal', actor, { opportunityId: oppId, pageSize: 1, sortBy: 'createdAt' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }));
    expect(JSON.stringify(findMany.mock.calls[0][0].where)).toContain(oppId);
    await service.list('demo-portal', actor, {});
    expect(findMany.mock.calls[1][0].orderBy).toEqual([{ updatedAt: 'desc' }, { id: 'asc' }]);
  });
});
