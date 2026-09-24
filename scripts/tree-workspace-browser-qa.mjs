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
const base = 'http://localhost:5173', out = '/tmp/tree-workspace-qa';
await mkdir(out, { recursive: true });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const measurements = [];
try {
  await page.goto(base + '/#/showcase/customers');
  await page.getByLabel('账号', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录并进入' }).click();
  await page.getByRole('button', { name: '登录并进入' }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '系统管理', exact: true }).waitFor();
  for (const name of ['角色管理', '组织架构', '资源菜单', '数据字典', '物料产品管理']) {
    await page.getByRole('button', { name, exact: true }).first().click();
    const root = page.locator('.tree-workspace:visible'); await root.waitFor();
    await root.locator('.tw-tree[aria-busy="false"]').waitFor();
    await root.locator('.tw-row').first().waitFor();
    const nodeName = await root.locator('.tw-row').first().getAttribute('aria-label');
    await root.locator('.tw-node').first().click();
    await root.locator('.tw-tools-toggle').click();
    for (const label of ['全部收起', '全部展开']) await root.getByRole('button', { name: label, exact: true }).click();
    await root.locator('.tw-search input').fill(nodeName); assert.ok(await root.locator('.tw-row').count()); await root.locator('.tw-search input').fill('');
    if (await root.locator('.tree-node-menu-trigger').count()) {
      await root.locator('.tree-node-menu-trigger').first().click(); await page.getByRole('menu').waitFor();
      const menu = await page.getByRole('menu').boundingBox(); assert.ok(menu.x >= 0 && menu.x + menu.width <= 1441); await page.keyboard.press('Escape');
    }
    await root.getByLabel('面板宽度').fill('400');
    assert.ok(Math.abs((await root.locator('.tw-panel').boundingBox()).width - 400) < 2);
    await root.getByLabel('面板宽度').fill('320');
    await root.locator('.tw-panel-toggle').click(); assert.equal(await root.locator('.tw-tree').count(), 0); await root.locator('.tw-panel-toggle').click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('.showcase-shell').evaluate(async el => { el.getBoundingClientRect(); await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{}))); });
      const box = await root.boundingBox(); assert.ok(box.x + box.width <= width + 1, JSON.stringify({name,width,box}));
      const rowHeight = (await root.locator('.tw-row').first().boundingBox()).height; assert.ok(rowHeight <= 34, `${name} row ${rowHeight}`);
      const panel = await root.locator('.tw-panel').boundingBox(), toggle = await root.locator('.tw-panel-toggle').boundingBox(); assert.ok(Math.abs(toggle.y + toggle.height/2 - panel.y-panel.height/2)<2);
      measurements.push({name, url:page.url(), width, box, rowHeight});
      await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1000});
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ result:'PASS', writes:'none',measurements, errors },null,2));
  console.log('PASS 5 tree workspaces desktop/mobile, search, tools, menus, width and collapse');
} finally { await browser.close(); }
