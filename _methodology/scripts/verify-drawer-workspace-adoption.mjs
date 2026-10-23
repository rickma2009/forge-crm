import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const url = new URL(process.argv[2]);
if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Expected local HTTP URL');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'drawer-workspace-browser-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [], errors = [];
try {
  for (const touch of [false, true]) {
    const viewport = touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(url.toString());
      const trigger = page.getByRole('button', { name: '打开抽屉', exact: true });
      await trigger.click();
      const drawer = page.getByRole('dialog', { name: '合成任务' });
      assert(await drawer.evaluate(node => node === document.activeElement));
      const first = page.getByRole('button', { name: '关闭合成任务', exact: true });
      const last = page.getByRole('button', { name: '关闭任务', exact: true });
      await last.focus(); await page.keyboard.press('Tab');
      assert(await first.evaluate(node => node === document.activeElement));
      await page.keyboard.press('Shift+Tab'); assert(await last.evaluate(node => node === document.activeElement));
      await page.getByRole('button', { name: '打开子控件', exact: true }).click();
      await page.getByLabel('子控件输入', { exact: true }).focus(); await page.keyboard.press('Escape');
      assert.equal(await page.getByLabel('子控件输入', { exact: true }).count(), 0); assert.equal(await drawer.count(), 1);
      await page.getByLabel('任务说明', { exact: true }).fill('未保存'); await page.keyboard.press('Escape');
      assert.equal(await drawer.count(), 1); assert.match(await page.locator('output').innerText(), /宿主阻止关闭/);
      await page.getByRole('button', { name: '撤销修改', exact: true }).click();
      await first.focus(); await page.keyboard.press('Escape');
      assert.equal(await drawer.count(), 0); assert(await trigger.evaluate(node => node === document.activeElement));
      await trigger.click();
      const scroll = await page.evaluate(() => { const before = scrollY; window.scrollTo(0, 180); const after = scrollY; window.scrollTo(0, 0); return { before, after, programmaticScrollBlocked: before === after, bodyOverflow: getComputedStyle(document.body).overflow }; });
      const box = await first.boundingBox(); assert.equal(box.height, touch ? 44 : 32);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const screenshot = path.join(output, `${touch ? 'touch' : 'desktop'}.png`); await page.screenshot({ path: screenshot });
      results.push({ viewport, touch, scroll, closeButton: box, screenshot });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ browserVersion: browser.version(), results, errors, limitation: 'Synthetic single drawer; programmatic background scroll observation is not wheel/touch locking verification. No inert, screen-reader, nested-modal or persistence claim.' }, null, 2));
  console.log(`PASS drawer keyboard and host guard; evidence: ${output}`);
} finally { await browser.close(); }
