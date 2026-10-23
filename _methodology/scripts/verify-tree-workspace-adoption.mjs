import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = new URL(process.argv[2]);
if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Expected a local HTTP rehearsal URL');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-workspace-adoption-browser-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [], errors = [];
try {
  for (const touch of [false, true]) {
    const viewport = touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      await page.goto(url.toString());
      assert.equal(await page.title(), '树形工作区接入演练');
      await page.getByRole('heading', { name: '树形工作区接入演练' }).waitFor();
      const tree = page.getByRole('tree', { name: '分类树' });
      const row = name => tree.getByRole('treeitem', { name, exact: true });
      const detail = page.getByRole('region', { name: '分类详情' });
      const scenario = page.getByLabel('场景');
      assert.equal(await tree.getByRole('treeitem').count(), 5);
      assert(await detail.getByRole('heading', { name: '请选择分类' }).isVisible());
      assert(await page.getByText('共 5 个节点', { exact: true }).isVisible());
      await page.getByRole('button', { name: '选择分类 控制板', exact: true }).click();
      assert(await detail.getByRole('heading', { name: '控制板', exact: true }).isVisible());
      assert.equal(await row('控制板').getAttribute('aria-selected'), 'true');
      await page.getByLabel('搜索分类', { exact: true }).fill('CTRL');
      assert.deepEqual(await tree.getByRole('treeitem').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), ['硬件', '板卡', '控制板']);
      await page.getByLabel('搜索分类', { exact: true }).fill('不存在');
      assert(await tree.getByText('没有匹配节点').isVisible());
      await page.getByLabel('搜索分类', { exact: true }).fill('');
      await page.getByRole('button', { name: '分类树选项', exact: true }).click();
      await page.getByRole('button', { name: '全部收起', exact: true }).click();
      assert.equal(await tree.getByRole('treeitem').count(), 2);
      await page.getByRole('button', { name: '全部展开', exact: true }).click();
      assert.equal(await tree.getByRole('treeitem').count(), 5);
      await page.getByRole('button', { name: '刷新分类', exact: true }).click();
      assert.match(await page.locator('output').innerText(), /刷新次数：1/);
      await page.getByRole('button', { name: '新增', exact: true }).click();
      assert.match(await page.locator('output').innerText(), /最近动作：新增根分类/);
      await row('硬件').getByRole('button', { name: '硬件操作', exact: true }).click();
      let menu = page.getByRole('menu', { name: '硬件操作菜单', exact: true });
      assert(await menu.getByRole('menuitem', { name: '删除', exact: true }).isDisabled());
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('menu').count(), 0);
      assert(await row('硬件').getByRole('button', { name: '硬件操作', exact: true }).evaluate(node => node === document.activeElement));
      if (touch) await row('控制板').getByRole('button', { name: '控制板操作', exact: true }).click();
      else await row('控制板').click({ button: 'right' });
      menu = page.getByRole('menu', { name: '控制板操作菜单', exact: true });
      await menu.waitFor();
      const menuBox = await menu.boundingBox();
      assert(menuBox.x >= 0 && menuBox.y >= 0 && menuBox.x + menuBox.width <= viewport.width && menuBox.y + menuBox.height <= viewport.height);
      await menu.getByRole('menuitem', { name: '编辑', exact: true }).click();
      assert.match(await page.locator('output').innerText(), /最近动作：编辑：控制板/);
      await row('硬件').focus(); await page.keyboard.press('ArrowRight');
      assert(await row('板卡').evaluate(node => node === document.activeElement));
      await page.keyboard.press('Enter');
      assert(await detail.getByRole('heading', { name: '板卡', exact: true }).isVisible());
      if (!touch) {
        const panel = page.getByRole('complementary', { name: '分类面板' });
        const before = await panel.boundingBox();
        await page.getByRole('slider', { name: '面板宽度' }).focus(); await page.keyboard.press('End');
        const after = await panel.boundingBox(); assert(after.width > before.width); assert.equal(after.width, 440);
      }
      await page.getByRole('button', { name: '收起分类树', exact: true }).click();
      assert.equal(await page.getByRole('tree').count(), 0);
      assert(await detail.getByRole('heading', { name: '板卡', exact: true }).isVisible());
      await page.getByRole('button', { name: '展开分类树', exact: true }).click();
      assert.equal(await tree.getByRole('treeitem').count(), 5);
      await scenario.selectOption('readonly');
      assert.equal(await page.getByRole('button', { name: '新增', exact: true }).count(), 0);
      assert.equal(await tree.locator('.tree-node-menu-trigger').count(), 0);
      await page.getByRole('button', { name: '选择分类 服务', exact: true }).click();
      assert(await detail.getByRole('heading', { name: '服务', exact: true }).isVisible());
      await scenario.selectOption('loading');
      assert.equal(await tree.getAttribute('aria-busy'), 'true');
      assert.equal(await tree.getByRole('treeitem').count(), 0);
      assert(await tree.getByRole('status').isVisible());
      await scenario.selectOption('empty'); assert(await tree.getByText('暂无节点').isVisible());
      await scenario.selectOption('normal');
      const panelBox = await page.getByRole('complementary', { name: '分类面板' }).boundingBox();
      const detailBox = await detail.boundingBox();
      assert(touch ? detailBox.y >= panelBox.y + panelBox.height : detailBox.x >= panelBox.x + panelBox.width);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(await page.locator('vite-error-overlay').count(), 0);
      await page.evaluate(() => window.scrollTo(0, 0));
      const screenshot = touch ? 'touch.png' : 'desktop.png';
      await page.screenshot({ path: path.join(output, screenshot), fullPage: true });
      results.push({ viewport, touch, selection: true, searchAncestors: true, expandCollapse: true, menuAndCallbacks: true, keyboard: true, width: touch ? 'hidden-by-design' : 440, readOnly: true, loadingAndEmpty: true, responsiveLayout: true, screenshot });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ createdAt: new Date().toISOString(), browser: await browser.version(), url: url.toString(), results, errors }, null, 2));
  console.log(`PASS TreeWorkspace browser verification: ${output}`);
} catch (error) {
  fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ message: error.message, results, errors }, null, 2));
  console.error(`FAIL: ${output}`); throw error;
} finally { await browser.close(); }
