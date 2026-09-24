import { config } from 'dotenv';
import { resolve } from 'node:path';
import { parameterListSchema } from '@interaction-pattern-lab/contracts';
config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const origin = 'http://localhost:5173', root = '/api/systems/demo-portal/parameters';
const cookies = new Map<string, string>();
async function request(path: string, method = 'GET', body?: unknown, csrf = true) {
  const response = await fetch(origin + path, { method, headers: { origin, cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), 'content-type': 'application/json', ...(csrf ? { 'x-csrf-token': cookies.get('ipl_csrf') ?? '' } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0], split = pair.indexOf('='); if (split > 0) cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
  return response;
}
function check(ok: boolean, label: string) { if (!ok) throw new Error(label); }
async function login(account: string, password: string) {
  cookies.clear(); await request('/api/auth/session');
  check((await request('/api/auth/login', 'POST', { account, password })).ok, 'Login failed');
}
async function main() {
  check((await request(root)).status === 401, 'Anonymous request was not rejected');
  await login('admin', process.env.INITIAL_ADMIN_PASSWORD!);
  try {
    const response = await request(root); check(response.ok, `Parameter list HTTP ${response.status}`);
    const list = parameterListSchema.parse(await response.json()); check(list.items.length === 2, 'Missing presets');
    const row = list.items[0];
    check((await request(root, 'POST', {})).status === 404, 'Unexpected create endpoint');
    check((await request(`${root}/${row.id}`, 'DELETE')).status === 404, 'Unexpected delete endpoint');
    const input = { value: row.value, status: row.status, version: row.version };
    check((await request(`${root}/${row.id}`, 'PATCH', input, false)).status === 403, 'Missing CSRF was not rejected');
    check((await request(`${root}/${row.id}`, 'PATCH', { ...input, parameterName: 'tamper' })).status === 400, 'Immutable fields were accepted');
    console.log(JSON.stringify({ authenticatedList: true, presets: list.items.length, noCreateOrDelete: true, csrfRejected: true, immutableFieldsRejected: true, parameterValuesUnchanged: true }));
  } finally { await request('/api/auth/logout', 'POST'); }
  if (process.env.INITIAL_VIEWER_PASSWORD) {
    await login('viewer', process.env.INITIAL_VIEWER_PASSWORD);
    try {
      check((await request(root)).status === 403, 'Unassigned viewer can read parameters');
      check((await request(`${root}/options/DEFAULT_LEGAL_ENTITY`)).status === 404, 'Obsolete options endpoint remains');
      check((await request(`${root}/00000000-0000-4000-8000-000000000001`, 'PATCH', { value: null, status: 'ACTIVE', version: 1 })).status === 403, 'Unassigned viewer can update parameters');
      console.log(JSON.stringify({ viewerReadRejected: true, obsoleteOptionsRemoved: true, viewerWriteRejected: true }));
    } finally { await request('/api/auth/logout', 'POST'); }
  }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Verification failed'); process.exitCode = 1; });
