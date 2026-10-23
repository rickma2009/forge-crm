/** Refresh every real-page preview used by the interaction template library. Read-only. */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';
import { chromium } from '/Users/malanjun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const require = createRequire(resolve('packages/server/package.json'));
require('dotenv').config({ path: '.env', quiet: true });
if (!process.env.INITIAL_ADMIN_PASSWORD) throw new Error('INITIAL_ADMIN_PASSWORD is required');

const base = process.env.PREVIEW_BASE_URL ?? 'http://localhost:5173';
const system = 'demo-portal';
const output = resolve('packages/web/public/template-previews');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const captured = [];
const failed = [];

const sleep = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));
async function open(path) {
  await page.goto(`${base}/#${path}`, { waitUntil: 'domcontentloaded' });
  await sleep(250);
}
async function api(path) {
  const response = await page.request.get(`${base}/api/systems/${system}/${path}`);
  if (!response.ok()) throw new Error(`${path}: HTTP ${response.status()}`);
  return response.json();
}
async function capture(name, locator, options = {}) {
  await locator.waitFor({ state: 'visible', timeout: 45000 });
  await sleep(250);
  await locator.screenshot({ path: resolve(output, name), animations: 'disabled', timeout: 45000, ...options });
  captured.push(name);
  console.log(`CAPTURED ${name}`);
}
async function duplicate(source, names) {
  for (const name of names) {
    await copyFile(resolve(output, source), resolve(output, name));
    captured.push(name);
    console.log(`CAPTURED ${name} (same page state as ${source})`);
  }
}
async function task(label, run) {
  try { await run(); }
  catch (error) {
    failed.push({ label, reason: error instanceof Error ? error.message : String(error) });
    console.error(`FAILED ${label}:`, error);
  }
}

