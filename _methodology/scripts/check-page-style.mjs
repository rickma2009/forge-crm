import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';

const directory = new URL('../../packages/web/src/showcase/', import.meta.url);
const failures = [];
let pages = 0;
for (const file of readdirSync(directory).filter((name) => name.endsWith('.tsx') && !name.includes('.test.'))) {
  const text = readFileSync(new URL(file, directory), 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  pages++;
  function visit(node, inCell = false) {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(source);
      inCell ||= tag === 'td';
      if (inCell && tag === 'button') {
        const children = node.children.map((child) => child.getText(source)).join('').trim();
        if (/^(查看|详情|编辑|修改|删除|审核|启用|停用|移除|回滚|结束授权)$/.test(children) || /<ActionIcon\s+name="view"/.test(children)) {
          failures.push(`${file}:${source.getLineAndCharacterOfPosition(node.pos).line + 1} 行操作未遵循 UI-LIST-01`);
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, inCell));
  }
  visit(source);
}
for (const file of ['RoleWorkspace.tsx', 'OrganizationUnitsPage.tsx', 'ResourceMenuPage.tsx', 'EnterprisePages.tsx']) {
  const source = readFileSync(new URL(file, directory), 'utf8');
  if (!source.includes('<TreeWorkspace') || !source.includes('actions=')) failures.push(`${file} 缺少公共树工作区及操作参数`);
}
const tree = readFileSync(new URL('../common/TreeWorkspace.tsx', directory), 'utf8');
if (!tree.includes('useTreeNodeMenu') || !tree.includes('menu.open') || !tree.includes('menu.button')) failures.push('TreeWorkspace 缺少公共树节点双入口');
for (const file of ['OpportunityPages.tsx', 'QuotationPages.tsx']) if (!readFileSync(new URL(file, directory), 'utf8').includes('BusinessDirectory')) failures.push(`${file} 缺少公共业务视图工作区`);
if (failures.length) throw new Error(failures.join('\n'));
console.log(`PASS ${pages} 个页面/子组件源码的行操作与公共入口检查；浏览器、权限和持久化行为另行验证`);
