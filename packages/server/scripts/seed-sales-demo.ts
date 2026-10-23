/** Idempotent local demonstration data: receipts finance stock; posted sales issues consume it. */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../src/database/database.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { SalesPostingService } from '../src/inventory/sales-posting.service';
import { SalesService } from '../src/sales/sales.service';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const db = new DatabaseService(url);
const inventory = new InventoryService(db);
const sales = new SalesService(db, new SalesPostingService());
const systemCode = 'demo-portal';
const marker = 'DEMO-SALES-20261003';
const date = '2026-10-03';
const command = (version: number, note = '') => ({ version, requestKey: randomUUID(), note });

async function main() {
  const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
  const [maker, approver, warehouses, customers, items] = await Promise.all([
    db.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, account: 'admin', status: 'ACTIVE' } }),
    db.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, account: 'sales1.manager', status: 'ACTIVE' } }),
    db.scmWarehouse.findMany({ where: { tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: { warehouseCode: 'asc' } }),
    db.crmCustomer.findMany({ where: { systemCode, statusValue: 'active' }, take: 90, orderBy: { customerCode: 'asc' } }),
    db.mdItem.findMany({ where: { tenantId: app.tenantId, status: 'ACTIVE', itemType: 'PRODUCT', itemCode: { in: ['P2026090001', 'TEST-P-BOARD-001'] } } }),
  ]);
  if (warehouses.length < 2 || customers.length < 80 || items.length !== 2 || new Set(items.map((row) => row.batchManaged)).size !== 2) throw new Error('演示客户、仓库或批次/非批次产品不足');
  const itemAt = (index: number) => items.find((item) => item.batchManaged === (index % 2 === 1))!;
  const batch = (index: number, warehouseIndex: number) => itemAt(index).batchManaged ? `DEMO-SALES-${warehouseIndex + 1}` : null;

  // Inbound orders, not direct balance updates, establish the available stock and ledger.
  for (let warehouseIndex = 0; warehouseIndex < 2; warehouseIndex++) {
    const warehouse = warehouses[warehouseIndex];
    const remark = `${marker}-INBOUND-${warehouseIndex + 1}`;
    let inbound = await db.scmInboundOrder.findFirst({ where: { applicationId: app.id, remark }, include: { lines: true } });
    if (!inbound) {
      const created = await inventory.saveInbound(systemCode, maker.id, maker.account, null, {
        legalEntityId: warehouse.legalEntityId, warehouseId: warehouse.id, documentDate: date,
        inboundType: 'STOCK_GAIN', reasonCode: 'SALES_DEMO', currencyCode: 'CNY', remark, version: 0,
        lines: items.map((item, index) => ({ lineNo: index + 1, itemCode: item.itemCode, batchNo: item.batchManaged ? `DEMO-SALES-${warehouseIndex + 1}` : null, actualQty: '1000.0000', amount: '50000.00', remark: '销售出库演示备货' })),
      });
      inbound = await db.scmInboundOrder.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true } });
    }
    if (inbound.status === 'DRAFT') await inventory.command(systemCode, maker.id, maker.account, inbound.id, 'post', command(inbound.version, '销售演示备货'));
    if (inbound.status !== 'DRAFT' && inbound.status !== 'POSTED') throw new Error(`演示入库单 ${remark} 状态异常`);
  }

  const orders: Array<{ id: string; status: string }> = [];
  for (let index = 0; index < 100; index++) {
    const remark = `${marker}-ORDER-${String(index + 1).padStart(3, '0')}`;
    const item = itemAt(index);
    let order = await db.sdSalesOrder.findFirst({ where: { applicationId: app.id, remark }, select: { id: true, status: true, version: true } });
    if (!order) {
      const created = await sales.saveOrder(systemCode, maker.id, null, {
        version: 0, orderDate: date, sourceType: 'MANUAL', customerId: customers[index % customers.length].id,
        salespersonId: maker.id, organizationId: null, region: index % 2 ? '华东' : '华南', orderType: 'NORMAL', discount: '1', remark,
        lines: [{ itemId: item.id, quantity: '3.0000', unitPrice: '120.000000', discount: '1', taxRate: '0.13', sortNo: 1, remark: '' }],
      });
      order = { id: created.id, status: created.status, version: created.version };
    }
    if (index < 80 && order.status === 'DRAFT') { const next = await sales.orderCommand(systemCode, maker.id, order.id, 'submit', command(order.version)); order = { id: next.id, status: next.status, version: next.version }; }
    if (index < 80 && order.status === 'SUBMITTED') { const next = await sales.orderCommand(systemCode, approver.id, order.id, 'approve', command(order.version)); order = { id: next.id, status: next.status, version: next.version }; }
    if (index >= 80 && index < 90 && order.status === 'DRAFT') { const next = await sales.orderCommand(systemCode, maker.id, order.id, 'submit', command(order.version)); order = { id: next.id, status: next.status, version: next.version }; }
    orders.push(order);
  }

  for (let index = 0; index < 100; index++) {
    const order = orders[index % 80];
    const detail = await db.sdSalesOrder.findUniqueOrThrow({ where: { id: order.id }, include: { lines: true } });
    const warehouseIndex = index % 2;
    const remark = `${marker}-OUTBOUND-${String(index + 1).padStart(3, '0')}`;
    let outbound = await db.sdSalesOutbound.findFirst({ where: { applicationId: app.id, remark }, select: { id: true, status: true, version: true } });
    if (!outbound) {
      const created = await sales.saveOutbound(systemCode, maker.id, null, {
        version: 0, orderId: order.id, documentDate: date, warehouseId: warehouses[warehouseIndex].id, shipperId: maker.id, remark,
        lines: [{ orderLineId: detail.lines[0].id, batchNo: batch(index % 80, warehouseIndex), quantity: '1.0000', remark: '' }],
      });
      outbound = { id: created.id, status: created.status, version: created.version };
    }
    if (index < 80 && outbound.status === 'DRAFT') { const next = await sales.outboundCommand(systemCode, maker.id, outbound.id, 'submit', command(outbound.version)); outbound = { id: next.id, status: next.status, version: next.version }; }
    if (index < 60 && outbound.status === 'SUBMITTED') { const next = await sales.outboundCommand(systemCode, approver.id, outbound.id, 'approve', command(outbound.version)); outbound = { id: next.id, status: next.status, version: next.version }; }
    if (index >= 50 && index < 60 && outbound.status === 'APPROVED') await sales.outboundCommand(systemCode, approver.id, outbound.id, 'reverse', command(outbound.version, '演示冲销'));
  }

  const [orderCount, outboundStatuses, inboundCount, issueCount, reversalCount] = await Promise.all([
    db.sdSalesOrder.count({ where: { applicationId: app.id, remark: { startsWith: `${marker}-ORDER-` } } }),
    db.sdSalesOutbound.groupBy({ by: ['status'], where: { applicationId: app.id, remark: { startsWith: `${marker}-OUTBOUND-` } }, _count: true }),
    db.scmInboundOrder.count({ where: { applicationId: app.id, remark: { startsWith: `${marker}-INBOUND-` }, status: 'POSTED' } }),
    db.scmInventoryTxn.count({ where: { applicationId: app.id, sourceType: 'SALES_OUTBOUND', movementType: 'OUTBOUND' } }),
    db.scmInventoryTxn.count({ where: { applicationId: app.id, sourceType: 'SALES_OUTBOUND', movementType: 'OUTBOUND_REVERSAL' } }),
  ]);
  console.log(JSON.stringify({ orderCount, outboundStatuses, inboundCount, issueCount, reversalCount }));
  if (orderCount !== 100 || inboundCount !== 2 || outboundStatuses.find((row) => row.status === 'APPROVED')?._count !== 50) throw new Error('销售演示数据数量核对失败');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
