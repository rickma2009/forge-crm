import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  distillation: '_methodology/reference-cases/gf-scm-enterprise-navigation-shell-distillation.md',
  pattern: '_methodology/patterns/enterprise-two-level-navigation-shell.md',
  templateReadme: '_methodology/templates/ui/enterprise-navigation-shell/README.md',
  tokens: '_methodology/templates/ui/enterprise-navigation-shell/navigation-shell.tokens.css',
  schema: '_methodology/templates/ui/enterprise-navigation-shell/navigation-schema.example.json',
  exampleReadme: '_methodology/examples/002-golden-interaction-enterprise-navigation-shell/README.md',
  html: '_methodology/examples/002-golden-interaction-enterprise-navigation-shell/index.html',
  css: '_methodology/examples/002-golden-interaction-enterprise-navigation-shell/styles.css',
  js: '_methodology/examples/002-golden-interaction-enterprise-navigation-shell/app.js',
};

for (const [name, relative] of Object.entries(files)) {
  assert.ok(fs.existsSync(path.join(root, relative)), `${name} 缺失: ${relative}`);
}

const schema = JSON.parse(fs.readFileSync(path.join(root, files.schema), 'utf8'));
assert.equal(typeof schema.systemName, 'string', '菜单示例必须声明 systemName');
assert.ok(Array.isArray(schema.groups) && schema.groups.length > 0, '菜单示例必须包含 groups');
for (const item of [schema.home, ...schema.groups]) {
  assert.equal(typeof item.key, 'string', '每个菜单项必须有稳定 key');
  assert.equal(typeof item.label, 'string', '每个菜单项必须有 label');
  assert.equal(typeof item.icon, 'string', '每个菜单项必须使用语义 icon key');
  if (item.children) assert.ok(item.children.every((child) => child.path), '二级菜单必须可路由');
}

const tokens = fs.readFileSync(path.join(root, files.tokens), 'utf8');
for (const token of ['--nav-rail-bg', '--nav-rail-fg', '--nav-primary', '--nav-rail-width', '--nav-rail-collapsed', '--nav-topbar-height', '--nav-item-height', '--nav-brand-font-size', '--nav-primary-font-size']) {
  assert.match(tokens, new RegExp(token), `缺少设计令牌 ${token}`);
}

const html = fs.readFileSync(path.join(root, files.html), 'utf8');
const css = fs.readFileSync(path.join(root, files.css), 'utf8');
const js = fs.readFileSync(path.join(root, files.js), 'utf8');
for (const marker of ['data-menu-search', 'aria-expanded="false"', 'data-collapse', 'data-mobile-menu', 'data-scrim']) assert.ok(html.includes(marker), `交互案例缺少 ${marker}`);
for (const marker of ['localStorage', "event.key === '/'", 'setGroupOpen', "event.key === 'Escape'", "group.addEventListener('mouseenter'", "group.addEventListener('focusin'"]) assert.ok(js.includes(marker), `交互脚本缺少 ${marker}`);
for (const marker of ['@media (max-width: 860px)', '.shell.collapsed', '.shell.mobile-open .rail-scrim', 'font-size: var(--nav-brand-font-size)', 'font-size: var(--nav-primary-font-size)']) assert.ok(css.includes(marker), `交互样式缺少 ${marker}`);

console.log('PASS  企业双层导航模式、模板、交互案例和自动检查一致');
