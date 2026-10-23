import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Browser runtime is supplied by the caller; this script never installs one.
const url = new URL(process.argv[2]);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('Expected a local HTTP rehearsal URL');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'list-view-adoption-browser-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], results = [];
try {
  for (const touch of [false, true]) {
    const viewport = touch ? { width: 390, height: 844 } : { width: 1440, height: 900 };
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      await page.goto(url.toString());
      assert.equal(await page.title(), '视图选择器接入演练');
      await page.getByRole('heading', { name: '视图选择器接入演练' }).waitFor();
      const group = page.getByRole('group', { name: '列表视图选择与设置' });
      const select = group.getByRole('combobox'), button = group.getByRole('button', { name: '设置' });
      const boxes = await group.locator(':scope > *').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { y: box.y, height: box.height }; }));
      assert.equal(boxes.length, 3);
      assert(boxes.every(box => box.height === (touch ? 44 : 32) && box.y === boxes[0].y));
      await select.selectOption('mine'); assert.match(await page.locator('output').innerText(), /当前值：mine/);
      await button.click(); assert.match(await page.locator('output').innerText(), /设置回调：1/);
      await page.getByLabel('场景').selectOption('readonly'); assert(await button.isDisabled()); assert(await select.isEnabled());
      await page.getByLabel('场景').selectOption('disabled'); assert(await button.isDisabled()); assert(await select.isDisabled());
      await page.getByLabel('场景').selectOption('empty'); assert(await select.isDisabled()); assert(await button.isDisabled());
      assert.equal(await select.locator('option').innerText(), '无可用视图');
      await page.getByLabel('场景').selectOption('normal'); await select.focus(); await page.keyboard.press('Tab');
      assert(await button.evaluate(element => element === document.activeElement));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(await page.locator('vite-error-overlay').count(), 0);
      const screenshot = touch ? 'touch.png' : 'desktop.png';
      await page.screenshot({ path: path.join(output, screenshot) });
      results.push({ viewport, touch, height: boxes[0].height, aligned: true, callbacks: true, disabledStates: true, emptyState: true, keyboard: true, noPageOverflow: true, screenshot });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ createdAt: new Date().toISOString(), browser: await browser.version(), url: url.toString(), results, errors }, null, 2));
  console.log(`PASS ListViewSelector browser verification: ${output}`);
} catch (error) {
  fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ message: error.message, results, errors }, null, 2));
  console.error(`FAIL: ${output}`); throw error;
} finally { await browser.close(); }
