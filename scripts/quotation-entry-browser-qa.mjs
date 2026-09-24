/** Read-only source data; all quotation writes and the source conflict are mocked. */
import { URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || '/Users/malanjun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const url = 'http://localhost:5173', output = '/tmp/quotation-entry-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(`${url}/#/showcase/opportunities`);
  await page.getByLabel('账号', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录并进入' }).click();
  await page.getByRole('button', { name: /新增商机/ }).waitFor();
  const list = await (await page.request.get(`${url}/api/systems/demo-portal/opportunities?status=ACTIVE&pageSize=100`)).json();
  assert.ok(list.items.length, 'Requires an existing active opportunity for read-only UI QA');
  const id = list.items[0].id;
  const source = await (await page.request.get(`${url}/api/systems/demo-portal/opportunities/${id}`)).json();
  const original = source.opportunity;
  let changed = false, attempts = 0;
  const quoteId = '00000000-0000-4000-8000-000000000098';
  const quote = { id: quoteId, quoteCode: 'Q2026092400000098', title: '入口验收报价', customerId: original.customerId, customerName: original.customerName, opportunityId: id, opportunity: { id, opportunityName: original.opportunityName, version: original.version + 1, expectedAmount: null, amountSource: '人工维护' }, contactId: null, contactName: null, quoteDate: '2026-09-24', validUntil: '2026-10-24', total: '0.00', terms: '', remark: '', lines: [], status: 'DRAFT', version: 1, ownerUserId: original.ownerUserId, ownerName: original.ownerName, creatorName: '测试用户', createdAt: '2026-09-24T02:00:00.000Z', sourceQuoteId: null };
  await page.route(`**/api/systems/demo-portal/opportunities/${id}`, (route) => route.fulfill({ json: { ...source, opportunity: { ...original, version: original.version + (changed ? 1 : 0), opportunityName: original.opportunityName + (changed ? '（已更新）' : '') } } }));
  await page.route('**/api/systems/demo-portal/quotations**', (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      attempts++; const input = request.postDataJSON();
      assert.equal(input.mode, 'OPPORTUNITY'); assert.equal(input.opportunityId, id);
      assert.equal(input.opportunityVersion, original.version + (changed ? 1 : 0));
      if (!changed) { changed = true; return route.fulfill({ status: 409, json: { code: 'BAD_REQUEST', message: '商机信息已更新，请重新核对后创建', requestId: '00000000-0000-4000-8000-000000000097' } }); }
      return route.fulfill({ status: 201, json: quote });
    }
    if (request.url().endsWith(quoteId)) return route.fulfill({ json: quote });
    return route.fulfill({ json: { items: [quote], pagination: { total: 1, totalPages: 1 } } });
  });
  await page.goto(`${url}/#/showcase/opportunities/${id}`);
  assert.equal(await page.getByRole('tab', { name: '报价单', exact: true }).count(), 0);
  await page.getByRole('button', { name: '报价单详情', exact: true }).click();
  await page.getByRole('heading', { name: quote.quoteCode }).waitFor();
  await page.goto(`${url}/#/showcase/opportunities/${id}`);
  await page.getByRole('button', { name: '新增报价单', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '新增报价单' });
  await dialog.getByRole('button', { name: '确定', exact: true }).waitFor();
  await dialog.locator('button[type="submit"]:enabled').waitFor();
  assert.equal(await dialog.getByRole('radio', { name: '关联商机报价' }).isDisabled(), true);
  assert.equal(await dialog.getByLabel('关联商机', { exact: true }).getAttribute('readonly'), '');
  assert.equal(await dialog.getByLabel('客户名称').inputValue(), original.customerName);
  await page.screenshot({ path: `${output}/locked-dialog.png`, fullPage: true });
  await dialog.getByRole('button', { name: '确定', exact: true }).click();
  await dialog.getByRole('alert').filter({ hasText: '请重新核对后再次确定' }).waitFor();
  assert.equal(attempts, 1); assert.ok((await dialog.getByLabel('关联商机', { exact: true }).inputValue()).includes('已更新'));
  await page.screenshot({ path: `${output}/source-changed.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await dialog.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 390);
  await page.screenshot({ path: `${output}/locked-dialog-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.getByRole('button', { name: '确定', exact: true }).click();
  await page.getByRole('heading', { name: quote.quoteCode }).waitFor();
  assert.equal(attempts, 2); assert.deepEqual(errors, []);
  await page.screenshot({ path: `${output}/quote-opened.png`, fullPage: true });
  await writeFile(`${output}/result.json`, JSON.stringify({ result: 'PASS', quotationWrites: 'mocked', sourceMutation: 'mocked', scenarios: ['top entry', 'locked context', 'customer summary', 'conflict refresh', 'explicit reconfirmation', 'mobile modal', 'open quote detail'], pageErrors: errors }, null, 2));
  console.log(`PASS opportunity quotation UI QA: ${output}`);
} catch (error) { await page.screenshot({ path: `${output}/failure.png`, fullPage: true }); console.error(await page.locator('[role=dialog]').allTextContents()); throw error; } finally { await browser.close(); }
