export type Approval = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CANCELLED';
export type Source = 'MANUAL' | 'OPPORTUNITY' | 'QUOTATION';
export type OrderLine = { id: string; productCode: string; productName: string; spec: string; quantity: number; price: number; discount: number; shipped: number; remark: string };
export type SalesOrder = { id: string; no: string; status: Approval; source: Source; sourceNo: string; customer: string; date: string; createdAt: string; seller: string; organization: string; region: string; type: string; discount: number; taxRate: number; remark: string; lines: OrderLine[] };
export type OutboundLine = { id: string; orderLineId: string; productCode: string; productName: string; batch: string; quantity: number; unitCost: number };
export type SalesOutbound = { id: string; no: string; orderId: string; status: Approval | 'REVERSED'; date: string; warehouse: string; shipper: string; remark: string; lines: OutboundLine[] };
export type SalesState = { orders: SalesOrder[]; outbounds: SalesOutbound[] };
export const sourceLabels: Record<Source, string> = { MANUAL: '按客户新建', OPPORTUNITY: '引入商机', QUOTATION: '引入报价单' };
export const statusLabels: Record<SalesOutbound['status'], string> = { DRAFT: '草稿', SUBMITTED: '已提交审核', APPROVED: '已审核', CANCELLED: '已取消', REVERSED: '已冲销' };
export const products = [
  { code: 'P2026090001', name: '智能控制板', spec: 'CB-100', price: 280, batches: [{ no: 'CB-2609-A', warehouse: '成品仓 A', stock: 120, cost: 186 }, { no: 'CB-2609-B', warehouse: '华东配送仓', stock: 80, cost: 190 }] },
  { code: 'P2026090002', name: '电源模组', spec: 'PM-24V', price: 160, batches: [{ no: 'PM-2609-A', warehouse: '成品仓 A', stock: 90, cost: 103 }, { no: 'PM-2609-B', warehouse: '华东配送仓', stock: 60, cost: 108 }] },
  { code: 'P2026090003', name: '现场安装服务', spec: '标准', price: 600, batches: [] },
];
export const sources = [
  { kind: 'QUOTATION' as Source, no: 'Q2026090008', name: '星海智能制造项目报价', customer: '星海智能制造有限公司', hint: '已接受 · 有效期至 2026-12-31', status: '已接受', validUntil: '2026-12-31', owner: '周然', stage: '', amount: 28_800, lines: [line('P2026090001', 80), line('P2026090002', 40)] },
  { kind: 'QUOTATION' as Source, no: 'Q2026090009', name: '海岳电子控制系统报价', customer: '海岳电子有限公司', hint: '已接受 · 有效期至 2026-12-31', status: '已接受', validUntil: '2026-12-31', owner: '周然', stage: '', amount: 8_640, lines: [line('P2026090001', 24), line('P2026090002', 12)] },
  { kind: 'QUOTATION' as Source, no: 'Q2026090010', name: '云杉科技设备升级报价', customer: '云杉科技服务有限公司', hint: '已接受 · 有效期至 2026-11-30', status: '已接受', validUntil: '2026-11-30', owner: '林晓', stage: '', amount: 14_000, lines: [line('P2026090001', 50)] },
  { kind: 'OPPORTUNITY' as Source, no: 'O2026090001', name: '星海年度智能控制项目', customer: '星海智能制造有限公司', hint: '进行中 · 初步接洽', status: '进行中', validUntil: '', owner: '周然', stage: '初步接洽', amount: 68_000, lines: [line('P2026090001', 60), line('P2026090002', 30)] },
  { kind: 'OPPORTUNITY' as Source, no: 'O2026090002', name: '云杉技术服务扩容', customer: '云杉科技服务有限公司', hint: '进行中 · 方案确认', status: '进行中', validUntil: '', owner: '林晓', stage: '方案确认', amount: 32_000, lines: [line('P2026090001', 20), line('P2026090003', 2)] },
];
export const customers = ['星海智能制造有限公司', '云杉科技服务有限公司', '海岳电子有限公司'];
export const warehouses = ['成品仓 A', '华东配送仓'];
function line(code: string, quantity: number): OrderLine { const p = products.find((item) => item.code === code)!; return { id: crypto.randomUUID(), productCode: code, productName: p.name, spec: p.spec, quantity, price: p.price, discount: 100, shipped: 0, remark: '' }; }
const storageKey = 'forge-crm:sales-prototype:v1';
const changed = 'forge-crm:sales-prototype:changed';
function initial(): SalesState { return { orders: [
  { id: 'demo-approved', no: 'SO2026100001', status: 'APPROVED', source: 'QUOTATION', sourceNo: 'Q2026090008', customer: customers[0], date: '2026-10-01', createdAt: '2026-10-01', seller: '周然', organization: '华东销售中心', region: '华东', type: '标准销售', discount: 100, taxRate: 13, remark: '演示：可创建分批销售出货', lines: [line('P2026090001', 80), line('P2026090002', 40)] },
  { id: 'demo-draft', no: 'SO2026100002', status: 'DRAFT', source: 'MANUAL', sourceNo: '', customer: customers[1], date: '2026-10-01', createdAt: '2026-10-01', seller: '周然', organization: '华东销售中心', region: '华东', type: '标准销售', discount: 95, taxRate: 13, remark: '演示：可编辑并提交审核', lines: [line('P2026090001', 12)] },
], outbounds: [] }; }
export function readSales(): SalesState { try { const saved = sessionStorage.getItem(storageKey); if (saved) return JSON.parse(saved) as SalesState; } catch { /* new browsing session */ } const state = initial(); try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* in-memory fallback unavailable */ } return state; }
export function saveSales(state: SalesState) { sessionStorage.setItem(storageKey, JSON.stringify(state)); window.dispatchEvent(new Event(changed)); }
export function listenSales(callback: () => void) { window.addEventListener(changed, callback); return () => window.removeEventListener(changed, callback); }
export const lineAmount = (line: OrderLine) => Math.round(line.quantity * line.price * line.discount) / 100;
export const orderAmount = (order: SalesOrder) => order.lines.reduce((sum, item) => sum + lineAmount(item), 0);
export const afterHeaderDiscount = (order: SalesOrder) => Math.round(orderAmount(order) * order.discount) / 100;
export const money = (value: number) => value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function shippedQuantity(state: SalesState, orderId: string, lineId: string) { return state.outbounds.filter((out) => out.orderId === orderId && out.status === 'APPROVED').flatMap((out) => out.lines).filter((line) => line.orderLineId === lineId).reduce((sum, line) => sum + line.quantity, 0); }
export function remainingQuantity(state: SalesState, order: SalesOrder, line: OrderLine) { return Math.max(0, line.quantity - shippedQuantity(state, order.id, line.id)); }
export function validateOutbound(state: SalesState, order: SalesOrder, outbound: SalesOutbound): string {
  if (!outbound.warehouse || !outbound.shipper) return '请选择仓库并填写出货人';
  const byOrderLine = new Map<string, number>();
  const byBatch = new Map<string, number>();
  for (const line of outbound.lines) {
    const orderLine = order.lines.find((item) => item.id === line.orderLineId);
    if (!orderLine || line.productCode !== orderLine.productCode || !Number.isFinite(line.quantity) || line.quantity <= 0) return '出货行的产品或数量无效';
    byOrderLine.set(line.orderLineId, (byOrderLine.get(line.orderLineId) ?? 0) + line.quantity);
    const product = products.find((item) => item.code === line.productCode);
    if (product?.batches.length) {
      if (!line.batch || !product.batches.some((batch) => batch.no === line.batch && batch.warehouse === outbound.warehouse)) return '请选择出货仓库中可用的批次';
      const key = `${line.productCode}:${line.batch}`;
      byBatch.set(key, (byBatch.get(key) ?? 0) + line.quantity);
    } else if (line.batch) return '非批次物项不能填写批次';
  }
  for (const [lineId, qty] of byOrderLine) { const line = order.lines.find((item) => item.id === lineId)!; if (qty > remainingQuantity(state, order, line)) return '本次出货数量合计不能超过订单剩余数量'; }
  for (const [key, qty] of byBatch) { const [code, batch] = key.split(':'); if (qty > availableBatch(state, code, batch, outbound.warehouse)) return '同一批次合计不得超过可用库存'; }
  return '';
}
export function fulfillment(state: SalesState, order: SalesOrder) { const all = order.lines.reduce((sum, line) => sum + line.quantity, 0); const sent = order.lines.reduce((sum, line) => sum + shippedQuantity(state, order.id, line.id), 0); return sent <= 0 ? '未出货' : sent >= all ? '全部出货' : '部分出货'; }
export function availableBatch(state: SalesState, code: string, batch: string, warehouse?: string) { const matching = products.find((p) => p.code === code)?.batches.find((b) => b.no === batch && (!warehouse || b.warehouse === warehouse)); const base = matching?.stock ?? 0; const used = state.outbounds.filter((out) => out.status === 'APPROVED' && (!warehouse || out.warehouse === warehouse)).flatMap((out) => out.lines).filter((line) => line.productCode === code && line.batch === batch).reduce((sum, line) => sum + line.quantity, 0); return Math.max(0, base - used); }
export function nextNo(prefix: string, numbers: string[]) { const sequence = Math.max(0, ...numbers.filter((value) => value.startsWith(`${prefix}202610`)).map((value) => Number(value.slice(-4)) || 0)); return `${prefix}202610${String(sequence + 1).padStart(4, '0')}`; }
