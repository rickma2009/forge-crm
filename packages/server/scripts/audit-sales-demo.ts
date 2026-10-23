/** Read-only reconciliation of the sales demonstration's order, stock and ledger totals. */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DatabaseService } from '../src/database/database.service';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const db = new DatabaseService(process.env.DATABASE_URL!);
const marker = 'DEMO-SALES-20261003';

async function main() {
  const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } });
  const orders = await db.sdSalesOrder.findMany({ where: { applicationId: app.id, remark: { startsWith: `${marker}-ORDER-` } }, include: { lines: true } });
  const outbounds = await db.sdSalesOutbound.findMany({ where: { applicationId: app.id, remark: { startsWith: `${marker}-OUTBOUND-` } }, include: { lines: true } });
  const receipts = await db.scmInboundOrder.findMany({ where: { applicationId: app.id, remark: { startsWith: `${marker}-INBOUND-` } }, include: { lines: true } });
  if (orders.length !== 100 || outbounds.length !== 100 || receipts.length !== 2 || receipts.some((row) => row.status !== 'POSTED')) throw new Error('演示单据数量或入库状态不符');
  const status = Object.fromEntries(['DRAFT', 'SUBMITTED', 'APPROVED', 'REVERSED'].map((key) => [key, outbounds.filter((row) => row.status === key).length]));
  if (status.DRAFT !== 20 || status.SUBMITTED !== 20 || status.APPROVED !== 50 || status.REVERSED !== 10) throw new Error(`出库单状态数量不符：${JSON.stringify(status)}`);
  for (const order of orders) for (const line of order.lines) {
    const posted = outbounds.filter((outbound) => outbound.status === 'APPROVED').flatMap((outbound) => outbound.lines).filter((item) => item.orderLineId === line.id).reduce((sum, item) => sum + Number(item.quantity), 0);
    if (Number(line.shippedQty) !== posted || Number(line.shippedQty) > Number(line.quantity)) throw new Error(`订单行 ${line.id} 已出货数量与有效出库单不符`);
    const expected = posted === 0 ? 'NOT_SHIPPED' : posted === Number(line.quantity) ? 'FULL' : 'PARTIAL';
    if (line.lineStatus !== expected) throw new Error(`订单行 ${line.id} 履约状态不符`);
  }
  const dimensions = new Map<string, { legalEntityId: string; warehouseId: string; itemCode: string; batchNo: string }>();
  const historicalDrift: Array<{ itemCode: string; batchNo: string; warehouseId: string; quantity: number; amount: number }> = [];
  for (const receipt of receipts) for (const line of receipt.lines) dimensions.set([receipt.legalEntityId, receipt.warehouseId, line.itemCode, line.batchNo || ''].join('|'), { legalEntityId: receipt.legalEntityId, warehouseId: receipt.warehouseId, itemCode: line.itemCode, batchNo: line.batchNo || '' });
  for (const dim of dimensions.values()) {
    const [balance, txns] = await Promise.all([
      db.scmInventoryBalance.findUnique({ where: { tenantId_legalEntityId_warehouseId_itemCode_batchNo: { tenantId: app.tenantId, ...dim } } }),
      db.scmInventoryTxn.findMany({ where: { tenantId: app.tenantId, ...dim } }),
    ]);
    if (!balance || balance.quantity.lessThan(0) || balance.amount.lessThan(0)) throw new Error(`库存余额不存在或为负：${JSON.stringify(dim)}`);
    const quantity = txns.reduce((sum, txn) => sum + Number(txn.quantity), 0);
    const amount = txns.reduce((sum, txn) => sum + Number(txn.amount), 0);
    const demoIds = new Set([...receipts.map((row) => row.id), ...outbounds.map((row) => row.id)]);
    const demoLedger = txns.filter((txn) => demoIds.has(txn.sourceOrderId));
    const inboundQty = receipts.filter((row) => row.legalEntityId === dim.legalEntityId && row.warehouseId === dim.warehouseId).flatMap((row) => row.lines).filter((line) => line.itemCode === dim.itemCode && (line.batchNo || '') === dim.batchNo).reduce((sum, line) => sum + Number(line.actualQty), 0);
    const shippedQty = outbounds.filter((row) => row.status === 'APPROVED' && row.legalEntityId === dim.legalEntityId && row.warehouseId === dim.warehouseId).flatMap((row) => row.lines).filter((line) => line.itemCode === dim.itemCode && line.batchNo === dim.batchNo).reduce((sum, line) => sum + Number(line.quantity), 0);
    const demoQuantity = demoLedger.reduce((sum, txn) => sum + Number(txn.quantity), 0);
    if (Math.abs(demoQuantity - (inboundQty - shippedQty)) > 0.0001) throw new Error(`演示库存流水净变动不符：${JSON.stringify(dim)}`);
    const driftQty = Number(balance.quantity) - quantity, driftAmount = Number(balance.amount) - amount;
    if (Math.abs(driftQty) > 0.0001 || Math.abs(driftAmount) > 0.01) historicalDrift.push({ itemCode: dim.itemCode, batchNo: dim.batchNo, warehouseId: dim.warehouseId, quantity: Number(driftQty.toFixed(4)), amount: Number(driftAmount.toFixed(2)) });
  }
  const ledger = await db.scmInventoryTxn.groupBy({ by: ['movementType'], where: { applicationId: app.id, sourceOrderId: { in: outbounds.map((row) => row.id) } }, _count: true });
  const count = Object.fromEntries(ledger.map((row) => [row.movementType, row._count]));
  if (count.OUTBOUND !== 60 || count.OUTBOUND_REVERSAL !== 10) throw new Error(`出库及冲销流水不符：${JSON.stringify(count)}`);
  console.log(JSON.stringify({ orders: orders.length, outbounds: outbounds.length, statuses: status, postedReceipts: receipts.length, ledger: count, stockDimensions: dimensions.size, demoMovementsReconciled: true, historicalDrift }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
