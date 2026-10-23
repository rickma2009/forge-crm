import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = new URL(process.argv[2]);
if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Expected a local HTTP rehearsal URL');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'route-tabs-browser-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [], errors = [];
try {
  for (const touch of [false, true]) {
    const viewport = touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      // Observe navigation arguments without opening a real window. This does not test popup policy.
      await page.addInitScript(() => { window.__opened = []; window.open = (...args) => { window.__opened.push(args); return null; }; });
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      await page.goto(url.toString()); await page.getByRole('heading', { name: '工作区页签独立接入' }).waitFor();
      const nav = page.getByRole('navigation', { name: '已打开页面' });
      const tab = title => nav.getByRole('button', { name: title, exact: true });
      const open = async title => { await page.getByRole('button', { name: `打开${title}`, exact: true }).click(); await tab(title).waitFor(); };
      const menuFor = async title => {
        await tab(title).scrollIntoViewIfNeeded();
        if (touch) { await tab(title).focus(); await page.keyboard.press('Shift+F10'); }
        else await tab(title).click({ button: 'right' });
        const menu = page.getByRole('menu', { name: `${title}页签操作` }); await menu.waitFor(); return menu;
      };
      const active = async (title, route) => { assert.equal(await tab(title).getAttribute('aria-current'), 'page'); assert.equal(await page.getByLabel('当前路径').innerText(), route); };
      await open('设备目录'); await open('维护计划'); await open('统计报表');
      let menu = await menuFor('首页'); assert(await menu.getByRole('menuitem', { name: '关闭当前', exact: true }).isDisabled());
      const type = await tab('首页').evaluate(node => { const s = getComputedStyle(node); return [s.fontFamily, s.fontSize]; });
      const menuTypes = await menu.getByRole('menuitem').evaluateAll(nodes => nodes.map(node => { const s = getComputedStyle(node); return [s.fontFamily, s.fontSize]; }));
      assert(menuTypes.every(value => JSON.stringify(value) === JSON.stringify(type)));
      await page.keyboard.press('End'); assert(await menu.getByRole('menuitem', { name: '在新窗口打开' }).evaluate(node => node === document.activeElement));
      await page.keyboard.press('Home'); assert(await menu.getByRole('menuitem', { name: '刷新当前' }).evaluate(node => node === document.activeElement));
      await page.keyboard.press('ArrowDown'); assert(await menu.getByRole('menuitem', { name: '关闭其他' }).evaluate(node => node === document.activeElement));
      await page.keyboard.press('Escape'); assert(await tab('首页').evaluate(node => node === document.activeElement));
      await active('统计报表', '/reports');
      menu = await menuFor('维护计划'); await menu.getByRole('menuitem', { name: '关闭右侧' }).click();
      await active('维护计划', '/schedule'); assert.equal(await tab('统计报表').count(), 0);
      await nav.getByRole('button', { name: '关闭设备目录', exact: true }).click(); await active('维护计划', '/schedule');
      await open('设备目录'); await tab('维护计划').click();
      menu = await menuFor('维护计划'); await menu.getByRole('menuitem', { name: '关闭当前', exact: true }).click(); await active('设备目录', '/devices');
      await page.getByRole('button', { name: '宿主计数 0', exact: true }).click();
      await page.getByRole('button', { name: '页面计数 0', exact: true }).click();
      menu = await menuFor('设备目录'); await menu.getByRole('menuitem', { name: '刷新当前' }).click();
      assert(await page.getByRole('button', { name: '页面计数 0', exact: true }).isVisible());
      assert(await page.getByRole('button', { name: '宿主计数 1', exact: true }).isVisible());
      await open('维护计划'); await open('统计报表');
      menu = await menuFor('设备目录'); await menu.getByRole('menuitem', { name: '关闭其他' }).click();
      await active('设备目录', '/devices'); assert.equal(await nav.locator('.common-route-tab').count(), 2);
      menu = await menuFor('设备目录'); await menu.getByRole('menuitem', { name: '在新窗口打开' }).click();
      assert.deepEqual(await page.evaluate(() => window.__opened), [[`${url.origin}/?route=%2Fdevices`, '_blank', 'noopener,noreferrer']]);
      menu = await menuFor('设备目录');
      const bounds = await menu.boundingBox(); assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const screenshot = path.join(output, `${touch ? 'touch' : 'desktop'}.png`); await page.screenshot({ path: screenshot, fullPage: true });
      await menu.getByRole('menuitem', { name: '关闭全部' }).click(); await active('首页', '/'); assert.equal(await nav.locator('.common-route-tab').count(), 1);
      results.push({ viewport, touch, typography: type, menuBounds: bounds, screenshot });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ browserVersion: browser.version(), results, errors, limits: ['Synthetic host, no router/auth or dirty-state guard.', 'window.open arguments intercepted, no real popup.', 'Touch viewport menu invoked with keyboard; native long-press not tested.'] }, null, 2));
  console.log(`PASS route tabs desktop/touch viewport; evidence: ${output}`);
} finally { await browser.close(); }
