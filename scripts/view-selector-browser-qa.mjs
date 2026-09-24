/** Read-only checks of shared detail layout; no business writes. */
import { URL } from 'node:url';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const { chromium } = await import('/Users/malanjun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const base = 'http://localhost:5173', out = '/tmp/view-selector-qa';
await mkdir(out, { recursive: true });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const measurements = [];
try {
  await page.goto(base + '/#/showcase/customers');
  await page.getByLabel('账号', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录并进入' }).click();
  await page.getByRole('button', { name: '登录并进入' }).waitFor({ state: 'hidden' });
  for (const resource of ['customers', 'opportunities', 'quotations']) {
    await page.goto(`${base}/#/showcase/${resource}`);
    const group = page.locator('.list-view-selector:visible');
    await group.waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('.showcase-shell').evaluate(async (el) => { el.getBoundingClientRect(); await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {}))); });
      const boxes = await group.locator(':scope > *').evaluateAll((nodes) => nodes.map((el) => { const r = el.getBoundingClientRect(); return { y: r.y, height: r.height }; }));
      assert.equal(boxes.length, 3); assert.ok(boxes.every((box) => box.y === boxes[0].y && box.height === 32), JSON.stringify({ resource, width, boxes }));
      measurements.push({ resource, width, boxes });
      await page.screenshot({ path: `${out}/${resource}-${width}.png`, fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ result: 'PASS', writes: 'none', measurements, errors }, null, 2));
  console.log('PASS shared view selector: 3 pages, desktop/mobile, equal y and 32px height');
} catch (error) { await page.screenshot({path: `${out}/failure.png`, fullPage: true}); console.error(page.url(), (await page.locator('body').innerText()).slice(-1600)); throw error; } finally { await browser.close(); }
