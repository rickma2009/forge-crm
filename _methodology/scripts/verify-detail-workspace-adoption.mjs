import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = new URL(process.argv[2]);
if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Expected a local HTTP rehearsal URL');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'detail-workspace-browser-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [], errors = [];
try {
  for (const touch of [false, true]) {
    const viewport = touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      await page.goto(url.toString());
      const info = page.getByRole('tab', { name: '基本信息' }), history = page.getByRole('tab', { name: '维护记录 (2)', exact: true });
      await info.waitFor(); await page.getByLabel('设备名称', { exact: true }).fill('修改后的设备');
      await info.focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await history.getAttribute('aria-selected'), 'true');
      assert(await history.evaluate(node => node === document.activeElement));
      assert.equal(await page.getByRole('tabpanel').getAttribute('id'), await history.getAttribute('aria-controls'));
      await page.keyboard.press('ArrowRight'); assert.equal(await info.getAttribute('aria-selected'), 'true');
      assert.equal(await page.getByLabel('设备名称', { exact: true }).inputValue(), '修改后的设备');
      await page.keyboard.press('End'); assert.equal(await history.getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Home'); assert.equal(await info.getAttribute('aria-selected'), 'true');
      await page.keyboard.press('ArrowLeft'); assert.equal(await history.getAttribute('aria-selected'), 'true');
      await page.getByLabel('显示维护记录').uncheck();
      assert.equal(await page.getByRole('tab').count(), 1); assert.equal(await info.getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('[role=tab][tabindex="0"]').count(), 1);
      await page.getByRole('button', { name: '保存示例' }).click(); assert.match(await page.locator('output').innerText(), /保存回调：修改后的设备/);
      const back = page.getByRole('button', { name: '返回设备列表' }); await back.click();
      assert.match(await page.locator('output').innerText(), /返回回调/);
      const box = await back.boundingBox(); assert.equal(box.width, touch ? 44 : 32); assert.equal(box.height, touch ? 44 : 32);
      await page.getByLabel('显示维护记录').check();
      const styles = await page.getByRole('tab').evaluateAll(nodes => nodes.map(node => { const s = getComputedStyle(node); return { color: s.color, weight: s.fontWeight, border: s.borderBottomWidth, radius: s.borderRadius }; }));
      assert.equal(styles[0].weight, '600'); assert.equal(styles[1].weight, '400'); assert.notEqual(styles[0].color, styles[1].color); assert.equal(styles[0].border, '2px'); assert.equal(styles[0].radius, '0px');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const screenshot = path.join(output, `${touch ? 'touch' : 'desktop'}.png`); await page.screenshot({ path: screenshot, fullPage: true });
      results.push({ viewport, touch, back: { width: box.width, height: box.height }, styles, screenshot });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ browserVersion: browser.version(), results, errors, limitation: 'Isolated synthetic host only; callbacks do not persist data or navigate.' }, null, 2));
  console.log(`PASS detail workspace desktop/touch interactions; evidence: ${output}`);
} finally { await browser.close(); }
