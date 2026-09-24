import { config } from 'dotenv';
import { resolve } from 'node:path';
import { businessListObjects, opportunityDetailSchema, resolvedListViewsSchema, type BusinessListObject } from '@interaction-pattern-lab/contracts';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const origin = 'http://localhost:5173';
const systemCode = 'demo-portal';
const cookies = new Map<string, string>();
async function request(path: string, method = 'GET', body?: unknown, allow401 = false) {
  const response = await fetch(origin + path, { method, headers: { origin, cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '), 'content-type': 'application/json', 'x-csrf-token': cookies.get('ipl_csrf') ?? '' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0], split = pair.indexOf('='); if (split > 0) cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
  if (!response.ok && !(allow401 && response.status === 401)) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return response;
}
async function main() {
  if (!process.env.INITIAL_ADMIN_PASSWORD) throw new Error('Local admin password is not configured');
  await request('/api/auth/session', 'GET', undefined, true);
  await request('/api/auth/login', 'POST', { account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD });
  const evidence: object[] = [];
  try {
    for (const object of ['customer-directory', ...Object.keys(businessListObjects)]) {
      const path = `/api/systems/${systemCode}/list-views/${object}/view`;
      const result = resolvedListViewsSchema.parse(await (await request(path)).json());
      if (!result.views.some((view) => view.viewKey === result.selectedViewKey)) throw new Error('Unresolved selected view');
      evidence.push({ object, views: result.views.length, selectedAccessible: true });
      if (object === 'customer-directory') continue;
      const base = result.views.find((view) => view.scope === 'SYSTEM' && view.allowPersonalOverride)!;
      if (!base) throw new Error('Missing configurable baseline');
      const next = { ...base.config, pageSize: 50, columns: base.config.columns.map((column) => ({ ...column, visible: column.key === businessListObjects[object as BusinessListObject].identity })) };
      const created = await (await request(path + '/personal', 'POST', { baseViewId: base.id, viewName: `UI-AUDIT-${Date.now()}`, isDefault: false, config: next })).json() as { id: string };
      try {
        await request(path + '/selection', 'POST', { viewKey: `user:${created.id}` });
        const restored = resolvedListViewsSchema.parse(await (await request(path)).json());
        if (restored.selectedViewKey !== `user:${created.id}` || restored.views.find((view) => view.id === created.id)?.config.pageSize !== 50) throw new Error('Personal reference was not restored');
        evidence.push({ object, personalPersistedAndRestored: true });
      } finally {
        await request(path + '/selection', 'POST', { viewKey: result.selectedViewKey });
        await request(path + '/personal/' + created.id, 'DELETE');
      }
    }
    const list = await (await request(`/api/systems/${systemCode}/opportunities?page=1&pageSize=20`)).json() as { items: Array<{ id: string }> };
    for (const item of list.items) opportunityDetailSchema.parse(await (await request(`/api/systems/${systemCode}/opportunities/${item.id}`)).json());
    evidence.push({ opportunityDetailsValidated: list.items.length, testPersonalViewsRemoved: true, originalSelectionsRestored: true });
    console.log(JSON.stringify(evidence, null, 2));
  } finally { await request('/api/auth/logout', 'POST'); }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Verification failed'); process.exitCode = 1; });
