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
const base = 'http://localhost:5173', out = '/tmp/content-tabs-qa';
await mkdir(out, { recursive: true });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const measurements = [];
try {
  await page.goto(base + '/#/showcase/customers');
  await page.getByLabel('账号', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录并进入' }).click();
  await page.getByRole('button', { name: '登录并进入' }).waitFor({ state: 'hidden' });
  await page.getByRole('button',{name:'系统管理',exact:true}).waitFor();
  const data=await (await page.request.get(`${base}/api/systems/demo-portal/customers?pageSize=100`)).json(); assert.ok(data.items.length);
  const styleOf = async (tab) => tab.evaluate(el=>{const s=getComputedStyle(el);return Object.fromEntries(['boxShadow','fontFamily','fontSize','fontWeight','color','backgroundColor','borderTopWidth','borderRightWidth','borderBottomWidth','borderBottomColor','borderLeftWidth','borderRadius','minHeight','paddingTop','paddingRight','lineHeight'].map(k=>[k,s[k]]));});
  await page.goto(`${base}/#/showcase/customers/${data.items[0].id}`);
  const customer=page.getByRole('tablist',{name:'客户详情分区'}); await customer.waitFor();
  const selected=await styleOf(customer.getByRole('tab').first()), idle=await styleOf(customer.getByRole('tab').nth(1));
  await page.getByRole('button',{name:'资源菜单',exact:true}).first().click();
  const tabs=page.getByRole('tablist',{name:'资源详情分区'});await tabs.waitFor();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await tabs.getByRole('tab').count(),5);
    assert.deepEqual(await styleOf(tabs.getByRole('tab').first()),selected);
    assert.deepEqual(await styleOf(tabs.getByRole('tab').nth(1)),idle);
    for(const tab of await tabs.getByRole('tab').all()){
      await tab.click(); assert.equal(await tab.getAttribute('aria-selected'),'true');
      const panel=page.getByRole('tabpanel');assert.equal(await panel.getAttribute('aria-labelledby'),await tab.getAttribute('id'));
    }
    await tabs.getByRole('tab').last().press('Home');assert.equal(await tabs.getByRole('tab').first().getAttribute('aria-selected'),'true');
    await tabs.getByRole('tab').first().press('ArrowRight');assert.equal(await tabs.getByRole('tab').nth(1).getAttribute('aria-selected'),'true');
    await tabs.getByRole('tab').nth(1).press('Home');
    await tabs.getByRole('tab').last().hover(); await tabs.evaluate(async el=>{el.getBoundingClientRect();await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));}); assert.deepEqual(await styleOf(tabs.getByRole('tab').last()),idle); await page.locator('.tw-footer').hover();
    const box=await tabs.boundingBox();assert.ok(box.x+box.width<=width+1);
    measurements.push({width,selected,idle});await page.screenshot({path:`${out}/resource-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({result:'PASS',measurements,errors},null,2));
  console.log('PASS resource tabs match customer active/inactive styles; all 5 panels, keyboard, desktop/mobile');
}catch(error){console.error('Matching tab rules:',await page.getByRole('tablist',{name:'资源详情分区'}).getByRole('tab').last().evaluate(el=>[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].filter(r=>r.selectorText&&el.matches(r.selectorText)).map(r=>r.cssText)}catch{return []}}))); throw error;}finally{await browser.close();}
