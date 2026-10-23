import type { SalesCommand, SalesOrderWrite, SalesOutboundWrite } from '@forge-crm/contracts';
import { call, write } from '../gateway';

export type Page<T> = { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
export type OrderLine = { id: string; lineNo: number; sortNo: number; sourceLineId: string | null; itemId: string; itemCode: string; itemName: string; baseUnit: string; quantity: string; unitPrice: string; amount: string; discount: string; discountedAmount: string; finalAmount: string; taxRate: string; taxAmount: string; shippedQty: string; lineStatus: string; remark: string };
export type Order = { id: string; orderNo: string; orderDate: string; sourceType: 'MANUAL' | 'OPPORTUNITY' | 'QUOTATION'; sourceId: string | null; sourceNo: string | null; customerId: string; customerCode: string; customerName: string; salespersonId: string; salespersonName: string; organizationId: string | null; organizationName: string; region: string; orderType: 'NORMAL' | 'SAMPLE' | 'REPLACEMENT'; discount: string; amount: string; netAmount: string; taxAmount: string; status: string; fulfillmentStatus: string; remark: string; version: number; creatorId: string; submittedBy: string | null; createdAt: string; lines: OrderLine[] };
export type OutboundLine = { id: string; lineNo: number; orderLineId: string; itemId: string; itemCode: string; itemName: string; baseUnit: string; batchNo: string; quantity: string; salesAmount: string; costAmount: string; remark: string };
export type Outbound = { id: string; outboundNo: string; orderId: string; orderNo: string; customerName: string; documentDate: string; legalEntityId: string; warehouseId: string; warehouseName: string; shipperId: string; shipperName: string; salesAmount: string; costAmount: string; status: string; remark: string; version: number; creatorId: string; submittedBy: string | null; createdAt: string; lines: OutboundLine[] };
export type CustomerCandidate = { id: string; customerCode: string; customerName: string; shortName: string };
export type SourceLine = { id: string; productId: string; quantity: string; unitPrice: string; discount?: string };
export type SourceCandidate = { id: string; opportunityCode?: string; opportunityName?: string; quoteCode?: string; title?: string; customerId: string; customerName: string; ownerUserId?: string; products?: SourceLine[]; lines?: SourceLine[] };
export type ItemOption = { id: string; itemCode: string; itemName: string; itemType: string; batchManaged: boolean; baseUnit: string; status: string };
export type WarehouseOption = { id: string; legalEntityId: string; warehouseCode: string; warehouseName: string };
export type Balance = { id: string; warehouseId: string; itemCode: string; batchNo: string | null; quantity: string; amount: string };
const base = (systemCode: string) => `/api/systems/${encodeURIComponent(systemCode)}`;
const get = async <T>(url: string): Promise<T> => await (await call(url)).json() as T;
const send = async <T>(url: string, body: unknown, method = 'POST'): Promise<T> => await (await write(url, body, method)).json() as T;
export const salesApi = {
  orders: (code: string, query: URLSearchParams) => get<Page<Order>>(`${base(code)}/sales-orders?${query}`),
  order: (code: string, id: string) => get<Order>(`${base(code)}/sales-orders/${encodeURIComponent(id)}`),
  sources: (code: string, kind: Order['sourceType'], keyword: string) => get<Array<CustomerCandidate | SourceCandidate>>(`${base(code)}/sales-orders/sources/${kind}?keyword=${encodeURIComponent(keyword)}`),
  createOrder: (code: string, input: SalesOrderWrite) => send<Order>(`${base(code)}/sales-orders`, input),
  updateOrder: (code: string, id: string, input: SalesOrderWrite) => send<Order>(`${base(code)}/sales-orders/${id}`, input, 'PATCH'),
  orderCommand: (code: string, id: string, action: string, input: SalesCommand) => send<Order>(`${base(code)}/sales-orders/${id}/${action}`, input),
  outbounds: (code: string, query: URLSearchParams) => get<Page<Outbound>>(`${base(code)}/sales-outbounds?${query}`),
  outbound: (code: string, id: string) => get<Outbound>(`${base(code)}/sales-outbounds/${encodeURIComponent(id)}`),
  createOutbound: (code: string, input: SalesOutboundWrite) => send<Outbound>(`${base(code)}/sales-outbounds`, input),
  updateOutbound: (code: string, id: string, input: SalesOutboundWrite) => send<Outbound>(`${base(code)}/sales-outbounds/${id}`, input, 'PATCH'),
  outboundCommand: (code: string, id: string, action: string, input: SalesCommand) => send<Outbound>(`${base(code)}/sales-outbounds/${id}/${action}`, input),
  items: (code: string) => get<Page<ItemOption>>(`${base(code)}/items?status=ACTIVE&pageSize=200`),
  warehouses: (code: string) => get<Page<WarehouseOption>>(`${base(code)}/warehouses?pageSize=200&status=ACTIVE`),
  balances: (code: string, warehouseId: string, itemCode: string) => get<Page<Balance>>(`${base(code)}/inventory-balances?warehouseId=${warehouseId}&keyword=${encodeURIComponent(itemCode)}&pageSize=200`),
};
