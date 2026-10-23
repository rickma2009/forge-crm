import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../../', import.meta.url));
if (!process.argv[2]) throw new Error('Usage: verify-drawer-style-ownership.mjs <preserved-before.css>');
const before = fs.readFileSync(process.argv[2], 'utf8');
const common = fs.readFileSync(path.join(root, 'packages/web/src/common/drawer-workspace.css'), 'utf8');
const business = fs.readFileSync(path.join(root, 'packages/web/src/common/agent/agent-assistant-drawer.css'), 'utf8');
assert(before.includes('.agent-source')); assert(!common.includes('.agent-')); assert(business.includes('.agent-source'));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'drawer-style-ownership-'));
const results = [];
const markup = '<div class="drawer-workspace-backdrop"><div class="drawer-workspace"><header><div><h2>合成助手</h2><p>说明</p></div><button>关闭</button></header><div class="drawer-workspace-body"><p class="agent-muted">提示</p><p class="agent-task-status">处理中</p><ol class="agent-progress"><li>读取信息</li></ol><div class="agent-history"><button>历史</button></div><div class="agent-evidence"><button>依据</button></div><section class="agent-source"><h3>引用</h3><dl><dt>名称</dt><dd>测试资料</dd></dl></section><span class="agent-kind">事实</span><label class="agent-check"><input type="checkbox">确认</label></div><footer><button>取消</button><button class="is-primary">保存</button></footer></div></div>';
try {
  for (const touch of [false, true]) {
    const viewport = touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      const measure = async styles => {
        await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;font:12px system-ui}*{box-sizing:border-box}</style>' + markup);
        for (const content of styles) await page.addStyleTag({ content });
        return page.locator('.drawer-workspace-backdrop, .drawer-workspace-backdrop *').evaluateAll(nodes => nodes.map(node => {
          const style = getComputedStyle(node), box = node.getBoundingClientRect();
          return { tag: node.tagName, class: node.className, styles: Object.fromEntries([...style].map(key => [key, style.getPropertyValue(key)])), box: { x: box.x, y: box.y, width: box.width, height: box.height } };
        }));
      };
      const old = await measure([before]), current = await measure([common, business]);
      assert.deepEqual(current, old);
      assert.equal(await page.evaluate(() => innerWidth), viewport.width);
      const screenshot = path.join(output, touch ? 'touch.png' : 'desktop.png'); await page.screenshot({ path: screenshot });
      results.push({ viewport, touch, comparedElements: current.length, computedStylesAndGeometryEqual: true, screenshot });
    } finally { await context.close(); }
  }
  const sha256 = value => createHash('sha256').update(value).digest('hex');
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ browserVersion: browser.version(), baselineSha256: sha256(before), commonSha256: sha256(common), businessSha256: sha256(business), results, limitation: 'Synthetic DOM computed-style comparison; not an Agent API, full page, interaction or accessibility verification.' }, null, 2));
  console.log(`PASS drawer style ownership; evidence: ${output}`);
} finally { await browser.close(); }
