import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const base = 'packages/web/src/showcase/';
for (const name of readdirSync(base).filter((n) => n.endsWith('.tsx') && !n.includes('.test.'))) {
  const file = base + name; let text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = []; const inventory = [];
  function visit(node, row = false) {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(source);
      row ||= tag === 'td';
      if (row && tag === 'button') {
        const label = node.children.length === 1 && ts.isJsxText(node.children[0]) ? node.children[0].text.trim() : '';
        inventory.push(label || '<dynamic/icon>');
        if (/^(修改|编辑|编辑说明|成员与权限|结束授权|结束绑定|结束关系|与当前比较|回滚|删除|移除|移除成员|启用|停用|禁用|审核|通过|驳回|复制|上移|下移|↑|↓)$/.test(label)) {
          const attrs = text.slice(node.openingElement.tagName.end, node.openingElement.end - 1);
          edits.push({ start: node.getStart(source), end: node.end, text: `<RowActionButton${attrs} label=${JSON.stringify(label)} />` });
          return;
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, row));
  }
  visit(source);
  if (inventory.length) console.log(name, JSON.stringify(inventory), 'converted', edits.length);
  if (!edits.length) continue;
  for (const e of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, e.start) + e.text + text.slice(e.end);
  if (!text.includes("import { RowActionButton }")) text = "import { RowActionButton } from '../common/RowActionButton';\n" + text;
  writeFileSync(file, text);
}
