import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(new URL('../packages/server/package.json',import.meta.url));require('dotenv').config({path:new URL('../.env',import.meta.url).pathname,quiet:true});
if(!/^\/sdd_numbering_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL).pathname))throw new Error('ISOLATED_DB_REQUIRED_FOR_BROWSER_WRITES');
const front=new URL('http://localhost:5173'),back=new URL(process.env.SALESX_BACKEND_URL||'http://localhost:3107');if(!['localhost','127.0.0.1'].includes(back.hostname))throw new Error('LOCAL_ONLY');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');const browser=await chromium.launch({channel:'chrome',headless:true});let page;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1050}});page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const url=new URL(route.request().url());url.host=back.host;url.protocol=back.protocol;const response=await route.fetch({url:url.toString()});await route.fulfill({response});});
 const session=await context.request.get(`${back.origin}/api/auth/session`);assert.equal(session.status(),401);let csrf=(await context.cookies()).find(c=>c.name==='ipl_csrf')?.value;assert(csrf);
 const login=await context.request.post(`${back.origin}/api/auth/login`,{headers:{Origin:front.origin,'X-CSRF-Token':decodeURIComponent(csrf)},data:{account:'admin',password:process.env.INITIAL_ADMIN_PASSWORD}});assert.equal(login.status(),201);

 await page.goto(`${front.origin}/#/showcase/system/code-rules`);
 const area=page.getByRole('region',{name:'编码规则',exact:true});await area.getByText('CUSTOMER',{exact:true}).waitFor();
 await area.getByRole('button',{name:'＋ 新增编码规则',exact:true}).click();let dialog=page.getByRole('dialog',{name:'新增编码规则',exact:true});
 await dialog.getByLabel('对象编码',{exact:true}).fill('BROWSER_DEMO');await dialog.getByLabel('对象名称',{exact:true}).fill('浏览器编码验收');await dialog.getByLabel('前缀编码',{exact:true}).fill('BR');await dialog.getByLabel('是否含日期',{exact:true}).selectOption('true');await dialog.getByLabel('日期类型',{exact:true}).selectOption('MONTH');
 await page.screenshot({path:'/tmp/numbering-editor.png'});await dialog.getByRole('button',{name:'保存',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await page.getByLabel('对象编码 / 名称',{exact:true}).fill('BROWSER_DEMO');await page.getByRole('button',{name:'查询',exact:true}).click();await area.getByRole('button',{name:'BROWSER_DEMO',exact:true}).waitFor();
 await area.getByRole('button',{name:'编辑浏览器编码验收',exact:true}).click();dialog=page.getByRole('dialog',{name:'编辑编码规则',exact:true});assert(await dialog.getByLabel('对象编码',{exact:true}).isDisabled());await dialog.getByLabel('前缀编码',{exact:true}).fill('BE');await dialog.getByRole('button',{name:'保存',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await area.getByRole('button',{name:'BROWSER_DEMO',exact:true}).click();dialog=page.getByRole('dialog',{name:'查看编码规则',exact:true});assert.equal(await dialog.getByLabel('前缀编码',{exact:true}).inputValue(),'BE');await dialog.getByRole('button',{name:'关闭',exact:true}).click();
 await area.getByRole('button',{name:'删除浏览器编码验收',exact:true}).click();dialog=page.getByRole('dialog',{name:'删除编码规则',exact:true});await dialog.getByRole('button',{name:'确认删除',exact:true}).click();await dialog.waitFor({state:'hidden'});await area.getByText('暂无符合条件的规则',{exact:true}).waitFor();
 await page.getByRole('button',{name:'重置',exact:true}).click();await area.getByText('CUSTOMER',{exact:true}).waitFor();await page.screenshot({path:'/tmp/numbering-list.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.equal(await page.locator('vite-error-overlay').count(),0);console.log(JSON.stringify({result:'PASS',list:true,create:true,edit:true,readonly:true,delete:true,pageErrors:errors}));

}catch(e){if(page)await page.screenshot({path:'/tmp/numbering-browser-failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();}
