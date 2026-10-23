import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoot = path.join(root, 'packages/web/src');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [target] : [];
  });
}
const violations = [], consumers = new Set(); let instances = 0;
for (const file of files(sourceRoot)) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      if (tag === 'table') violations.push(`${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      if (['BusinessDataGrid', 'DeclarativeDataGrid'].includes(tag)) { consumers.add(path.relative(root, file)); instances++; }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (violations.length) { console.error('独立原生表格须接入公共网格:\n' + violations.join('\n')); process.exitCode = 1; }
else console.log(`PASS shared data grids: ${consumers.size} source files, ${instances} bindings, no standalone native tables`);