try {
  await open('/showcase/workbench');
  const account = page.getByLabel('账号', { exact: true });
  await account.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  if (await account.isVisible().catch(() => false)) {
    await account.fill('admin');
    await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
    await page.getByRole('button', { name: '登录并进入' }).click();
    await page.getByRole('button', { name: '登录并进入' }).waitFor({ state: 'hidden', timeout: 30000 });
  }

  const [customers, inboundOrders, quotations, opportunities, boms] = await Promise.all([
    api('customers?page=1&pageSize=20'), api('inbound-orders?page=1&pageSize=20'),
    api('quotations?page=1&pageSize=100'), api('opportunities?page=1&pageSize=100'), api('boms?page=1&pageSize=100'),
  ]);
  const customer = customers.items?.[0];
  const inbound = inboundOrders.items?.[0];
  const draftQuote = quotations.items?.find((item) => item.status === 'DRAFT');
  const bom = boms.items?.find((item) => Number(item.lineCount ?? 0) > 0) ?? boms.items?.[0];
  const opportunity = opportunities.items?.[0];
  let opportunityWithTask = null;
  for (const candidate of opportunities.items ?? []) {
    try {
      const history = await api(`opportunities/${candidate.id}/agent-tasks?page=1`);
      if (history.total > 0 || history.items?.length) { opportunityWithTask = candidate; break; }
    } catch { /* Optional history lookup. */ }
  }

  await task('employee list', async () => {
    await open('/showcase/system/employees');
    await capture('TPL-01-01-employees.png', page.locator('.enterprise-page.customer-directory').first());
  });
  await task('customer list', async () => {
    await open('/showcase/customers');
    await capture('TPL-01-02-customers.png', page.locator('.enterprise-page.customer-directory').first());
  });
  await task('BOM list', async () => {
    await open('/showcase/boms');
    await capture('CMP-04-business-directory.png', page.locator('.business-directory').first());
  });
  await task('item tree workspace and route menu', async () => {
    await open('/showcase/items');
    const workspace = page.locator('.tree-workspace').first();
    await workspace.locator('.tw-row').first().waitFor({ state: 'visible', timeout: 45000 });
    await capture('TPL-02-01-items.png', workspace);
    await duplicate('TPL-02-01-items.png', ['CMP-07-tree-workspace.png']);
    const tab = page.locator('.common-route-tab').last();
    await tab.click({ button: 'right' });
    const menu = page.getByRole('menu');
    await menu.waitFor({ state: 'visible' });
    const tabBox = await page.locator('.common-route-tabs').boundingBox();
    const menuBox = await menu.boundingBox();
    if (!tabBox || !menuBox) throw new Error('Route tab/menu bounds unavailable');
    const x = Math.max(0, Math.min(tabBox.x, menuBox.x) - 16);
    const y = Math.max(0, Math.min(tabBox.y, menuBox.y) - 16);
    const right = Math.min(1440, Math.max(tabBox.x + tabBox.width, menuBox.x + menuBox.width) + 16);
    const bottom = Math.min(1000, Math.max(tabBox.y + tabBox.height, menuBox.y + menuBox.height) + 16);
    await page.screenshot({ path: resolve(output, 'TPL-05-01-items.png'), clip: { x, y, width: right - x, height: bottom - y }, animations: 'disabled' });
    captured.push('TPL-05-01-items.png');
    await duplicate('TPL-05-01-items.png', ['CMP-08-route-tabs.png']);
    await page.keyboard.press('Escape');
  });
  await task('role workspace and member chooser', async () => {
    await open('/showcase/system/roles');
    const workspace = page.locator('.enterprise-page.business-role-workspace').first();
    await workspace.locator('.tw-row').first().click();
    await page.getByRole('button', { name: /添加管理对象/ }).waitFor({ state: 'visible', timeout: 45000 });
    await capture('TPL-02-02-roles.png', workspace);
    await page.getByRole('button', { name: /添加管理对象/ }).click();
    await capture('TPL-06-03-roles.png', page.getByRole('dialog', { name: '添加管理对象' }));
    await page.keyboard.press('Escape');
  });
  await task('resource menu workspace and editor', async () => {
    await open('/showcase/system/menus');
    const workspace = page.locator('.tree-workspace').first();
    await workspace.locator('.tw-row').first().waitFor({ state: 'visible', timeout: 45000 });
    await workspace.locator('.tw-row').first().click();
    await capture('TPL-02-03-menus.png', workspace);
    await page.getByRole('button', { name: '新建资源' }).click();
    await capture('TPL-05-05-menus.png', page.getByRole('dialog', { name: '新建页面资源' }));
    await page.keyboard.press('Escape');
  });
  await task('customer detail and activity timeline', async () => {
    if (!customer) throw new Error('No customer sample');
    await open(`/showcase/customers/${customer.id}`);
    const detail = page.locator('.detail-workspace.customer-detail-page').first();
    await capture('TPL-03-01-customers.png', detail);
    await duplicate('TPL-03-01-customers.png', ['TPL-05-02-customers.png', 'CMP-09-detail-workspace.png']);
    await page.getByRole('tab', { name: '活动时间轴' }).click();
    await page.locator('.activity-panel').waitFor({ state: 'visible', timeout: 45000 });
    await capture('TPL-07-04-customers.png', detail);
  });
  await task('inbound document detail', async () => {
    if (!inbound) throw new Error('No inbound order sample');
    await open(`/showcase/inbound-orders/${inbound.id}`);
    await capture('TPL-03-03-inbound.png', page.locator('.document-workspace').first());
    await duplicate('TPL-03-03-inbound.png', ['CMP-10-document-workspace.png']);
  });
  await task('quotation product picker', async () => {
    if (!draftQuote) throw new Error('No draft quotation sample');
    await open(`/showcase/quotations/${draftQuote.id}`);
    const add = page.getByRole('button', { name: /添加行/ });
    await add.waitFor({ state: 'visible', timeout: 45000 });
    await add.click();
    await capture('TPL-04-02-quotations.png', page.getByRole('dialog', { name: '选择产品' }));
    await duplicate('TPL-04-02-quotations.png', ['CMP-12-product-picker.png']);
    await page.keyboard.press('Escape');
  });
  await task('quotation create entry', async () => {
    await open('/showcase/quotations');
    await page.getByRole('button', { name: '新增报价单' }).click();
    await capture('TPL-04-06-quotations.png', page.getByRole('dialog', { name: '新增报价单' }));
    await page.keyboard.press('Escape');
  });
  await task('workbench', async () => {
    await open('/showcase/workbench');
    await capture('my-workbench.png', page.locator('.my-workbench').first());
  });
  await task('opportunity analytics', async () => {
    await open('/showcase/opportunity-analysis');
    await capture('opportunity-analysis-funnel.png', page.locator('.enterprise-page.opportunity-analytics').first());
  });
  await task('opportunity kanban', async () => {
    await open('/showcase/opportunities');
    const board = page.locator('.kanban-board');
    const kanbanButton = page.getByRole('button', { name: '看板', exact: true });
    const wasKanban = await kanbanButton.getAttribute('aria-pressed') === 'true';
    if (!wasKanban) { await kanbanButton.click(); await board.waitFor({ state: 'visible', timeout: 45000 }); }
    await capture('TPL-07-05-opportunities.png', page.locator('.business-directory').first());
    if (!wasKanban) { await page.getByRole('button', { name: '表格', exact: true }).click(); await board.waitFor({ state: 'hidden', timeout: 45000 }); }
  });
  await task('personal agent workspace', async () => {
    await open('/showcase/agent');
    await capture('TPL-08-01-agent.png', page.locator('.personal-agent-page').first());
  });
  await task('opportunity agent drawer', async () => {
    const candidate = opportunityWithTask ?? opportunity;
    if (!candidate) throw new Error('No opportunity sample');
    await open(`/showcase/opportunities/${candidate.id}`);
    await page.getByRole('button', { name: 'Agent小助手' }).click();
    const drawer = page.getByRole('dialog', { name: 'Agent小助手' });
    await capture('TPL-08-04-opportunity-agent.png', drawer);
    await duplicate('TPL-08-04-opportunity-agent.png', ['CMP-15-agent-assistant.png']);
    await capture('TPL-08-05-agent.png', drawer);
    await page.keyboard.press('Escape');
  });
  await task('BOM line drawer', async () => {
    if (!bom) throw new Error('No BOM sample');
    await open(`/showcase/boms/${bom.id}`);
    const line = page.locator('.bom-tree-cell').first();
    await line.waitFor({ state: 'visible', timeout: 45000 });
    await line.click();
    await capture('CMP-11-drawer-workspace.png', page.locator('.drawer-workspace').first());
  });

  console.log(JSON.stringify({ captured: captured.length, names: captured, failed }, null, 2));
  if (failed.length) process.exitCode = 1;
} finally {
  await browser.close();
}
