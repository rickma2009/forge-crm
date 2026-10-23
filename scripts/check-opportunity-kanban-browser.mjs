import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const base = new URL(process.env.KANBAN_BROWSER_URL || 'http://localhost:5173');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('LOCAL_BROWSER_REQUIRED');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let diagnosticPage;
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 diagnosticPage = page;
 page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) console.log('HTTP', r.status(), new URL(r.url()).pathname); });
 let consoleErrors = 0; page.on('console', m => { if (m.type() === 'error' && consoleErrors++ < 5) console.log('CONSOLE', m.text().slice(0,700)); });
 const errors = []; page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(45000);
 const session = await page.request.get(`${base.origin}/api/auth/session`);
 const cookies = await page.context().cookies();
 const csrf = cookies.find(x => x.name === 'ipl_csrf')?.value; assert(csrf);
 const login = await page.request.post(`${base.origin}/api/auth/login`, { headers: { Origin: process.env.KANBAN_LOGIN_ORIGIN || base.origin, 'X-CSRF-Token': decodeURIComponent(csrf) }, data: { account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD } });
 assert.equal(login.status(), 201); console.log('Authenticated');
 const root = `${base.origin}/api/systems/demo-portal/list-views/opportunity-directory/view`;
 const before = await (await page.request.get(root)).json();
 const created = [];
 page.on('response', async response => { if (response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/opportunity-directory/view/personal') && response.ok()) { const body = await response.json(); created.push(body.id); } });
 try {
  await page.goto(`${base.origin}/#/showcase/opportunities`);
  const directory = page.locator('.business-directory:visible');
  await directory.getByRole('button', {name:'看板',exact:true}).waitFor();
  await directory.getByRole('button', {name:'看板',exact:true}).click();
  await directory.locator('.kanban-board').waitFor();
  await directory.getByText('正在加载看板…').waitFor({state:'hidden'});
  assert.equal(await directory.locator('.kanban-column').count() > 0, true);
  assert.equal(await directory.locator('[role=alert]').count(),0);
  await page.screenshot({path:'/tmp/opportunity-kanban-desktop.png',fullPage:true});
  const move = directory.getByRole('button',{name:/变更阶段 O/}).first();
  if (await move.count()) {
   await move.focus(); await page.keyboard.press('Enter');
   const dialog = page.getByRole('dialog',{name:'变更商机阶段'}); await dialog.waitFor();
   assert.equal(await dialog.getByRole('button',{name:'确定变更'}).isDisabled(),true);
   await dialog.getByRole('textbox',{name:'变更理由'}).fill('浏览器验收：仅确认交互，不提交业务变更');
   assert.equal(await dialog.getByRole('button',{name:'确定变更'}).isEnabled(),true);
   await page.screenshot({path:'/tmp/opportunity-kanban-confirm.png'});
   await dialog.getByRole('button',{name:'取消'}).click();
  }
  await page.reload(); await directory.locator('.kanban-board').waitFor();
  await directory.getByRole('button',{name:'表格',exact:true}).click(); await directory.locator('.enterprise-table-wrap').waitFor();
  await directory.getByRole('button',{name:'看板',exact:true}).click(); await directory.locator('.kanban-board').waitFor();
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'/tmp/opportunity-kanban-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]); assert.equal(await page.locator('vite-error-overlay').count(),0);
  console.log(JSON.stringify({result:'PASS',board:true,personalViewRestoredAfterReload:true,tableSwitch:true,keyboardDialog:true,mobileRendered:true,pageErrors:errors}));
 } finally {
  // Restore exactly the display settings touched by this browser verification.
  const cookies = await page.context().cookies(); const token = decodeURIComponent(cookies.find(c=>c.name==='ipl_csrf').value);
  const headers = {Origin:process.env.KANBAN_LOGIN_ORIGIN || base.origin,'X-CSRF-Token':token};
  const latest = await (await page.request.get(root)).json();
  for (const old of before.views.filter(v=>v.scope==='USER')) {
   const current = latest.views.find(v=>v.id===old.id);
   if (current && (JSON.stringify(old.config)!==JSON.stringify(current.config) || current.isDefault!==old.isDefault)) {
    const result=await page.request.patch(`${root}/personal/${old.id}`,{headers,data:{version:current.version,viewName:old.viewName,isDefault:old.isDefault,config:old.config}}); assert.equal(result.ok(),true);
   }
  }
  for (const id of created) { const result=await page.request.delete(`${root}/personal/${id}`,{headers}); assert.equal(result.ok(),true); }
  const restore = await page.request.post(`${root}/selection`,{headers,data:{viewKey:before.selectedViewKey}}); assert.equal(restore.ok(),true);
 }
} catch (error) { console.log(String(error)); if (diagnosticPage) { console.log(await diagnosticPage.locator('body').innerText({timeout:3000}).then(x=>x.slice(-1600)).catch(()=> 'BODY_UNAVAILABLE')); await diagnosticPage.screenshot({path:'/tmp/kanban-browser-failure.png', timeout:3000}).catch(()=>{}); } throw error; } finally { await browser.close(); }
