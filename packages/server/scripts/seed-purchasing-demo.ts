import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../src/database/database.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { PurchasingService } from '../src/purchasing/purchasing.service';
import { PurchasePostingService } from '../src/inventory/purchase-posting.service';
import { NumberingService } from '../src/numbering/numbering.service';
loadEnv({ path: resolve(__dirname, '../../../.env'), quiet: true });
const url = process.env.DATABASE_URL;
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
    throw new Error('演示数据仅限本地数据库');
const marker = 'DEMO-PURCHASE-20261011', code = 'demo-portal', date = '2026-10-11';
async function main() {
    const db = new DatabaseService(url!), service = new PurchasingService(db, new PurchasePostingService(), new NumberingService(db));
    try {
        const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: code, status: 'ACTIVE' } });
        const maker = await db.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, normalizedAccount: 'admin', status: 'ACTIVE' } }), approver = await db.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, normalizedAccount: 'sales1.manager', status: 'ACTIVE' } });
        if (!await db.mdItem.findFirst({ where: { tenantId: app.tenantId, batchManaged: true, status: 'ACTIVE' } })) {
            const sample = await db.mdItem.findFirst({ where: { tenantId: app.tenantId, status: 'ACTIVE', majorCategoryId: { not: null }, middleCategoryId: { not: null } } });
            if (!sample?.majorCategoryId || !sample.middleCategoryId)
                throw new Error('需要已有有效大、中分类以生成批次演示物料');
            await new InventoryService(db).createItem(code, maker.account, { itemName: '演示·采购批次控制板', itemType: 'MATERIAL', majorCategoryId: sample.majorCategoryId, middleCategoryId: sample.middleCategoryId, minorCategoryId: sample.minorCategoryId, baseUnit: sample.baseUnit, batchManaged: true, status: 'ACTIVE', remark: `${marker}-BATCH-ITEM` });
        }
        const options = await service.options(code), items = options.items;
        const warehouses = options.warehouses.filter(w => w.status === 'ACTIVE' && options.legalEntities.some(l => l.id === w.legalEntityId && l.status === 'ACTIVE'));
        if (warehouses.length < 1 || items.length < 2 || !items.some(i => i.batchManaged) || !items.some(i => !i.batchManaged))
            throw new Error('需要已有可用仓库、批次和非批次物料');
        const vendors = ['晶源电子', '芯联半导体', '华远连接器', '精拓五金', '恒瑞线材', '天成包装', '启明光电', '汇能电源', '宏达塑胶', '兴泰贴片', '联创磁性', '云峰结构', '锐科传感', '海晟散热', '长盛薄膜', '新锐显示', '诚益模具', '优联物流', '鼎合外协', '博信工装', '清源辅料', '富联印制板', '科盈精密', '卓诚测试'];
        const suppliers = [];
        for (let i = 0; i < 24; i++) {
            const remark = `${marker}-SUPPLIER-${i + 1}`;
            let s = await db.mdSupplier.findFirst({ where: { tenantId: app.tenantId, remark } });
            if (!s)
                s = await service.saveSupplier(code, maker.id, null, { supplierName: `演示·${vendors[i]}有限公司`, shortName: vendors[i], categoryCode: ['ELECTRONIC', 'MECHANICAL', 'PACKAGING', 'SERVICE'][i % 4], contactName: `演示联系人${i + 1}`, phone: `1380000${String(i + 1).padStart(4, '0')}`, email: `supplier${i + 1}@example.com`, address: ['广东省深圳市', '广东省东莞市', '江苏省苏州市', '浙江省杭州市'][i % 4], paymentTermDays: [30, 45, 60, 90][i % 4], leadTimeDays: [7, 14, 21, 30][i % 4], taxRate: '0.13', status: i === 23 ? 'DISABLED' : 'ACTIVE', remark });
            suppliers.push(s);
        }
        const command = async (kind: 'order' | 'receipt', id: string, action: string, user = maker.id) => { const r = kind === 'order' ? await service.order(code, id) : await service.receipt(code, id); return service.command(code, user, kind, id, action, { version: r.version, requestKey: randomUUID(), note: `演示：${action}，通过正式业务服务执行` }); };
        const orders = [];
        for (let i = 1; i <= 32; i++) {
            const remark = `${marker}-ORDER-${i}`;
            let o = await db.scmPurchaseOrder.findFirst({ where: { tenantId: app.tenantId, applicationId: app.id, remark } });
            if (!o) {
                const wh = warehouses[(i - 1) % warehouses.length], supplier = suppliers[(i - 1) % 23];
                const itemA = items.find(m => m.batchManaged === (i % 2 === 0))!, itemB = items.find(m => m.batchManaged === (i % 2 !== 0))!;
                const saved = await service.saveOrder(code, maker.id, null, { supplierId: supplier.id, buyerId: maker.id, legalEntityId: wh.legalEntityId, warehouseId: wh.id, orderDate: date, expectedDate: '2026-10-25', orderType: i % 7 === 0 ? 'SAMPLE' : 'NORMAL', discount: i % 3 === 0 ? '0.97' : '1', remark, lines: [itemA, itemB].map((item, j) => ({ itemId: item.id, quantity: i >= 5 && i <= 12 ? '10' : '30', unitPrice: (45 + i * 3.25 + j * 18).toFixed(6), discount: j === 0 ? '0.98' : '1', taxRate: '0.13', sortNo: j + 1, remark: '采购演示；含税单价' })) });
                o = await db.scmPurchaseOrder.findUniqueOrThrow({ where: { id: saved.id } });
                if (i <= 30)
                    await command('order', o.id, 'submit');
                if (i <= 28)
                    await command('order', o.id, 'approve', approver.id);
            }
            orders.push(await service.order(code, o.id));
        }
        for (let i = 1; i <= 36; i++) {
            const remark = `${marker}-RECEIPT-${i}`;
            const exists = await db.scmPurchaseReceipt.findFirst({ where: { applicationId: app.id, remark } });
            if (exists)
                continue;
            const o = orders[i <= 28 ? i - 1 : i - 17], lines = [];
            for (const line of o.lines) {
                const batch = items.find(item => item.id === line.itemId)!.batchManaged;
                if (batch && i % 3 === 0) {
                    lines.push({ orderLineId: line.id, quantity: '4', batchNo: `PC-${String(i).padStart(3, '0')}-A`, remark: '采购批次分拆A' });
                    lines.push({ orderLineId: line.id, quantity: '6', batchNo: `PC-${String(i).padStart(3, '0')}-B`, remark: '采购批次分拆B' });
                }
                else
                    lines.push({ orderLineId: line.id, quantity: '10', batchNo: batch ? `PC-${String(i).padStart(3, '0')}` : '', remark: '采购收货演示' });
            }
            const r = await service.saveReceipt(code, maker.id, null, { orderId: o.id, warehouseId: o.warehouseId, receiverId: maker.id, documentDate: date, remark, lines });
            if (i <= 33)
                await command('receipt', r.id, 'submit');
            if (i <= 30)
                await command('receipt', r.id, 'approve', approver.id);
            if (i <= 26)
                await command('receipt', r.id, 'post');
            if (i === 25 || i === 26)
                await command('receipt', r.id, 'reverse');
        }
        const suppliersCount = await db.mdSupplier.count({ where: { tenantId: app.tenantId, remark: { startsWith: marker } } }), orderStates = await db.scmPurchaseOrder.groupBy({ by: ['status', 'fulfillmentStatus'], where: { applicationId: app.id, remark: { startsWith: marker } }, _count: true }), receiptStates = await db.scmPurchaseReceipt.groupBy({ by: ['status'], where: { applicationId: app.id, remark: { startsWith: marker } }, _count: true });
        const receipts = await db.scmPurchaseReceipt.findMany({ where: { applicationId: app.id, remark: { startsWith: marker } }, select: { id: true } });
        const txn = await db.scmInventoryTxn.groupBy({ by: ['movementType'], where: { sourceType: 'PURCHASE_RECEIPT', sourceOrderId: { in: receipts.map(r => r.id) } }, _count: true, _sum: { quantity: true, amount: true } });
        const report = { suppliers: suppliersCount, orders: orderStates.reduce((sum, s) => sum + s._count, 0), orderStates, receipts: receiptStates.reduce((sum, s) => sum + s._count, 0), receiptStates, inventoryMovements: txn };
        if (report.suppliers < 20 || report.orders < 20 || report.receipts < 20 || (receiptStates.find(r => r.status === 'POSTED')?._count ?? 0) < 20)
            throw new Error('演示数量验收未通过');
        console.log(JSON.stringify(report, null, 2));
    }
    finally {
        await db.$disconnect();
    }
}
void main().catch(e => { console.error(e instanceof Error ? e.message : '演示初始化失败'); process.exitCode = 1; });
