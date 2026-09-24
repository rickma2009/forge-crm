import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { contactProjectRoleSeed as seed } from '../src/dictionary/contact-project-role.seed';

// Local, additive initialization via the owning module's authenticated API.
// Never run the full demo seed to initialize a single dictionary in an existing database.
loadEnv({ path: resolve(__dirname, '../../../.env'), quiet: true });
const origin = 'http://localhost:5173';
const systemCode = 'demo-portal';
const cookies = new Map<string, string>();
async function request(path: string, method = 'GET', body?: unknown, allowUnauthorized = false): Promise<Response> {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: { origin, cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      'content-type': 'application/json', 'x-csrf-token': cookies.get('ipl_csrf') ?? '' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0]; const index = pair.indexOf('=');
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  if (!response.ok && !(allowUnauthorized && response.status === 401)) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return response;
}

async function main() {
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password) throw new Error('缺少本地 INITIAL_ADMIN_PASSWORD；未执行初始化');
  await request('/api/auth/session', 'GET', undefined, true);
  await request('/api/auth/login', 'POST', { account: 'admin', password });
  try {
    const path = `/api/systems/${systemCode}/dictionaries`;
    type DictionaryRecord = { id: string; dictCode: string; dictName: string; status: string; itemsEditable: boolean; items: { itemValue: string; itemName: string; status: string }[] };
    const list = async (): Promise<DictionaryRecord[]> => {
      const result: unknown = await (await request(`${path}?includeDisabled=true`)).json();
      if (!Array.isArray(result)) throw new Error('字典列表响应格式错误');
      return result as DictionaryRecord[];
    };
    let dictionary = (await list()).find((item) => item.dictCode === seed.code);
    let createdDictionary = false;
    if (!dictionary) {
      const created = await (await request(path, 'POST', { dictCode: seed.code, dictName: seed.name, groupCode: seed.groupCode, description: seed.description, sortNo: seed.sortNo, itemsEditable: seed.itemsEditable })).json() as { id: string };
      dictionary = (await list()).find((item) => item.id === created.id);
      createdDictionary = true;
    }
    if (!dictionary || dictionary.status !== 'ACTIVE' || !dictionary.itemsEditable) throw new Error('字典不可维护；未覆盖已有状态或权限');
    const rows = seed.items.flatMap(([itemValue, itemName, colorKey], index) => dictionary!.items.some((item) => item.itemValue === itemValue) ? [] : [{ rowNumber: index + 2, itemValue, itemName, colorKey, sortNo: (index + 1) * 10, status: 'ACTIVE' }]);
    if (rows.length) await request(`${path}/${dictionary.id}/items/import`, 'POST', { rows });
    const result = (await list()).find((item) => item.id === dictionary!.id);
    if (!result || seed.items.some(([value]) => !result.items.some((item) => item.itemValue === value))) throw new Error('初始化回读校验失败');
    console.log(JSON.stringify({ systemCode, dictionaryCode: seed.code, createdDictionary, createdItems: rows.length, items: result.items.map(({ itemValue, itemName, status }) => ({ itemValue, itemName, status })) }, null, 2));
  } finally { await request('/api/auth/logout', 'POST'); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : '初始化失败'); process.exitCode = 1; });
