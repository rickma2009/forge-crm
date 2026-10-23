import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { ApiException } from '../http/api-exceptions';
import { movingAverageIssue } from '../sales/sales-domain';

type Tx = Prisma.TransactionClient;
type Scope = { id: string; tenantId: string };
type Document = { id: string; outboundNo: string; legalEntityId: string; warehouseId: string; currencyCode: string };
type Line = { id: string; lineNo: number; itemId: string; itemCode: string; itemName: string; baseUnit: string; batchNo: string; quantity: Prisma.Decimal; costAmount: Prisma.Decimal; remark: string };

/** Inventory owns stock balances and immutable movement records for sales issues. */
@Injectable()
export class SalesPostingService {
  async post(tx: Tx, scope: Scope, document: Document, line: Line, actorId: string) {
    const item = await tx.mdItem.findFirst({ where: { id: line.itemId, tenantId: scope.tenantId, status: 'ACTIVE' } });
    if (!item || item.itemCode !== line.itemCode || (item.batchManaged && !line.batchNo) || (!item.batchManaged && line.batchNo)) throw new ApiException('BAD_REQUEST', 400, `第${line.lineNo}行物项或批次无效`);
    const dimension = { tenantId: scope.tenantId, legalEntityId: document.legalEntityId, warehouseId: document.warehouseId, itemCode: line.itemCode, batchNo: line.batchNo };
    const balance = await tx.scmInventoryBalance.findUnique({ where: { tenantId_legalEntityId_warehouseId_itemCode_batchNo: dimension } });
    if (!balance) throw new ApiException('BAD_REQUEST', 409, `第${line.lineNo}行仓库批次库存不足`);
    let result: ReturnType<typeof movingAverageIssue>;
    try { result = movingAverageIssue(balance.quantity, balance.amount, line.quantity); }
    catch { throw new ApiException('BAD_REQUEST', 409, `第${line.lineNo}行仓库批次库存不足或金额异常`); }
    const changed = await tx.scmInventoryBalance.updateMany({ where: { id: balance.id, version: balance.version, quantity: { gte: line.quantity }, amount: { gte: result.cost } }, data: { quantity: result.remainingQuantity, amount: result.remainingAmount, version: { increment: 1 } } });
    if (changed.count !== 1) throw new ApiException('BAD_REQUEST', 409, '库存并发变化，请刷新重试');
    await tx.scmInventoryTxn.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, sourceType: 'SALES_OUTBOUND', sourceName: '销售出库', sourceOrderId: document.id, orderNo: document.outboundNo, sourceLineId: line.id, lineNo: line.lineNo, movementType: 'OUTBOUND', itemCode: line.itemCode, itemName: line.itemName, quantity: line.quantity.negated(), amount: result.cost.negated(), batchNo: line.batchNo, warehouseId: document.warehouseId, legalEntityId: document.legalEntityId, currencyCode: document.currencyCode, remark: line.remark, actorId } });
    return result.cost;
  }

  async reverse(tx: Tx, scope: Scope, document: Document, line: Line, actorId: string) {
    const dimension = { tenantId: scope.tenantId, legalEntityId: document.legalEntityId, warehouseId: document.warehouseId, itemCode: line.itemCode, batchNo: line.batchNo };
    const existing = await tx.scmInventoryTxn.findUnique({ where: { sourceLineId_movementType: { sourceLineId: line.id, movementType: 'OUTBOUND' } } });
    if (!existing) throw new ApiException('BAD_REQUEST', 409, '原销售出库流水不存在');
    await tx.scmInventoryBalance.upsert({ where: { tenantId_legalEntityId_warehouseId_itemCode_batchNo: dimension }, create: { ...dimension, baseUnit: line.baseUnit, quantity: line.quantity, amount: line.costAmount, currencyCode: document.currencyCode }, update: { quantity: { increment: line.quantity }, amount: { increment: line.costAmount }, version: { increment: 1 } } });
    await tx.scmInventoryTxn.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, sourceType: 'SALES_OUTBOUND', sourceName: '销售出库冲销', sourceOrderId: document.id, orderNo: document.outboundNo, sourceLineId: line.id, lineNo: line.lineNo, movementType: 'OUTBOUND_REVERSAL', itemCode: line.itemCode, itemName: line.itemName, quantity: line.quantity, amount: line.costAmount, batchNo: line.batchNo, warehouseId: document.warehouseId, legalEntityId: document.legalEntityId, currencyCode: document.currencyCode, remark: line.remark, actorId } });
  }
}
