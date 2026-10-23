import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const files = [
  'AGENTS.md',
  '_methodology/style-index.md',
  '_methodology/templates/AGENTS-template.md',
  '_methodology/project-init/templates/AGENTS.md',
  '_methodology/templates/ui/record-management-workspace/README.md',
  '_methodology/examples/003-golden-interaction-record-management-workspace/list-action-guideline.md',
];
for (const file of files) {
  const content = readFileSync(new URL(file, root), 'utf8');
  for (const rule of ['UI-LIST-01', 'UI-BUTTON-01', 'UI-LIST-VIEW-01', 'UI-TREE-01', 'UI-TAB-01', 'UI-DETAIL-01', 'UI-VIEW-CONTROL-01', 'UI-TREE-WORKSPACE-01', 'UI-DOCUMENT-01', 'UI-BACK-01']) {
    if (!content.includes(rule)) throw new Error(`${file} 缺少全局样式规则入口 ${rule}`);
  }
}
const spec = readFileSync(new URL('.specify/specs/008-customer-directory-demo/testcases.md', root), 'utf8');
if (spec.includes('admin 显示查看/修改图标，viewer 只显示查看')) {
  throw new Error('客户列表当前验收仍要求查看图标，与 UI-LIST-01 冲突');
}
const viewSpec = readFileSync(new URL('.specify/specs/007-role-scoped-list-views/spec.md', root), 'utf8');
if (viewSpec.includes('默认顺序为最近选择 → 用户默认 → 系统默认 → 首个可用')) {
  throw new Error('视图当前规格仍使用旧默认顺序，与 UI-LIST-VIEW-01 冲突');
}
console.log(`PASS 行操作、按钮、列表视图规则入口及当前验收引用一致 (${fileURLToPath(root)})；不代表页面实现通过`);

for (const page of ['CustomerDetailPage.tsx', 'OpportunityPages.tsx', 'QuotationPages.tsx']) {
  const content = readFileSync(new URL('packages/web/src/showcase/' + page, root), 'utf8');
  if (!content.includes('<DetailWorkspace') || !content.includes('<DetailHeader')) throw new Error(page + ' 缺少 UI-DETAIL-01 公共组件');
}
console.log('PASS UI-DETAIL-01 规则引用及首批组件接入；视觉和交互由浏览器回归验证');

for (const file of ['packages/web/src/common/BusinessDirectory.tsx', 'packages/web/src/showcase/EnterprisePages.tsx']) {
  const text = readFileSync(new URL(file, root), 'utf8');
  if (!text.includes('<ListViewSelector') || text.includes('className="view-mode"')) throw new Error(file + ' 未统一使用 ListViewSelector');
}

for (const page of ['RoleWorkspace.tsx', 'OrganizationUnitsPage.tsx', 'ResourceMenuPage.tsx', 'EnterprisePages.tsx', 'InventoryPages.tsx']) {
  const content = readFileSync(new URL('packages/web/src/showcase/' + page, root), 'utf8');
  if (!content.includes('<TreeWorkspace')) throw new Error(page + ' 缺少 UI-TREE-WORKSPACE-01 公共组件');
}
console.log('PASS UI-TREE-WORKSPACE-01 五处接入，交互和视觉另行验证');

const tabCss = readFileSync(new URL('packages/web/src/common/route-tabs/route-tabs.css', root), 'utf8');
if (!/\.common-route-tabs, \.common-route-tab-menu\s*\{[^}]*font-family: var\(--ipl-font-family\);[^}]*font-size: var\(--ipl-font-size, 12px\)/.test(tabCss) || /\.common-route-tab-menu button\s*\{[^}]*font-size: 14px/.test(tabCss)) throw new Error('UI-TAB-01 菜单与Tab必须共用字体令牌');

const resourceTabs = readFileSync(new URL('packages/web/src/showcase/ResourceMenuPage.tsx', root), 'utf8');
if (!resourceTabs.includes('<DetailTabs') || !resourceTabs.includes('<DetailPanel') || resourceTabs.includes('className="resource-detail-tabs"')) throw new Error('UI-CONTENT-TABS-01 资源菜单须调用公共内容Tab');

const inboundDetail = readFileSync(new URL('packages/web/src/showcase/InboundOrderDetailPage.tsx', root), 'utf8');
if (!inboundDetail.includes('<DocumentWorkspace') || inboundDetail.includes('<DetailTabs') || inboundDetail.includes('product-inner-tabs')) throw new Error('UI-DOCUMENT-01 入库详情必须使用单页主从工作区');
const detailHeader = readFileSync(new URL('packages/web/src/common/DetailWorkspace.tsx', root), 'utf8');
if (!detailHeader.includes('<DetailBackButton label={backLabel}')) throw new Error('UI-BACK-01 公共头部必须使用统一返回组件');

// UI-ACTION-LAYOUT-01 checks only wiring/tokens; browser acceptance is separate.
const actionCss = readFileSync(new URL('packages/web/src/common/row-actions.css', root), 'utf8');
if (!/\.row-actions-two-lines\s*\{[^}]*grid-template-columns:repeat\(3,28px\)[^}]*gap:3\.2px/.test(actionCss)) throw new Error('UI-ACTION-LAYOUT-01 双行操作布局或间距不正确');
const mailPage = readFileSync(new URL('packages/web/src/showcase/digital-employee/MailAutomationCenter.tsx', root), 'utf8');
if ((mailPage.match(/data-wrap="true">\{canExecute&&<span className="row-actions-two-lines">/g) ?? []).length !== 2) throw new Error('UI-ACTION-LAYOUT-01 邮件记录及任务必须接入双行布局和自动行高');
for (const file of ['_methodology/style-index.md', '_methodology/templates/ui/record-management-workspace/README.md', '_methodology/examples/003-golden-interaction-record-management-workspace/list-action-guideline.md']) {
 if (!readFileSync(new URL(file, root), 'utf8').includes('UI-ACTION-LAYOUT-01')) throw new Error(file + ' 缺少双行图标规则');
}
console.log('PASS UI-ACTION-LAYOUT-01 接入和样式令牌；浏览器视觉需另行验收');
