import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });

const base = `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
const origin = 'http://127.0.0.1:5173';
let cookies = '';
let csrf = '';

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(base + path, { ...init, headers: { origin, cookie: cookies, ...(init.body ? { 'content-type': 'application/json' } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}), ...(init.headers ?? {}) } });
  const next = response.headers.getSetCookie();
  if (next.length) {
    const map = new Map(cookies.split('; ').filter(Boolean).map((part) => part.split(/=(.*)/s).slice(0, 2) as [string, string]));
    for (const raw of next) { const [pair] = raw.split(';'); const [key, value] = pair.split(/=(.*)/s).slice(0, 2); map.set(key, value); }
    cookies = [...map].map(([key, value]) => `${key}=${value}`).join('; ');
    csrf = map.get('ipl_csrf') ?? csrf;
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  await request('/api/health/live');
  await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD }) });
  const navigation = await request('/api/systems/demo-portal/navigation') as { items: Array<{ menuCode: string; children: Array<{ menuCode: string }> }> };
  const entities = await request('/api/systems/demo-portal/legal-entities?page=1&pageSize=20') as { items: Array<{ id: string }> };
  const warehouses = await request('/api/systems/demo-portal/warehouses?page=1&pageSize=20&status=ACTIVE') as { items: Array<{ id: string; legalEntityId: string }> };
  const items = await request('/api/systems/demo-portal/items?page=1&pageSize=20&status=ACTIVE') as { items: Array<{ itemCode: string; batchManaged: boolean }> };
  const entity = entities.items[0]; const warehouse = warehouses.items.find((row) => row.legalEntityId === entity?.id); const item = items.items[0];
  if (!entity || !warehouse || !item) throw new Error('缺少验证所需主数据');
  const before = await request(`/api/systems/demo-portal/inventory-balances?page=1&pageSize=200&legalEntityId=${entity.id}&warehouseId=${warehouse.id}`) as { items: Array<{ itemCode: string; quantity: string }> };
  const created = await request('/api/systems/demo-portal/inbound-orders', { method: 'POST', body: JSON.stringify({ legalEntityId: entity.id, warehouseId: warehouse.id, documentDate: new Date().toISOString().slice(0, 10), inboundType: 'FINISHED_GOODS', reasonCode: 'FINISHED_GOODS', factoryCode: null, currencyCode: 'CNY', remark: '自动验证单，完成后冲销', version: 0, lines: [{ lineNo: 10, itemCode: item.itemCode, batchNo: item.batchManaged ? 'AUTO-VERIFY' : null, originalQty: null, actualQty: '1.0000', amount: '1.00', remark: '自动验证' }] }) }) as { id: string; version: number; orderNo: string };
  const posted = await request(`/api/systems/demo-portal/inbound-orders/${created.id}/post`, { method: 'POST', body: JSON.stringify({ version: created.version, requestKey: crypto.randomUUID(), note: '' }) }) as { version: number; status: string };
  const afterPost = await request(`/api/systems/demo-portal/inventory-balances?page=1&pageSize=200&legalEntityId=${entity.id}&warehouseId=${warehouse.id}`) as { items: Array<{ itemCode: string; quantity: string }> };
  const reversed = await request(`/api/systems/demo-portal/inbound-orders/${created.id}/reverse`, { method: 'POST', body: JSON.stringify({ version: posted.version, requestKey: crypto.randomUUID(), note: '自动验证完成' }) }) as { status: string };
  const afterReverse = await request(`/api/systems/demo-portal/inventory-balances?page=1&pageSize=200&legalEntityId=${entity.id}&warehouseId=${warehouse.id}`) as { items: Array<{ itemCode: string; quantity: string }> };
  const quantity = (rows: typeof before.items) => rows.find((row) => row.itemCode === item.itemCode)?.quantity ?? '0.0000';
  if (Number(quantity(afterPost.items)) !== Number(quantity(before.items)) + 1) throw new Error('过账后库存未增加');
  if (Number(quantity(afterReverse.items)) !== Number(quantity(before.items))) throw new Error('冲销后库存未恢复');
  const menuCodes = navigation.items.flatMap((row) => [row.menuCode, ...row.children.map((child) => child.menuCode)]);
  for (const required of ['item-directory', 'inbound-order-directory', 'current-inventory-directory', 'inventory-balance-directory', 'legal-entity-admin', 'warehouse-admin']) if (!menuCodes.includes(required)) throw new Error(`数据库导航缺少 ${required}`);
  console.log(JSON.stringify({ orderNo: created.orderNo, posted: posted.status, reversed: reversed.status, before: quantity(before.items), afterPost: quantity(afterPost.items), afterReverse: quantity(afterReverse.items), databaseMenus: true }));
}

void main();
