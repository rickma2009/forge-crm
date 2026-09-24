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
const base = 'http://localhost:5173', out = '/tmp/detail-workspace-qa';
await mkdir(out, { recursive: true });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const measurements = [];
try {
  await page.goto(base + '/#/showcase/customers');
  await page.getByLabel('账号', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录并进入' }).click();
  await page.getByRole('button', { name: '登录并进入' }).waitFor({ state: 'hidden' });
  for (const [resource, backLabel] of [['customers', '返回客户列表'], ['opportunities', '返回商机列表']]) {
    const data = await (await page.request.get(`${base}/api/systems/demo-portal/${resource}?pageSize=100`)).json();
    assert.ok(data.items.length, 'Needs existing read-only sample');
    await page.goto(`${base}/#/showcase/${resource}/${data.items[0].id}`);
    const root = page.locator('.detail-workspace:visible');
    await root.getByRole('button', { name: backLabel }).waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('.showcase-shell').evaluate(async (el) => { el.getBoundingClientRect(); await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => {}))); });
      const header = root.locator('.detail-header');
      const title = await header.locator('h1').boundingBox(), summary = await header.locator('.detail-summary').boundingBox();
      assert.ok(summary.y >= title.y + title.height);
      assert.ok(Math.abs(summary.x - title.x) < 1);
      await page.screenshot({ path: `${out}/${resource}-${width}.png`, fullPage: true });
      const box = await root.boundingBox(); assert.ok(box.x + box.width <= width + 1, JSON.stringify({ resource, width, box, ancestors: await root.evaluate(el => { const rows = []; for(let p=el;p;p=p.parentElement) rows.push({cls:p.className,width:p.getBoundingClientRect().width,min:getComputedStyle(p).minWidth}); return rows; }) }));
      const sections = await root.locator('.detail-panel > .detail-section').evaluateAll((nodes) => nodes.map((node) => ({ border: getComputedStyle(node).borderLeftWidth, shadow: getComputedStyle(node).boxShadow })));
      assert.ok(sections.every((s) => s.border === '0px' && s.shadow === 'none'));
      measurements.push({ resource, width, box, sections });
      await page.screenshot({ path: `${out}/${resource}-${width}.png`, fullPage: true });
    }
    const tabs = root.getByRole('tablist');
    await tabs.getByRole('tab').first().focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await tabs.getByRole('tab').nth(1).getAttribute('aria-selected'), 'true');
    assert.equal(await root.getByRole('tabpanel').getAttribute('aria-labelledby'), await tabs.getByRole('tab').nth(1).getAttribute('id'));
    await root.getByRole('button', { name: backLabel }).click();
    await page.waitForURL(`**/#/showcase/${resource}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ result: 'PASS', writes: 'none', measurements, errors }, null, 2));
  console.log('PASS shared detail desktop/mobile layout, keyboard tabs and back links');
} finally { await browser.close(); }
