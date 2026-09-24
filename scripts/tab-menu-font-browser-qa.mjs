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
const base = 'http://localhost:5173', out = '/tmp/tab-menu-font-qa';
await mkdir(out, { recursive: true });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const measurements = [];
try {
  await page.goto(base + '/#/showcase/customers');
  await page.getByLabel('账号', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录并进入' }).click();
  await page.getByRole('button', { name: '登录并进入' }).waitFor({ state: 'hidden' });
  await page.getByRole('button', {name:'系统管理', exact:true}).waitFor();
  for (const name of ['角色管理', '组织架构']) await page.getByRole('button', {name,exact:true}).first().click();
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    const tab = page.getByRole('navigation', {name:'已打开页面'}).getByRole('button', {name:'组织架构',exact:true});
    await tab.click({button:'right'});
    const menu = page.getByRole('menu'); await menu.waitFor();
    const font = await tab.evaluate(el=>({family:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize}));
    const items = await menu.getByRole('menuitem').evaluateAll(els=>els.map(el=>({family:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize,disabled:el.disabled})));
    assert.equal(font.size,'12px'); assert.equal(items.length,6);
    for(const item of items) {assert.equal(item.family,font.family);assert.equal(item.size,font.size);}
    await menu.getByRole('menuitem',{name:'关闭其他'}).hover();
    assert.equal(await menu.getByRole('menuitem',{name:'关闭其他'}).evaluate(el=>getComputedStyle(el).fontSize),font.size);
    measurements.push({width,font,items}); await page.screenshot({path:`${out}/menu-${width}.png`,fullPage:true});
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/result.json`,JSON.stringify({result:'PASS',measurements,errors},null,2));
  console.log('PASS all 6 menu items match tab family and 12px size, desktop/mobile');
} finally {await browser.close();}
