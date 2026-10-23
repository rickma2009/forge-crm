import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const base = new URL(process.env.CUSTOMER_360_BROWSER_URL || 'http://localhost:5173');
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
 const login = await page.request.post(`${base.origin}/api/auth/login`, { headers: { Origin: process.env.CUSTOMER_360_LOGIN_ORIGIN || base.origin, 'X-CSRF-Token': decodeURIComponent(csrf) }, data: { account: 'admin', password: process.env.INITIAL_ADMIN_PASSWORD } });
 assert.equal(login.status(), 201); console.log('Authenticated');
 const orders = await page.request.get(`${base.origin}/api/systems/demo-portal/sales-orders?pageSize=1`); assert.equal(orders.status(), 200);
 const source = await orders.json();
 const customers = await page.request.get(`${base.origin}/api/systems/demo-portal/customers?pageSize=1`); assert.equal(customers.status(), 200);
 const customerId = source.items[0]?.customerId || (await customers.json()).items[0]?.id; assert(customerId);
 await page.goto(`${base.origin}/#/showcase/customers/${customerId}`);
 console.log('Customer page loaded');
 const detail = page.locator('.customer-detail-page:visible'); await detail.getByRole('tab', { name: '概览', exact: true }).click();
 await detail.getByText('按当前权限统计全部状态的记录；金额请在各业务列表按币别查看。').waitFor();
 await page.screenshot({ path: '/tmp/customer360-overview.png', fullPage: true });
 for (const [kind, label] of [['opportunities','商机'],['quotations','报价单'],['sales-orders','销售订单'],['sales-outbounds','销售出货']]) {
  const response = page.waitForResponse(r => r.url().includes(`/customers/${customerId}/related/${kind}?`) && r.request().method() === 'GET');
  await detail.getByRole('tab', { name: label, exact: true }).click();
  const result = await response; assert.equal(result.status(), 200); const body = await result.json();
  await detail.getByRole('grid', { name: label, exact: true }).waitFor();
  await detail.getByText(`共 ${body.pagination.total} 条`, { exact: false }).waitFor();
  if (kind === 'sales-orders' && body.items.length) {
   const refresh = page.waitForResponse(r => r.url().includes(`/customers/${customerId}/related/${kind}?`));
   const size = detail.getByRole('spinbutton', { name: '每页条数' }); await size.fill('1'); await size.press('Enter');
   assert.equal((await refresh).status(), 200);
   if (body.pagination.total > 1) { const next = page.waitForResponse(r => r.url().includes('page=2')); await detail.getByRole('button',{name:'下一页',exact:true}).click(); assert.equal((await next).status(),200); }
   await page.screenshot({ path: '/tmp/customer360-orders.png', fullPage: true });
  }
 }
 await detail.getByRole('tab', { name: '销售订单', exact: true }).click();
 const link = detail.locator('a.record-detail-link').first(); await link.waitFor();
 const href = await link.getAttribute('href'); await link.click(); await page.waitForURL(url => url.hash === href);
 assert(page.url().includes('/showcase/sales-orders/'));
 await page.goto(`${base.origin}/#/showcase/customers/${customerId}`);
 await page.setViewportSize({ width: 390, height: 844 });
 await detail.getByRole('tab', { name: '销售订单', exact: true }).click(); await detail.getByRole('grid', { name: '销售订单', exact: true }).waitFor();
 await page.screenshot({ path: '/tmp/customer360-mobile.png', fullPage: true });
 assert.deepEqual(errors, []); assert.equal(await page.locator('vite-error-overlay').count(), 0);
 console.log(JSON.stringify({ result: 'PASS', fourRelations: true, overview: true, pagination: true, detailNavigation: true, mobileRendered: true, pageErrors: errors }));
} catch (error) { console.log(String(error)); if (diagnosticPage) { console.log(await diagnosticPage.locator('body').innerText({timeout:3000}).then(x=>x.slice(-1600)).catch(()=> 'BODY_UNAVAILABLE')); await diagnosticPage.screenshot({path:'/tmp/customer360-browser-failure.png', timeout:3000}).catch(()=>{}); } throw error; } finally { await browser.close(); }
