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
const base = 'http://localhost:5173', out = '/tmp/document-detail-qa';
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
  const customers = await (await page.request.get(`${base}/api/systems/demo-portal/customers?pageSize=100`)).json();
  await page.goto(`${base}/#/showcase/customers/${customers.items[0].id}`);
  const customerBack=page.getByRole('button',{name:'返回客户列表'});await customerBack.waitFor();
  const backStyle=await customerBack.evaluate(el=>{const s=getComputedStyle(el);return {width:s.width,height:s.height,border:s.borderRadius,icon:el.querySelector('svg').getAttribute('width')};});
  const itemData=await (await page.request.get(`${base}/api/systems/demo-portal/items?pageSize=100&status=ACTIVE`)).json();
  const warehouseData=await (await page.request.get(`${base}/api/systems/demo-portal/warehouses?pageSize=100&status=ACTIVE`)).json();
  const entityData=await (await page.request.get(`${base}/api/systems/demo-portal/legal-entities?pageSize=100&status=ACTIVE`)).json();
  const item=itemData.items[0],warehouse=warehouseData.items.find(w=>entityData.items.some(e=>e.id===w.legalEntityId));assert.ok(item&&warehouse);
  const entity=entityData.items.find(e=>e.id===warehouse.legalEntityId),id='55555555-5555-4555-8555-555555555555';
  let record={id,orderNo:'RK-UI-PREVIEW',documentDate:'2026-09-24',inboundType:'FINISHED_GOODS',status:'DRAFT',legalEntityId:entity.id,legalEntityName:entity.entityName,warehouseId:warehouse.id,warehouseName:warehouse.warehouseName,factoryCode:null,reasonCode:'FINISHED_GOODS',currencyCode:'CNY',remark:null,postedAt:null,reversedAt:null,version:1,createdAt:'2026-09-24T00:00:00.000Z',updatedAt:'2026-09-24T00:00:00.000Z',lines:[{id:'66666666-6666-4666-8666-666666666666',lineNo:10,itemCode:item.itemCode,itemName:item.itemName,batchNo:item.batchManaged?'QA-BATCH':null,originalQty:null,actualQty:'1.0000',baseUnit:item.baseUnit,amount:'10.00',remark:null}]};
  let saves=0;
  await page.route(`**/api/systems/demo-portal/inbound-orders/${id}`,async route=>{
    if(route.request().method()==='PATCH') { const input=route.request().postDataJSON();assert.equal(input.version,record.version); saves++;record={...record,...input,version:record.version+1,lines:input.lines.map(line=>({...record.lines[0],...line}))}; }
    else assert.equal(route.request().method(),'GET');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(record)});
  });
  await page.goto(`${base}/#/showcase/inbound-orders/${id}`);const root=page.locator('.document-workspace:visible');await root.getByRole('heading',{name:'RK-UI-PREVIEW'}).waitFor();
  assert.deepEqual(await root.getByRole('button',{name:'返回入库单列表'}).evaluate(el=>{const s=getComputedStyle(el);return {width:s.width,height:s.height,border:s.borderRadius,icon:el.querySelector('svg').getAttribute('width')};}),backStyle);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});await page.locator('.showcase-shell').evaluate(async el=>{el.getBoundingClientRect();await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
    assert.equal(await root.getByRole('tablist').count(),0);assert.ok(await root.getByLabel('制单日期').isDisabled());assert.equal(await root.getByRole('columnheader',{name:'操作',exact:true}).count(),0);assert.equal(await root.getByRole('button',{name:'添加行'}).count(),0);
    const master=await root.locator('.document-fields').boundingBox(),lines=await root.getByRole('table',{name:'入库明细'}).boundingBox();assert.ok(lines.y>master.y+master.height);
    const box=await root.boundingBox();assert.ok(box.x+box.width<=width+1);await page.screenshot({path:`${out}/view-${width}.png`,fullPage:true});
    await root.getByRole('button',{name:'编辑',exact:true}).click();await root.getByRole('button',{name:'保存',exact:true}).waitFor();
    assert.ok(await root.getByLabel('制单日期').isEnabled());assert.equal(await root.getByRole('columnheader',{name:'操作',exact:true}).count(),1);assert.ok(await root.getByLabel('入库单号').getAttribute('readonly')!==null);
    await root.getByLabel('备注',{exact:true}).fill(`布局验证-${width}`);await root.getByLabel('第1行实际数量').fill('2');
    await root.getByRole('button',{name:'添加行'}).click();await root.getByRole('button',{name:'删除第2行'}).click();
    await page.screenshot({path:`${out}/edit-${width}.png`,fullPage:true});
    if(width===1440){await root.getByRole('button',{name:'保存',exact:true}).click();await root.getByText('入库单已保存').waitFor();assert.equal(saves,1);assert.equal(record.lines[0].actualQty,'2');}
    else{page.once('dialog',dialog=>dialog.accept());await root.getByRole('button',{name:'取消编辑'}).click();}
    await root.getByRole('button',{name:'编辑',exact:true}).waitFor();assert.equal(await root.getByRole('columnheader',{name:'操作',exact:true}).count(),0);
    measurements.push({width,box,master,lines,backStyle});
  }
  await page.setViewportSize({width:1440,height:1000});await root.getByRole('button',{name:'编辑',exact:true}).click();await root.getByLabel('备注',{exact:true}).fill('离开保护');let confirmations=0;page.on('dialog',async dialog=>{confirmations++;await dialog.accept();});await root.getByRole('button',{name:'返回入库单列表'}).click();await page.waitForURL('**/#/showcase/inbound-orders');assert.equal(confirmations,1);
  assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({result:'PASS',businessWrites:0,mockedSaves:saves,measurements,errors},null,2));
  console.log('PASS document view/edit, conditional actions, mock save, dirty back guard, shared arrow, desktop/mobile; business writes=0');
}catch(error){await page.screenshot({path:`${out}/failure.png`,fullPage:true});console.error('URL',page.url(),'labels',await page.locator('label').allTextContents(),'errors',errors);throw error;}finally{await browser.close();}
