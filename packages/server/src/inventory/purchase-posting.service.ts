import { Injectable } from '@nestjs/common';
import type { Prisma, ScmPurchaseReceipt, ScmPurchaseReceiptLine } from '../generated/prisma/client';
import { ApiException } from '../http/api-exceptions';
/** Purchase stock movements always share the document command's transaction. */
@Injectable()
export class PurchasePostingService {
    async apply(tx: Prisma.TransactionClient, doc: ScmPurchaseReceipt, line: ScmPurchaseReceiptLine, actorId: string, reverse = false) {
        const dimension = { tenantId: doc.tenantId, legalEntityId: doc.legalEntityId, warehouseId: doc.warehouseId, itemCode: line.itemCode, batchNo: line.batchNo };
        const balance = await tx.scmInventoryBalance.findUnique({ where: { tenantId_legalEntityId_warehouseId_itemCode_batchNo: dimension } });
        if (balance && (balance.baseUnit !== line.baseUnit || balance.currencyCode !== doc.currencyCode))
            throw new ApiException('DATA_INVALID', 409, '库存单位或币别不一致');
        if (reverse) {
            const original = await tx.scmInventoryTxn.findUnique({ where: { sourceLineId_movementType: { sourceLineId: line.id, movementType: 'INBOUND' } } });
            if (!original)
                throw new ApiException('DATA_INVALID', 409, '原入库流水不存在');
            if (balance && balance.quantity.eq(line.quantity) && !balance.amount.eq(line.costAmount))
                throw new ApiException('DATA_INVALID', 409, '库存成本已变化，不能直接冲销至零数量');
            const result = await tx.scmInventoryBalance.updateMany({ where: { ...dimension, quantity: { gte: line.quantity }, amount: { gte: line.costAmount } }, data: { quantity: { decrement: line.quantity }, amount: { decrement: line.costAmount }, version: { increment: 1 } } });
            if (result.count !== 1)
                throw new ApiException('BAD_REQUEST', 409, '库存已消耗，不能冲销该采购入库');
        }
        else
            await tx.scmInventoryBalance.upsert({ where: { tenantId_legalEntityId_warehouseId_itemCode_batchNo: dimension }, create: { ...dimension, baseUnit: line.baseUnit, quantity: line.quantity, amount: line.costAmount, currencyCode: doc.currencyCode }, update: { quantity: { increment: line.quantity }, amount: { increment: line.costAmount }, version: { increment: 1 } } });
        await tx.scmInventoryTxn.create({ data: { tenantId: doc.tenantId, applicationId: doc.applicationId, sourceType: 'PURCHASE_RECEIPT', sourceName: reverse ? '采购入库冲销' : '采购入库', sourceOrderId: doc.id, orderNo: doc.receiptNo, sourceLineId: line.id, lineNo: line.lineNo, movementType: reverse ? 'REVERSAL' : 'INBOUND', itemCode: line.itemCode, itemName: line.itemName, quantity: reverse ? line.quantity.negated() : line.quantity, amount: reverse ? line.costAmount.negated() : line.costAmount, batchNo: line.batchNo, warehouseId: doc.warehouseId, legalEntityId: doc.legalEntityId, currencyCode: doc.currencyCode, remark: line.remark, actorId } });
    }
}
