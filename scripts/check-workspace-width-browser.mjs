/** Read-only local demo regression: shell columns must fit; tables may scroll locally. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const base = new URL(process.env.QA_BASE_URL || 'http://localhost:5173');
if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Local demo URL required');
if (!process.env.INITIAL_ADMIN_PASSWORD) throw new Error('Local demo password is not configured');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-width-'));
const page = await browser.newPage(); page.setDefaultTimeout(15000);
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()); });
const measure = () => page.evaluate(() => ['.showcase-main', '.showcase-topbar', '.showcase-content'].map(selector => {
  const node = document.querySelector(selector), box = node.getBoundingClientRect();
  return { selector, left: box.left, right: box.right, width: box.width, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth };
}));
try {
  await page.goto(`${base.origin}/#/showcase/system/menus`);
  await page.getByLabel('账号', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录并进入' }).click();
  await page.locator('.tree-workspace:visible').waitFor();
  errors.length = 0; // An unauthenticated session probe before login may return 401.
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  for (const route of ['system/menus', 'system/organization', 'inventory-balances', 'inventory-transactions']) {
    await page.goto(`${base.origin}/#/showcase/${route}`);
    const tree = page.locator('.tree-workspace:visible');
    if (route.startsWith('system/')) { await tree.getByRole('treeitem').first().click(); await tree.locator('.resource-info-grid').waitFor(); }
    else await page.locator('.inventory-stock-page:visible .ag-root').first().waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const boxes = await measure();
      for (const box of boxes) {
        assert(box.right <= width + 1, `${route}: ${box.selector} extends past viewport`);
        assert(box.scrollWidth <= box.clientWidth + 1, `${route}: ${box.selector} has overflow`);
      }
      let counterexample;
      if (route === 'system/menus' && width === 390) {
        // Prove the assertion distinguishes the old implicit column behavior.
        const oldRule = await page.addStyleTag({ content: '.showcase-main{grid-template-columns:auto}' });
        counterexample = await measure(); await oldRule.evaluate(node => node.remove());
        assert(counterexample.some(box => box.right > width + 1 || box.scrollWidth > box.clientWidth + 1));
      }
      if (route.startsWith('system/')) {
        const trigger = tree.locator('.tree-node-menu-trigger').first(); await trigger.click();
        const menu = page.getByRole('menu'); await menu.waitFor();
        const box = await menu.boundingBox(); assert(box.x >= 0 && box.x + box.width <= width + 1);
        await page.keyboard.press('Escape'); assert.equal(await menu.count(), 0);
      }
      assert.equal(await page.locator('vite-error-overlay').count(), 0);
      const screenshot = `${route.replaceAll('/', '-')}-${width}.png`;
      await page.screenshot({ path: path.join(output, screenshot) });
      results.push({ route, width, boxes, counterexample, screenshot });
    }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ createdAt: new Date().toISOString(), browser: await browser.version(), results, errors }, null, 2));
  console.log(`PASS workspace width: ${results.length} cases; ${output}`);
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ message: error.message, results, errors }, null, 2));
  console.error(`FAIL: ${output}`); throw error;
} finally { await browser.close(); }
