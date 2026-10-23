import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supplierWriteSchema, purchaseOrderWriteSchema, purchaseReceiptWriteSchema, purchaseCommandSchema, type PurchaseReceiptWrite } from '@forge-crm/contracts';
import { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { NumberingService } from '../numbering/numbering.service';
import { PurchasePostingService } from '../inventory/purchase-posting.service';
import { ApiException } from '../http/api-exceptions';
import { D } from '../sales/sales-domain';
import { pricePurchase, allocateReceipt } from './purchasing-domain';
type Tx = Prisma.TransactionClient;
type Scope = {
    id: string;
    tenantId: string;
};
type Order = Prisma.ScmPurchaseOrderGetPayload<{
    include: {
        lines: true;
    };
}>;
type Receipt = Prisma.ScmPurchaseReceiptGetPayload<{
    include: {
        lines: true;
    };
}>;
function fail(message: string, status = 400): never { throw new ApiException('BAD_REQUEST', status, message); }
const uuid = (s: string) => z.string().uuid().parse(s);
const json = <T>(value: T): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(20), keyword: z.string().trim().max(128).default(''), status: z.string().max(24).default('') });
@Injectable()
export class PurchasingService {
    constructor(private readonly db: DatabaseService, private readonly inventory: PurchasePostingService, private readonly numbers: NumberingService) { }
    private async transact<T>(work: (tx: Tx) => Promise<T>): Promise<T> { for (let attempt = 0;; attempt++) {
        try {
            return await this.db.$transaction(work, { isolationLevel: 'Serializable', timeout: 30000 });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
                if (attempt < 2)
                    continue;
                fail('单据或库存并发变化，请刷新后重试', 409);
            }
            throw error;
        }
    } }
    private async scope(code: string): Promise<Scope> { const apps = await this.db.sysApplication.findMany({ where: { applicationCode: code, status: 'ACTIVE', tenant: { status: 'ACTIVE' } }, take: 2 }); if (apps.length !== 1)
        fail('系统不存在或作用域不明确', 404); return apps[0]; }
    private async lock(tx: Tx, scope: Scope) { await tx.$queryRaw `SELECT pg_advisory_xact_lock(hashtextextended(${`purchasing:${scope.tenantId}`},0))::text`; }
    private async actor(tx: Tx, s: Scope, id: string) { if (!await tx.iamUser.findFirst({ where: { id: uuid(id), tenantId: s.tenantId, status: 'ACTIVE' } }))
        fail('操作人不可用', 403); }
    private async warehouse(tx: Tx, s: Scope, id: string, legalEntityId: string) { const row = await tx.scmWarehouse.findFirst({ where: { id, tenantId: s.tenantId, legalEntityId, status: 'ACTIVE' } }); const legal = await tx.orgLegalEntity.findFirst({ where: { id: legalEntityId, tenantId: s.tenantId, status: 'ACTIVE', currencyCode: 'CNY' } }); if (!row || !legal)
        fail('法人或仓库不可用，仓库必须属于所选法人'); }
    private version(row: {
        version: number;
    }, expected?: number) { if (row.version !== expected)
        fail('单据已变化，请刷新后重试', 409); }
    private async audit(tx: Tx, s: Scope, actorId: string, targetType: string, targetId: string, action: string) { await tx.sysAuditLog.create({ data: { tenantId: s.tenantId, applicationId: s.id, actorUserId: actorId, actionCode: action, resourceType: targetType, resourceId: targetId, requestId: randomUUID(), afterSnapshot: { module: 'purchasing' } } }); }
    private orderDto(row: Order) { return { ...row, orderDate: row.orderDate.toISOString().slice(0, 10), expectedDate: row.expectedDate.toISOString().slice(0, 10), amount: row.amount.toFixed(2), netAmount: row.netAmount.toFixed(2), taxAmount: row.taxAmount.toFixed(2), discount: row.discount.toString(), lines: row.lines.sort((a, b) => a.sortNo - b.sortNo || a.lineNo - b.lineNo).map(l => ({ ...l, quantity: l.quantity.toFixed(4), unitPrice: l.unitPrice.toFixed(6), discount: l.discount.toString(), taxRate: l.taxRate.toString(), amount: l.amount.toFixed(2), finalAmount: l.finalAmount.toFixed(2), taxAmount: l.taxAmount.toFixed(2), receivedQty: l.receivedQty.toFixed(4) })) }; }
    private receiptDto(row: Receipt) { return { ...row, documentDate: row.documentDate.toISOString().slice(0, 10), grossAmount: row.grossAmount.toFixed(2), taxAmount: row.taxAmount.toFixed(2), costAmount: row.costAmount.toFixed(2), lines: row.lines.sort((a, b) => a.lineNo - b.lineNo).map(l => ({ ...l, quantity: l.quantity.toFixed(4), grossAmount: l.grossAmount.toFixed(2), taxAmount: l.taxAmount.toFixed(2), costAmount: l.costAmount.toFixed(2) })) }; }
    private async orderRow(tx: Tx, s: Scope, id: string) { const row = await tx.scmPurchaseOrder.findFirst({ where: { id: uuid(id), tenantId: s.tenantId, applicationId: s.id }, include: { lines: true } }); if (!row)
        fail('采购订单不存在', 404); return row; }
    private async receiptRow(tx: Tx, s: Scope, id: string) { const row = await tx.scmPurchaseReceipt.findFirst({ where: { id: uuid(id), tenantId: s.tenantId, applicationId: s.id }, include: { lines: { orderBy: { lineNo: 'asc' } } } }); if (!row)
        fail('采购入库不存在', 404); return row; }
    async history(code: string, kind: 'order' | 'receipt', id: string) { const s = await this.scope(code); if (kind === 'order')
        await this.orderRow(this.db, s, id);
    else
        await this.receiptRow(this.db, s, id); const rows = await this.db.scmPurchaseEvent.findMany({ where: { tenantId: s.tenantId, applicationId: s.id, documentId: id, documentType: kind === 'order' ? 'PURCHASE_ORDER' : 'PURCHASE_RECEIPT' }, orderBy: { createdAt: 'asc' }, select: { id: true, actorId: true, action: true, note: true, createdAt: true } }); return rows; }
    async options(code: string) { const s = await this.scope(code); const [suppliers, items, warehouses, legalEntities, users] = await Promise.all([this.db.mdSupplier.findMany({ where: { tenantId: s.tenantId, deletedAt: null }, orderBy: { supplierCode: 'asc' }, select: { id: true, supplierCode: true, supplierName: true, taxRate: true, status: true } }), this.db.mdItem.findMany({ where: { tenantId: s.tenantId, status: 'ACTIVE' }, orderBy: { itemCode: 'asc' }, select: { id: true, itemCode: true, itemName: true, baseUnit: true, batchManaged: true } }), this.db.scmWarehouse.findMany({ where: { tenantId: s.tenantId }, orderBy: { sortNo: 'asc' }, select: { id: true, warehouseName: true, legalEntityId: true, status: true } }), this.db.orgLegalEntity.findMany({ where: { tenantId: s.tenantId, currencyCode: 'CNY' }, orderBy: { sortNo: 'asc' }, select: { id: true, entityName: true, status: true } }), this.db.iamUser.findMany({ where: { tenantId: s.tenantId }, select: { id: true, displayName: true, status: true } })]); return { suppliers, items, warehouses, legalEntities, users, categories: [{ code: 'GENERAL', name: '综合供应商' }, { code: 'ELECTRONIC', name: '电子元器件' }, { code: 'MECHANICAL', name: '结构件' }, { code: 'PACKAGING', name: '包装辅料' }, { code: 'SERVICE', name: '服务及外协' }] }; }
    async suppliers(code: string, raw: unknown) { const s = await this.scope(code), q = querySchema.parse(raw); const where: Prisma.MdSupplierWhereInput = { tenantId: s.tenantId, deletedAt: null, ...(q.status ? { status: q.status } : {}), ...(q.keyword ? { OR: [{ supplierCode: { contains: q.keyword, mode: 'insensitive' } }, { supplierName: { contains: q.keyword, mode: 'insensitive' } }, { shortName: { contains: q.keyword, mode: 'insensitive' } }] } : {}) }; const [items, total] = await Promise.all([this.db.mdSupplier.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }), this.db.mdSupplier.count({ where })]); return { items, pagination: { ...q, total } }; }
    async supplier(code: string, id: string) { const s = await this.scope(code), row = await this.db.mdSupplier.findFirst({ where: { id: uuid(id), tenantId: s.tenantId, deletedAt: null } }); if (!row)
        fail('供应商不存在', 404); return row; }
    async saveSupplier(code: string, actorId: string, id: string | null, raw: unknown) { const s = await this.scope(code), input = supplierWriteSchema.parse(raw); if (!['GENERAL', 'ELECTRONIC', 'MECHANICAL', 'PACKAGING', 'SERVICE'].includes(input.categoryCode))
        fail('供应商类别无效'); const number = id ? null : await this.numbers.allocate(code, 'SUPPLIER'); return this.transact(async (tx) => { await this.lock(tx, s); await this.actor(tx, s, actorId); if (id) {
        const row = await tx.mdSupplier.findFirst({ where: { id: uuid(id), tenantId: s.tenantId, deletedAt: null } });
        if (!row)
            fail('供应商不存在', 404);
        this.version(row, input.version);
    } const fields = { ...input }; delete fields.version; const row = id ? await tx.mdSupplier.update({ where: { id }, data: { ...fields, updatedBy: actorId, version: { increment: 1 } } }) : await tx.mdSupplier.create({ data: { ...fields, tenantId: s.tenantId, supplierCode: number!, creatorId: actorId, updatedBy: actorId } }); await this.audit(tx, s, actorId, 'SUPPLIER', row.id, id ? 'update' : 'create'); return row; }); }
    async deleteSupplier(code: string, actorId: string, id: string, raw: unknown) { const s = await this.scope(code), input = purchaseCommandSchema.parse(raw); return this.transact(async (tx) => { await this.lock(tx, s); await this.actor(tx, s, actorId); const row = await tx.mdSupplier.findFirst({ where: { id: uuid(id), tenantId: s.tenantId, deletedAt: null } }); if (!row)
        fail('供应商不存在', 404); this.version(row, input.version); if (await tx.scmPurchaseOrder.count({ where: { tenantId: s.tenantId, supplierId: id } }))
        fail('供应商已被采购单引用，请停用而不是删除', 409); await tx.mdSupplier.update({ where: { id }, data: { deletedAt: new Date(), status: 'DISABLED', updatedBy: actorId, version: { increment: 1 } } }); await this.audit(tx, s, actorId, 'SUPPLIER', id, 'delete'); return { id, deleted: true }; }); }
    async orders(code: string, raw: unknown) { const s = await this.scope(code), q = querySchema.parse(raw); const where: Prisma.ScmPurchaseOrderWhereInput = { tenantId: s.tenantId, applicationId: s.id, ...(q.status ? { status: q.status } : {}), ...(q.keyword ? { OR: [{ orderNo: { contains: q.keyword, mode: 'insensitive' } }, { supplierName: { contains: q.keyword, mode: 'insensitive' } }] } : {}) }; const [rows, total] = await Promise.all([this.db.scmPurchaseOrder.findMany({ where, include: { lines: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }), this.db.scmPurchaseOrder.count({ where })]); return { items: rows.map(r => this.orderDto(r)), pagination: { ...q, total } }; }
    async order(code: string, id: string) { const s = await this.scope(code); return this.orderDto(await this.orderRow(this.db, s, id)); }
    private async validOrder(tx: Tx, s: Scope, row: Order) { if (!await tx.mdSupplier.findFirst({ where: { id: row.supplierId, tenantId: s.tenantId, status: 'ACTIVE', deletedAt: null } }))
        fail('供应商不可用'); await this.actor(tx, s, row.buyerId); await this.warehouse(tx, s, row.warehouseId, row.legalEntityId); if (!row.lines.length)
        fail('采购订单至少有一行'); const items = await tx.mdItem.findMany({ where: { id: { in: row.lines.map(l => l.itemId) }, tenantId: s.tenantId, status: 'ACTIVE' } }); if (row.lines.some(l => !items.some(i => i.id === l.itemId && i.itemCode === l.itemCode)))
        fail('采购物料已停用或变更'); }
    async saveOrder(code: string, actorId: string, id: string | null, raw: unknown) { const s = await this.scope(code), input = purchaseOrderWriteSchema.parse(raw); if (input.expectedDate < input.orderDate)
        fail('预计到货日不能早于订单日期'); if (new Set(input.lines.map(l => l.sortNo)).size !== input.lines.length)
        fail('显示序号不能重复'); if (input.lines.some(l => D(l.unitPrice).isZero() && !l.remark && !input.remark))
        fail('零单价采购必须填写备注'); let pricing: ReturnType<typeof pricePurchase>; try {
        pricing = pricePurchase(input.lines, input.discount);
    }
    catch {
        fail('采购金额超过允许范围');
    } const orderNo = id ? null : await this.numbers.allocate(code, 'PURCHASE_ORDER'); return this.transact(async (tx) => { await this.lock(tx, s); await this.actor(tx, s, actorId); if (id) {
        const old = await this.orderRow(tx, s, id);
        this.version(old, input.version);
        if (old.status !== 'DRAFT')
            fail('仅草稿采购订单可修改', 409);
    } await this.actor(tx, s, input.buyerId); await this.warehouse(tx, s, input.warehouseId, input.legalEntityId); const supplier = await tx.mdSupplier.findFirst({ where: { id: input.supplierId, tenantId: s.tenantId, status: 'ACTIVE', deletedAt: null } }); if (!supplier)
        fail('供应商不可用'); const items = await tx.mdItem.findMany({ where: { id: { in: input.lines.map(l => l.itemId) }, tenantId: s.tenantId, status: 'ACTIVE' } }); if (input.lines.some(l => !items.some(i => i.id === l.itemId)))
        fail('物料不存在或已停用'); const data = { supplierId: input.supplierId, supplierCode: supplier.supplierCode, supplierName: supplier.supplierName, buyerId: input.buyerId, legalEntityId: input.legalEntityId, warehouseId: input.warehouseId, orderDate: new Date(input.orderDate), expectedDate: new Date(input.expectedDate), orderType: input.orderType, discount: D(input.discount), amount: pricing.amount, netAmount: pricing.netAmount, taxAmount: pricing.taxAmount, remark: input.remark }; const row = id ? await tx.scmPurchaseOrder.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await tx.scmPurchaseOrder.create({ data: { ...data, tenantId: s.tenantId, applicationId: s.id, orderNo: orderNo!, creatorId: actorId } }); if (id)
        await tx.scmPurchaseOrderLine.deleteMany({ where: { orderId: id } }); await tx.scmPurchaseOrderLine.createMany({ data: input.lines.map((line, index) => { const item = items.find(i => i.id === line.itemId)!; return { orderId: row.id, tenantId: s.tenantId, applicationId: s.id, lineNo: index + 1, sortNo: line.sortNo, itemId: item.id, itemCode: item.itemCode, itemName: item.itemName, baseUnit: item.baseUnit, quantity: D(line.quantity), unitPrice: D(line.unitPrice), discount: D(line.discount), taxRate: D(line.taxRate), amount: pricing.lines[index].amount, finalAmount: pricing.lines[index].finalAmount, taxAmount: pricing.lines[index].taxAmount, remark: line.remark }; }) }); await this.audit(tx, s, actorId, 'PURCHASE_ORDER', row.id, id ? 'update' : 'create'); return this.orderDto(await this.orderRow(tx, s, row.id)); }); }
    async receipts(code: string, raw: unknown) { const s = await this.scope(code), q = querySchema.parse(raw); const where: Prisma.ScmPurchaseReceiptWhereInput = { tenantId: s.tenantId, applicationId: s.id, ...(q.status ? { status: q.status } : {}), ...(q.keyword ? { OR: [{ receiptNo: { contains: q.keyword, mode: 'insensitive' } }, { orderNo: { contains: q.keyword, mode: 'insensitive' } }, { supplierName: { contains: q.keyword, mode: 'insensitive' } }] } : {}) }; const [rows, total] = await Promise.all([this.db.scmPurchaseReceipt.findMany({ where, include: { lines: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }), this.db.scmPurchaseReceipt.count({ where })]); return { items: rows.map(r => this.receiptDto(r)), pagination: { ...q, total } }; }
    async receipt(code: string, id: string) { const s = await this.scope(code); return this.receiptDto(await this.receiptRow(this.db, s, id)); }
    private async receiptLines(tx: Tx, s: Scope, order: Order, input: PurchaseReceiptWrite) { if (order.status !== 'APPROVED' || ['FULL', 'REMAINDER_CLOSED'].includes(order.fulfillmentStatus))
        fail('来源订单必须已审核且有未收货数量', 409); await this.validOrder(tx, s, order); await this.warehouse(tx, s, input.warehouseId, order.legalEntityId); await this.actor(tx, s, input.receiverId); const items = await tx.mdItem.findMany({ where: { tenantId: s.tenantId, id: { in: order.lines.map(l => l.itemId) }, status: 'ACTIVE' } }); const duplicates = new Set<string>(); const previous = await tx.scmPurchaseReceiptLine.findMany({ where: { orderId: order.id, receipt: { status: 'POSTED' } } }); const running = new Map(order.lines.map(l => [l.id, { quantity: l.receivedQty, gross: previous.filter(p => p.orderLineId === l.id).reduce((a, p) => a.plus(p.grossAmount), D(0)), tax: previous.filter(p => p.orderLineId === l.id).reduce((a, p) => a.plus(p.taxAmount), D(0)) }])); return input.lines.map((line, index) => { const source = order.lines.find(l => l.id === line.orderLineId); if (!source)
        fail('入库行不属于来源订单'); const item = items.find(i => i.id === source.itemId); if (!item || (item.batchManaged && !line.batchNo) || (!item.batchManaged && !!line.batchNo))
        fail(`第${index + 1}行物料或批次无效：批次物料必填批号，非批次物料不得填批号`); const key = `${line.orderLineId}:${line.batchNo}`; if (duplicates.has(key))
        fail('同一订单行、批次不能重复，请合并数量'); duplicates.add(key); const prior = running.get(source.id)!; const qty = D(line.quantity); if (prior.quantity.plus(qty).gt(source.quantity))
        fail(`来源第${source.lineNo}行入库数量超出剩余量`, 409); const gross = allocateReceipt(source.finalAmount, source.quantity, prior.quantity, prior.gross, qty); const tax = allocateReceipt(source.taxAmount, source.quantity, prior.quantity, prior.tax, qty); if (tax.gt(gross))
        fail('本次数量过小导致税额舍入异常，请合并入库'); prior.quantity = prior.quantity.plus(qty); prior.gross = prior.gross.plus(gross); prior.tax = prior.tax.plus(tax); return { tenantId: s.tenantId, applicationId: s.id, orderId: order.id, orderLineId: source.id, lineNo: index + 1, sourceLineNo: source.lineNo, itemId: source.itemId, itemCode: source.itemCode, itemName: source.itemName, baseUnit: source.baseUnit, batchNo: line.batchNo, quantity: qty, grossAmount: gross, taxAmount: tax, costAmount: gross.minus(tax), remark: line.remark }; }); }
    async saveReceipt(code: string, actorId: string, id: string | null, raw: unknown) { const s = await this.scope(code), input = purchaseReceiptWriteSchema.parse(raw), receiptNo = id ? null : await this.numbers.allocate(code, 'INBOUND'); return this.transact(async (tx) => { await this.lock(tx, s); await this.actor(tx, s, actorId); if (id) {
        const old = await this.receiptRow(tx, s, id);
        this.version(old, input.version);
        if (old.status !== 'DRAFT')
            fail('仅草稿采购入库可修改', 409);
        if (old.orderId !== input.orderId)
            fail('来源订单创建后不可更换');
    } const order = await this.orderRow(tx, s, input.orderId), lines = await this.receiptLines(tx, s, order, input); const data = { orderId: order.id, orderNo: order.orderNo, supplierId: order.supplierId, supplierName: order.supplierName, legalEntityId: order.legalEntityId, currencyCode: order.currencyCode, warehouseId: input.warehouseId, receiverId: input.receiverId, documentDate: new Date(input.documentDate), remark: input.remark, grossAmount: lines.reduce((a, l) => a.plus(l.grossAmount), D(0)), taxAmount: lines.reduce((a, l) => a.plus(l.taxAmount), D(0)), costAmount: lines.reduce((a, l) => a.plus(l.costAmount), D(0)) }; const row = id ? await tx.scmPurchaseReceipt.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await tx.scmPurchaseReceipt.create({ data: { ...data, tenantId: s.tenantId, applicationId: s.id, receiptNo: receiptNo!, creatorId: actorId } }); if (id)
        await tx.scmPurchaseReceiptLine.deleteMany({ where: { receiptId: id } }); await tx.scmPurchaseReceiptLine.createMany({ data: lines.map(l => ({ ...l, receiptId: row.id })) }); await this.audit(tx, s, actorId, 'PURCHASE_RECEIPT', row.id, id ? 'update' : 'create'); return this.receiptDto(await this.receiptRow(tx, s, row.id)); }); }
    private async fulfill(tx: Tx, order: Order) { const rows = await tx.scmPurchaseOrderLine.findMany({ where: { orderId: order.id } }); for (const l of rows)
        await tx.scmPurchaseOrderLine.update({ where: { id: l.id }, data: { lineStatus: l.receivedQty.isZero() ? 'NOT_RECEIVED' : l.receivedQty.eq(l.quantity) ? 'FULL' : 'PARTIAL' } }); const state = rows.every(l => l.receivedQty.eq(l.quantity)) ? 'FULL' : rows.some(l => l.receivedQty.gt(0)) ? 'PARTIAL' : 'NOT_RECEIVED'; await tx.scmPurchaseOrder.update({ where: { id: order.id }, data: { fulfillmentStatus: order.fulfillmentStatus === 'REMAINDER_CLOSED' ? 'REMAINDER_CLOSED' : state, version: { increment: 1 } } }); }
    async command(code: string, actorId: string, kind: 'order' | 'receipt', id: string, action: string, raw: unknown) {
        const s = await this.scope(code), input = purchaseCommandSchema.parse(raw);
        uuid(id);
        const hash = createHash('sha256').update(JSON.stringify({ kind, id, action, version: input.version, note: input.note })).digest('hex');
        return this.transact(async (tx) => {
            await this.lock(tx, s);
            await this.actor(tx, s, actorId);
            const previous = await tx.scmPurchaseEvent.findUnique({ where: { applicationId_actorId_requestKey: { applicationId: s.id, actorId, requestKey: input.requestKey } } });
            if (previous) {
                if (previous.requestHash !== hash)
                    fail('重复请求标识对应了不同操作', 409);
                return previous.result;
            }
            if (['reject', 'cancel', 'close', 'reverse', 'delete'].includes(action) && !input.note)
                fail('该操作必须填写原因');
            const row = kind === 'order' ? await this.orderRow(tx, s, id) : await this.receiptRow(tx, s, id);
            this.version(row, input.version);
            const requireStatus = (status: string) => { if (row.status !== status)
                fail('当前状态不允许该操作', 409); };
            let next = row.status;
            const metadata: {
                submittedBy?: string | null;
                submittedAt?: Date | null;
                approvedBy?: string;
                approvedAt?: Date;
            } = {};
            if (action === 'submit') {
                requireStatus('DRAFT');
                if (kind === 'order')
                    await this.validOrder(tx, s, row as Order);
                else {
                    const r = row as Receipt;
                    await this.receiptLines(tx, s, await this.orderRow(tx, s, r.orderId), { orderId: r.orderId, warehouseId: r.warehouseId, receiverId: r.receiverId, documentDate: r.documentDate.toISOString().slice(0, 10), remark: r.remark, lines: r.lines.map(l => ({ orderLineId: l.orderLineId, batchNo: l.batchNo, quantity: l.quantity.toString(), remark: l.remark })) });
                }
                next = 'SUBMITTED';
                metadata.submittedBy = actorId;
                metadata.submittedAt = new Date();
            }
            else if (action === 'withdraw' || action === 'reject') {
                requireStatus('SUBMITTED');
                if (action === 'withdraw' && row.submittedBy !== actorId)
                    fail('仅提交人可撤回', 403);
                next = 'DRAFT';
                metadata.submittedBy = null;
                metadata.submittedAt = null;
            }
            else if (action === 'approve') {
                requireStatus('SUBMITTED');
                if (row.submittedBy === actorId)
                    fail('提交人与审核人必须分离', 403);
                if (kind === 'order')
                    await this.validOrder(tx, s, row as Order);
                else {
                    const r = row as Receipt;
                    await this.receiptLines(tx, s, await this.orderRow(tx, s, r.orderId), { orderId: r.orderId, warehouseId: r.warehouseId, receiverId: r.receiverId, documentDate: r.documentDate.toISOString().slice(0, 10), remark: r.remark, lines: r.lines.map(l => ({ orderLineId: l.orderLineId, batchNo: l.batchNo, quantity: l.quantity.toString(), remark: l.remark })) });
                }
                next = 'APPROVED';
                metadata.approvedBy = actorId;
                metadata.approvedAt = new Date();
            }
            else if (action === 'delete') {
                requireStatus('DRAFT');
                if (kind === 'order' && await tx.scmPurchaseReceipt.count({ where: { orderId: id, status: { notIn: ['VOIDED', 'REVERSED'] } } }))
                    fail('有有效入库单，不能删除');
                next = 'VOIDED';
            }
            else if (action === 'cancel') {
                requireStatus('APPROVED');
                if (kind === 'order') {
                    const o = row as Order;
                    if (o.lines.some(l => l.receivedQty.gt(0)) || await tx.scmPurchaseReceipt.count({ where: { orderId: id, status: { notIn: ['VOIDED', 'REVERSED'] } } }))
                        fail('已有收货或有效入库单，不能取消', 409);
                }
                next = 'VOIDED';
            }
            else if (action === 'close' && kind === 'order') {
                requireStatus('APPROVED');
                if ((row as Order).fulfillmentStatus !== 'PARTIAL')
                    fail('仅部分收货订单可关闭剩余量');
                if (await tx.scmPurchaseReceipt.count({ where: { orderId: id, status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] } } }))
                    fail('请先处理未过账入库单');
                await tx.scmPurchaseOrder.update({ where: { id }, data: { fulfillmentStatus: 'REMAINDER_CLOSED' } });
            }
            else if ((action === 'post' || action === 'reverse') && kind === 'receipt') {
                requireStatus(action === 'post' ? 'APPROVED' : 'POSTED');
                const r = row as Receipt, order = await this.orderRow(tx, s, r.orderId);
                if (action === 'post') {
                    const lines = await this.receiptLines(tx, s, order, { orderId: r.orderId, warehouseId: r.warehouseId, receiverId: r.receiverId, documentDate: r.documentDate.toISOString().slice(0, 10), remark: r.remark, lines: r.lines.map(l => ({ orderLineId: l.orderLineId, batchNo: l.batchNo, quantity: l.quantity.toString(), remark: l.remark })) });
                    for (let i = 0; i < lines.length; i++) {
                        const l = await tx.scmPurchaseReceiptLine.update({ where: { id: r.lines[i].id }, data: lines[i] });
                        await this.inventory.apply(tx, r, l, actorId);
                        await tx.scmPurchaseOrderLine.update({ where: { id: l.orderLineId }, data: { receivedQty: { increment: l.quantity } } });
                    }
                    await tx.scmPurchaseReceipt.update({ where: { id }, data: { grossAmount: lines.reduce((a, l) => a.plus(l.grossAmount), D(0)), taxAmount: lines.reduce((a, l) => a.plus(l.taxAmount), D(0)), costAmount: lines.reduce((a, l) => a.plus(l.costAmount), D(0)), postedBy: actorId, postedAt: new Date() } });
                    next = 'POSTED';
                }
                else {
                    for (const l of r.lines) {
                        await this.inventory.apply(tx, r, l, actorId, true);
                        await tx.scmPurchaseOrderLine.update({ where: { id: l.orderLineId }, data: { receivedQty: { decrement: l.quantity } } });
                    }
                    await tx.scmPurchaseReceipt.update({ where: { id }, data: { reversedBy: actorId, reversedAt: new Date() } });
                    next = 'REVERSED';
                }
                await this.fulfill(tx, order);
            }
            else
                fail('无效采购操作');
            let result: Prisma.InputJsonValue;
            if (kind === 'order') {
                await tx.scmPurchaseOrder.update({ where: { id }, data: { status: next, ...metadata, version: { increment: 1 } } });
                result = json(this.orderDto(await this.orderRow(tx, s, id)));
            }
            else {
                await tx.scmPurchaseReceipt.update({ where: { id }, data: { status: next, ...metadata, version: { increment: 1 } } });
                result = json(this.receiptDto(await this.receiptRow(tx, s, id)));
            }
            await tx.scmPurchaseEvent.create({ data: { tenantId: s.tenantId, applicationId: s.id, actorId, documentId: id, documentType: kind === 'order' ? 'PURCHASE_ORDER' : 'PURCHASE_RECEIPT', action, requestKey: input.requestKey, requestHash: hash, note: input.note, result } });
            await this.audit(tx, s, actorId, kind === 'order' ? 'PURCHASE_ORDER' : 'PURCHASE_RECEIPT', id, action);
            return result;
        });
    }
}
