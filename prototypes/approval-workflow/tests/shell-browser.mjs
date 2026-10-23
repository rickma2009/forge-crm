import assert from 'node:assert/strict';
import {homedir} from 'node:os';
const {chromium}=await import(`${homedir()}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1512,height:982}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://localhost:5173/?preview=workbench#/showcase/approval-center');
 const f=page.frameLocator('iframe[title="审批中心原型预览"]');
 await f.getByRole('grid').waitFor();
 assert.equal(await f.locator('.side-rail').isVisible(),false);
 await f.getByRole('button',{name:'BX2026100500001',exact:true}).click();
 await f.getByRole('button',{name:'打开原单据',exact:true}).waitFor();
 assert.match(page.url(),/approval-center\/instance\//);
 await f.getByRole('button',{name:'打开原单据',exact:true}).click();
 await f.getByRole('heading',{name:'工作流',exact:true}).waitFor();
 assert.match(page.url(),/approval-center\/document\//);
 assert.ok(await f.locator('.flow-node').count()>0);
 await page.screenshot({path:new URL('../.runtime/shell-document.png',import.meta.url).pathname,fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: shell entry, embedded navigation, document workflow footer; no page errors');
} finally {await browser.close();}
