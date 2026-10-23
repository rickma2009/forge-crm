import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { InventoryService } from './inventory.service';

const run = process.env.RUN_SALES_POSTING_DB_TESTS === '1' ? describe : describe.skip;
run('inventory summary in isolated PostgreSQL', () => {
  let db: DatabaseService, service: InventoryService;
  let entity: string, otherEntity: string, warehouse: string, otherWarehouse: string;
  let categories: { majorCategoryId: string; middleCategoryId: string; minorCategoryId: string };
  const system = 'demo-portal', code = 'QUERY-TEST-P';
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!/^\/sdd_sales_[0-9a-f]{12}$/.test(url.pathname) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('ISOLATED_SALES_DATABASE_REQUIRED');
    db = new DatabaseService(url.toString()); service = new InventoryService(db);
    const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: system } });
    const actor = await db.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, account: 'admin' } });
    const entitySource = await db.orgLegalEntity.findFirstOrThrow({ where: { tenantId: app.tenantId } });
    const makeEntity = (suffix: string, currencyCode: string) => db.orgLegalEntity.create({ data: { tenantId: app.tenantId, orgUnitId: entitySource.orgUnitId, entityCode: `QUERY-${suffix}`, entityName: `查询测试${suffix}`, currencyCode, createdBy: 'test', updatedBy: 'test' } });
    const cny = await makeEntity('CNY', 'CNY'), usd = await makeEntity('USD', 'USD'); entity = cny.id; otherEntity = usd.id;
    const warehouseSource = await db.scmWarehouse.findFirstOrThrow({ where: { tenantId: app.tenantId } });
    const makeWarehouse = (suffix: string, legalEntityId: string) => db.scmWarehouse.create({ data: { tenantId: app.tenantId, legalEntityId, warehouseCode: `QUERY-${suffix}`, warehouseName: `查询仓${suffix}`, warehouseType: warehouseSource.warehouseType, warehouseNature: warehouseSource.warehouseNature, createdBy: 'test', updatedBy: 'test' } });
    const a = await makeWarehouse('A', entity), b = await makeWarehouse('B', entity), c = await makeWarehouse('C', otherEntity); warehouse = a.id; otherWarehouse = b.id;
    for (const [itemType, itemCode, itemName] of [['PRODUCT', code, '查询测试控制板'], ['MATERIAL', 'QUERY-TEST-M', '查询测试电阻']] as const) {
      const { id, createdAt, updatedAt, ...source } = await db.mdItem.findFirstOrThrow({ where: { tenantId: app.tenantId, itemType, status: 'ACTIVE' } });
      const item = await db.mdItem.create({ data: { ...source, itemCode, itemName, batchManaged: true } });
      if (itemType === 'PRODUCT') {
        if (!item.majorCategoryId || !item.middleCategoryId || !item.minorCategoryId) throw new Error('CATEGORY_FIXTURE_REQUIRED');
        categories = { majorCategoryId: item.majorCategoryId, middleCategoryId: item.middleCategoryId, minorCategoryId: item.minorCategoryId };
      }
    }
    // CNY balances originate from real posted receipts.
    for (const [storage, itemCode, batchNo, quantity, currencyCode] of [[a, code, 'Q-A1', 2, 'CNY'], [a, code, 'Q-A2', 3, 'CNY'], [b, code, 'Q-B', 5, 'CNY'], [a, 'QUERY-TEST-M', 'Q-M', 11, 'CNY']] as const) {
      const receipt = await service.saveInbound(system, actor.id, 'test', null, { version: 0, legalEntityId: storage.legalEntityId, warehouseId: storage.id, documentDate: '2026-10-03', inboundType: 'STOCK_GAIN', reasonCode: 'TEST', currencyCode, remark: '查询隔离测试', lines: [{ lineNo: 1, itemCode, batchNo, actualQty: String(quantity), amount: String(quantity * 10), remark: '' }] });
      await service.command(system, actor.id, 'test', receipt.id, 'post', { version: receipt.version, requestKey: randomUUID(), note: '' });
    }
    // Inbound currently accepts only CNY. Synthetic USD query data verifies defensive
    // grouping only; it is not evidence of supported USD posting or ledger reconciliation.
    const product = await db.mdItem.findFirstOrThrow({ where: { tenantId: app.tenantId, itemCode: code } });
    await db.scmInventoryBalance.create({ data: { tenantId: app.tenantId, legalEntityId: otherEntity, warehouseId: c.id, itemCode: code, batchNo: 'Q-C', baseUnit: product.baseUnit, quantity: '7', amount: '70', currencyCode: 'USD' } });
  }, 30000);
  afterAll(async () => { await db?.$disconnect(); });

  it('keeps currencies separate and reconciles each group with every paginated detail row', async () => {
    const first = await service.inventorySummary(system, { itemCodeExact: code, pageSize: 1 });
    const second = await service.inventorySummary(system, { itemCodeExact: code, pageSize: 1, page: 2 });
    expect(first.pagination).toEqual({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    expect([...first.items, ...second.items].map(row => [row.currencyCode, row.quantity, row.amount])).toEqual([['CNY', '10.0000', '100.00'], ['USD', '7.0000', '70.00']]);
    for (const summary of [...first.items, ...second.items]) {
      const rows = [];
      for (let page = 1; ; page++) {
        const result = await service.listBalances(system, { itemCodeExact: code, currencyCode: summary.currencyCode, page, pageSize: 1 });
        rows.push(...result.items);
        if (page >= result.pagination.totalPages) break;
      }
      expect(rows.length).toBe(summary.currencyCode === 'CNY' ? 3 : 1);
      expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
      expect(rows.reduce((sum, row) => sum + Number(row.quantity), 0).toFixed(4)).toBe(summary.quantity);
      expect(rows.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2)).toBe(summary.amount);
      expect(rows.every(row => row.legalEntityName && row.warehouseName && row.batchNo)).toBe(true);
    }
  });

  it('applies entity, warehouse, name and each category before grouping and drilldown', async () => {
    const cases: Array<[Record<string, unknown>, string[]]> = [
      [{ legalEntityId: entity }, ['10.0000']],
      [{ legalEntityId: otherEntity }, ['7.0000']],
      [{ warehouseId: warehouse }, ['5.0000']],
      [{ warehouseId: otherWarehouse }, ['5.0000']],
      [{ itemName: '控制板' }, ['10.0000', '7.0000']],
      ...Object.entries(categories).map(([key, value]): [Record<string, unknown>, string[]] => [{ [key]: value }, ['10.0000', '7.0000']]),
      [{ legalEntityId: entity, warehouseId: warehouse, itemName: '控制板', ...categories }, ['5.0000']],
      [{ legalEntityId: otherEntity, warehouseId: warehouse }, []],
      [{ itemName: '不存在' }, []],
    ];
    for (const [filter, quantities] of cases) {
      const query = { itemCode: 'QUERY-TEST-', ...filter };
      // Entity/warehouse filters intentionally include the second material when applicable.
      const all = await service.inventorySummary(system, query);
      expect(all.items.filter(row => row.itemCode === code).map(row => row.quantity)).toEqual(quantities);
      if (filter.itemName || Object.keys(filter).some(key => key.endsWith('CategoryId'))) expect(all.items.every(row => row.itemCode === code)).toBe(true);
      for (const group of all.items) {
        const detail = await service.listBalances(system, { ...query, itemCodeExact: group.itemCode, currencyCode: group.currencyCode });
        expect(detail.items.every(row => row.itemCode === group.itemCode)).toBe(true);
        expect(detail.items.reduce((sum, row) => sum + Number(row.quantity), 0).toFixed(4)).toBe(group.quantity);
      }
    }
    const empty = await service.inventorySummary(system, { itemCodeExact: 'QUERY-NO-MATCH' });
    expect(empty.items).toEqual([]); expect(empty.pagination.total).toBe(0);
  });
});
