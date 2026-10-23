import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const url = new URL(process.argv[2]);
if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Expected local HTTP URL');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'document-workspace-browser-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [], errors = [];
try {
  for (const touch of [false, true]) {
    const viewport = touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url.toString());
      const edit = page.getByRole('button', { name: '编辑', exact: true }), note = page.getByLabel('备注', { exact: true });
      await edit.waitFor();
      assert.equal(await page.getByRole('tab').count(), 0);
      assert.equal(await note.getAttribute('readonly'), '');
      assert.equal(await page.getByRole('columnheader', { name: '操作', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: '新增行', exact: true }).count(), 0);
      await edit.click(); await note.fill('未保存备注');
      await page.getByRole('button', { name: '新增行', exact: true }).click();
      assert.equal(await page.getByRole('row').count(), 3);
      await page.getByRole('button', { name: '取消', exact: true }).click();
      assert.equal(await note.inputValue(), '合成演练，不生成库存流水');
      assert.equal(await page.getByRole('row').count(), 2);
      await edit.click(); await note.fill('本地保存备注');
      await page.getByLabel('第 1 行数量', { exact: true }).fill('4');
      await page.getByRole('button', { name: '新增行', exact: true }).click();
      await page.getByRole('button', { name: '删除第 2 行', exact: true }).click();
      assert.equal(await page.getByRole('row').count(), 2);
      assert.equal(await page.getByLabel('单号', { exact: true }).getAttribute('readonly'), '');
      await page.getByRole('button', { name: '保存', exact: true }).click();
      assert.equal(await note.inputValue(), '本地保存备注');
      assert.equal(await page.getByRole('cell', { name: '4', exact: true }).count(), 1);
      for (const status of ['SUBMITTED', 'POSTED']) {
        await page.getByRole('combobox', { name: /^演练状态/ }).selectOption(status);
        assert(await edit.isDisabled()); assert.equal(await note.getAttribute('readonly'), '');
      }
      await page.getByRole('button', { name: '返回领用列表' }).click();
      assert.match(await page.locator('output').innerText(), /返回回调/);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const scroll = await page.locator('.demo-grid-scroll').evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
      if (touch) assert(scroll.scroll > scroll.client);
      const screenshot = path.join(output, `${touch ? 'touch' : 'desktop'}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      results.push({ viewport, touch, scroll, screenshot });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ browserVersion: browser.version(), results, errors, limitation: 'Host state only; no business API, inventory or persistence validation.' }, null, 2));
  console.log(`PASS document workspace; evidence: ${output}`);
} finally { await browser.close(); }
