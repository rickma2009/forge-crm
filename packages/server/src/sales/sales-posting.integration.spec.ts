import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { InventoryService } from '../inventory/inventory.service';
import { SalesPostingService } from '../inventory/sales-posting.service';
import { SalesService } from './sales.service';

const run = process.env.RUN_SALES_POSTING_DB_TESTS === '1' ? describe : describe.skip;
const system = 'demo-portal', day = '2026-10-03';
const command = (version: number, note = '') => ({ version, requestKey: randomUUID(), note });
run('sales posting with an isolated PostgreSQL database', () => {
  let db: DatabaseService, inventory: InventoryService, sales: SalesService;
  let maker: string, reviewer: string, itemId: string, itemCode: string, customerId: string, warehouseId: string, legalEntityId: string, tenantId: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!/^\/sdd_sales_[0-9a-f]{12}$/.test(url.pathname) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('ISOLATED_SALES_DATABASE_REQUIRED');
    db = new DatabaseService(url.toString()); inventory = new InventoryService(db); sales = new SalesService(db, new SalesPostingService());
    const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: system } }); tenantId = app.tenantId;
    maker = (await db.iamUser.findFirstOrThrow({ where: { tenantId, account: 'admin' } })).id;
    reviewer = (await db.iamUser.findFirstOrThrow({ where: { tenantId, status: 'ACTIVE', id: { not: maker } } })).id;
    customerId = (await db.crmCustomer.findFirstOrThrow({ where: { systemCode: system, statusValue: 'active' } })).id;
    const warehouse = await db.scmWarehouse.findFirstOrThrow({ where: { tenantId, status: 'ACTIVE' } }); warehouseId = warehouse.id; legalEntityId = warehouse.legalEntityId;
    const { id, createdAt, updatedAt, ...source } = await db.mdItem.findFirstOrThrow({ where: { tenantId, itemType: 'PRODUCT', status: 'ACTIVE' } });
    const item = await db.mdItem.create({ data: { ...source, itemCode: 'POSTING-TEST', itemName: '过账隔离测试物料', batchManaged: true } }); itemId = item.id; itemCode = item.itemCode;
  }, 30000);
  afterAll(async () => { await db?.$disconnect(); });

  it('rejects a non-sales organization on sales order save', async () => {
    const nonSales = await db.orgUnit.findFirstOrThrow({ where: { tenantId, status: 'ACTIVE', isSalesOrg: false } });
    await expect(sales.saveOrder(system, maker, null, { version: 0, orderDate: day, sourceType: 'MANUAL', customerId, salespersonId: maker, organizationId: nonSales.id, region: '测试区域', orderType: 'NORMAL', discount: '1', remark: '', lines: [{ itemId, quantity: '1', unitPrice: '20', discount: '1', taxRate: '0', sortNo: 1, remark: '' }] })).rejects.toThrow('销售员、组织或产品无效');
  });

  async function receive(batchNo: string, quantity = '3') {
    const receipt = await inventory.saveInbound(system, maker, 'test', null, { version: 0, legalEntityId, warehouseId, documentDate: day, inboundType: 'STOCK_GAIN', reasonCode: 'TEST', currencyCode: 'CNY', remark: '隔离测试入库', lines: [{ lineNo: 1, itemCode, batchNo, actualQty: quantity, amount: String(Number(quantity) * 10), remark: '' }] });
    expect(receipt.orderNo).toMatch(/^IB[0-9]{13}$/);
    await inventory.command(system, maker, 'test', receipt.id, 'post', command(receipt.version));
  }
  async function order() {
    let row = await sales.saveOrder(system, maker, null, { version: 0, orderDate: day, sourceType: 'MANUAL', customerId, salespersonId: maker, organizationId: null, region: '测试区域', orderType: 'NORMAL', discount: '1', remark: '', lines: [{ itemId, quantity: '10', unitPrice: '20', discount: '1', taxRate: '0', sortNo: 1, remark: '' }] });
    expect(row.orderNo).toMatch(/^SO[0-9]{13}$/);
    row = await sales.orderCommand(system, maker, row.id, 'submit', command(row.version));
    return sales.orderCommand(system, reviewer, row.id, 'approve', command(row.version));
  }
  async function outbound(source: Awaited<ReturnType<typeof order>>, batches: string[]) {
    const row = await sales.saveOutbound(system, maker, null, { version: 0, orderId: source.id, documentDate: day, warehouseId, shipperId: maker, remark: '', lines: batches.map(batchNo => ({ orderLineId: source.lines[0].id, batchNo, quantity: '2', remark: '' })) });
    expect(row.outboundNo).toMatch(/^OB[0-9]{13}$/);
    return sales.outboundCommand(system, maker, row.id, 'submit', command(row.version));
  }
  const balance = (batchNo: string) => db.scmInventoryBalance.findUniqueOrThrow({ where: { tenantId_legalEntityId_warehouseId_itemCode_batchNo: { tenantId, legalEntityId, warehouseId, itemCode, batchNo } } });
  async function snapshot(id: string, orderId: string, batches: string[]) {
    return { balances: await Promise.all(batches.map(balance)), document: await sales.outbound(system, id), order: await sales.order(system, orderId), movements: await db.scmInventoryTxn.findMany({ where: { sourceOrderId: id }, orderBy: { lineNo: 'asc' } }), events: await db.sdSalesEvent.findMany({ where: { documentId: id }, orderBy: { id: 'asc' } }) };
  }
  function coordinatedSales() {
    let release!: () => void, arrivals = 0;
    const gate = new Promise<void>(resolve => { release = resolve; });
    class CoordinatedPosting extends SalesPostingService {
      async post(...args: Parameters<SalesPostingService['post']>) {
        if (++arrivals === 2) release();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try { await Promise.race([gate, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('BARRIER_TIMEOUT')), 5000); })]); }
        finally { clearTimeout(timer); }
        return super.post(...args);
      }
    }
    return { service: new SalesService(db, new CoordinatedPosting()), arrivals: () => arrivals };
  }
  it('rolls back the first line, order updates and event when the second batch is exhausted', async () => {
    const a = `A-${randomUUID()}`, b = `B-${randomUUID()}`; await receive(a); await receive(b);
    const source = await order(), target = await outbound(source, [a, b]), competing = await outbound(source, [b]);
    await sales.outboundCommand(system, reviewer, competing.id, 'approve', command(competing.version));
    const before = await snapshot(target.id, source.id, [a, b]);
    const posting = new SalesPostingService(), observed = jest.spyOn(posting, 'post');
    await expect(new SalesService(db, posting).outboundCommand(system, reviewer, target.id, 'approve', command(target.version))).rejects.toThrow('库存不足');
    expect(observed).toHaveBeenCalledTimes(2);
    expect((await observed.mock.results[0].value).toFixed(2)).toBe('20.00');
    expect(await snapshot(target.id, source.id, [a, b])).toEqual(before);
  }, 30000);
  it('commits only one competing issue, then permits an explicit retry after replenishment', async () => {
    const batch = `RACE-${randomUUID()}`; await receive(batch); const source = await order();
    const left = await outbound(source, [batch]), right = await outbound(source, [batch]);
    const concurrent = coordinatedSales(), docs = [left, right], commands = docs.map(row => command(row.version));
    const results = await Promise.allSettled(docs.map((row, index) => concurrent.service.outboundCommand(system, reviewer, row.id, 'approve', commands[index])));
    expect(concurrent.arrivals()).toBe(2); expect(results.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    const failed = results.findIndex(row => row.status === 'rejected'); expect(failed).toBeGreaterThanOrEqual(0);
    const reason = (results[failed] as PromiseRejectedResult).reason;
    expect(reason.code === 'P2034' || /并发|serialize|serialization/i.test(reason.message)).toBe(true);
    expect((await balance(batch)).quantity.toString()).toBe('1'); expect((await balance(batch)).amount.toString()).toBe('10');
    expect((await sales.order(system, source.id)).lines[0].shippedQty).toBe('2.0000');
    expect(await db.scmInventoryTxn.count({ where: { batchNo: batch, movementType: 'OUTBOUND' } })).toBe(1);
    expect(await db.sdSalesEvent.count({ where: { requestKey: commands[failed].requestKey } })).toBe(0);
    expect((await sales.outbound(system, docs[failed].id)).status).toBe('SUBMITTED');
    await receive(batch, '2');
    await sales.outboundCommand(system, reviewer, docs[failed].id, 'approve', commands[failed]);
    expect((await sales.order(system, source.id)).lines[0].shippedQty).toBe('4.0000');
    expect((await balance(batch)).quantity.toString()).toBe('1');
  }, 30000);
  it('rolls back the stock decrement when PostgreSQL rejects the movement insert', async () => {
    const batch = `FAIL-${randomUUID()}`; await receive(batch); const source = await order(), row = await outbound(source, [batch]);
    const before = await snapshot(row.id, source.id, [batch]);
    const constraint = `test_reject_${randomUUID().replaceAll('-', '')}`;
    // Identifiers and literal values below are generated locally, never from user input.
    await db.$executeRawUnsafe(`ALTER TABLE scm_inventory_txn ADD CONSTRAINT "${constraint}" CHECK (batch_no <> '${batch}' OR movement_type <> 'OUTBOUND')`);
    try {
      await expect(sales.outboundCommand(system, reviewer, row.id, 'approve', command(row.version))).rejects.toThrow(constraint);
      expect(await snapshot(row.id, source.id, [batch])).toEqual(before);
    } finally { await db.$executeRawUnsafe(`ALTER TABLE scm_inventory_txn DROP CONSTRAINT "${constraint}"`); }
  }, 30000);
  it('applies one business effect for the same key submitted concurrently and safely replays after conflict', async () => {
    const batch = `SAME-${randomUUID()}`; await receive(batch); const source = await order(), row = await outbound(source, [batch]);
    const input = command(row.version), concurrent = coordinatedSales();
    const results = await Promise.allSettled([0, 1].map(() => concurrent.service.outboundCommand(system, reviewer, row.id, 'approve', input)));
    expect(concurrent.arrivals()).toBe(2); expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect(failure).toBeDefined(); expect(failure.reason.code === 'P2034' || /并发|serialize|serialization/i.test(failure.reason.message)).toBe(true);
    const committed = await snapshot(row.id, source.id, [batch]);
    expect(committed.balances[0].quantity.toString()).toBe('1'); expect(committed.balances[0].amount.toString()).toBe('10');
    expect(committed.order.lines[0].shippedQty).toBe('2.0000'); expect(committed.order.lines[0].lineStatus).toBe('PARTIAL');
    expect(committed.movements).toHaveLength(1); expect(committed.events.filter(event => event.requestKey === input.requestKey)).toHaveLength(1);
    const replay = await sales.outboundCommand(system, reviewer, row.id, 'approve', input);
    expect(replay).toEqual(committed.document); expect(await snapshot(row.id, source.id, [batch])).toEqual(committed);
  }, 30000);
  it('does not duplicate sequential approval/reversal and reconciles balance to net movements', async () => {
    const batch = `REVERSE-${randomUUID()}`; await receive(batch); const source = await order(), row = await outbound(source, [batch]);
    const approve = command(row.version); const approved = await sales.outboundCommand(system, reviewer, row.id, 'approve', approve);
    const once = await snapshot(row.id, source.id, [batch]);
    await sales.outboundCommand(system, reviewer, row.id, 'approve', approve); expect(await snapshot(row.id, source.id, [batch])).toEqual(once);
    const reverse = command(approved.version, '隔离测试冲销'); await sales.outboundCommand(system, reviewer, row.id, 'reverse', reverse);
    const reversed = await snapshot(row.id, source.id, [batch]); await sales.outboundCommand(system, reviewer, row.id, 'reverse', reverse);
    expect(await snapshot(row.id, source.id, [batch])).toEqual(reversed);
    expect(reversed.document.status).toBe('REVERSED'); expect(reversed.order.fulfillmentStatus).toBe('NOT_SHIPPED'); expect(reversed.order.lines[0].shippedQty).toBe('0.0000');
    expect(reversed.movements.map(row => row.movementType).sort()).toEqual(['OUTBOUND', 'OUTBOUND_REVERSAL']);
    const sums = await db.scmInventoryTxn.aggregate({ where: { tenantId, legalEntityId, warehouseId, itemCode, batchNo: batch }, _sum: { quantity: true, amount: true } });
    expect((await balance(batch)).quantity.toString()).toBe('3'); expect((await balance(batch)).amount.toString()).toBe('30');
    expect(sums._sum.quantity!.toString()).toBe('3'); expect(sums._sum.amount!.toString()).toBe('30');
  }, 30000);
});
