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
const grid = readFileSync(new URL('../common/data-grid/BusinessDataGrid.tsx', directory), 'utf8');
if (!grid.includes('rowHeight={32}') || !grid.includes('rowHeight: 32')) failures.push('BusinessDataGrid 默认行高必须为32px');
const templateCatalog = readFileSync(new URL('../templates/index.json', import.meta.url), 'utf8');
const declaredRowHeights = [...templateCatalog.matchAll(/单行行高(\d+)px/g)];
if (!declaredRowHeights.length || declaredRowHeights.some(match => Number(match[1]) !== 32)) failures.push('模板目录的单行行高声明须与公共网格32px一致');
const gridCss = readFileSync(new URL('../common/data-grid/business-data-grid.css', directory), 'utf8');
if (!/\.bdg-grid \.ag-cell\{[^}]*display:flex;align-items:center/.test(gridCss) || !/\.bdg-grid \.ag-cell\.ag-cell-wrap-text\{[^}]*align-items:center/.test(gridCss)) failures.push('BusinessDataGrid 单行和多行内容必须上下居中');
if (/\.bdg-cell-content\{[^}]*min-height:30px/.test(gridCss)) failures.push('单元格内容不可保留造成文字偏上的固定30px高度');
const adapter = readFileSync(new URL('../common/data-grid/DeclarativeDataGrid.tsx', directory), 'utf8');
if (!adapter.includes('sequenceIndex') || !adapter.includes('actionIndex') || !adapter.includes('const order =')) failures.push('DeclarativeDataGrid 缺少序号/操作默认列序');
if (!adapter.includes('data-wrap') || !adapter.includes('hasMultipleFields')) failures.push('DeclarativeDataGrid 缺少显式多行和复合字段处理');
const action = readFileSync(new URL('../common/RowActionButton.tsx', directory), 'utf8');
if (!action.includes("'edit'") || !action.includes("'delete'") || !action.includes("'review'") || !action.includes('data-row-action')) failures.push('RowActionButton 缺少统一操作语义');
const inventoryStock = readFileSync(new URL('InventoryStockPages.tsx', directory), 'utf8');
if ((inventoryStock.match(/<RecordQueryBar layout="singleRow"/g) ?? []).length !== 2) failures.push('当前库存和库存事务明细必须共用单行 RecordQueryBar');
const inventoryStockCss = readFileSync(new URL('inventory-stock.css', directory), 'utf8');
if (inventoryStockCss.includes('.record-query-fields') || inventoryStockCss.includes('.record-query-actions')) failures.push('库存页不可复制公共查询栏布局');
for (const file of ['OpportunityPages.tsx', 'QuotationPages.tsx']) if (!readFileSync(new URL(file, directory), 'utf8').includes('BusinessDirectory')) failures.push(`${file} 缺少公共业务视图工作区`);
if (failures.length) throw new Error(failures.join('\n'));
console.log(`PASS ${pages} 个页面/子组件源码的行操作与公共入口检查；浏览器、权限和持久化行为另行验证`);
