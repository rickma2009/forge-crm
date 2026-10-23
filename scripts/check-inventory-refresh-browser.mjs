import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const base = new URL(process.env.QA_BASE_URL || 'http://localhost:5173');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('LOCAL_QA_URL_REQUIRED');
if (!process.env.INITIAL_ADMIN_PASSWORD) throw new Error('LOCAL_QA_PASSWORD_REQUIRED');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base.origin}/#/showcase/inventory-balances`);
  await page.getByLabel('账号', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录并进入', exact: true }).click();
  for (const [route, endpoint] of [['inventory-balances', 'inventory-summary'], ['inventory-transactions', 'inventory-transactions']]) {
    if (route !== 'inventory-balances') await page.goto(`${base.origin}/#/showcase/${route}`);
    const current = page.locator('.inventory-stock-page:visible'); await current.waitFor();
    await current.locator('.ag-root').first().waitFor();
    const urls = [];
    for (const label of ['查询', '查询', '重置']) {
      const [request] = await Promise.all([
        page.waitForRequest(result => result.method() === 'GET' && new URL(result.url()).pathname === `/api/systems/demo-portal/${endpoint}`),
        current.getByRole('button', { name: label, exact: true }).click(),
      ]);
      const response = await request.response(); assert(response);
      assert.equal(response.status(), 200);
      const body = await response.json(); assert(Array.isArray(body.items));
      urls.push(response.url());
    }
    assert(urls.every(url => url === urls[0]));
    console.log(`PASS ${route}: two unchanged queries and reset each returned fresh HTTP 200 with identical parameters`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
