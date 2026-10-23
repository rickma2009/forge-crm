import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(path.join(repo, 'packages/web/package.json'));
const ts = require('typescript');

/** Advisory source inspection, not a bundler or proof of portability. */
export function inspectDependencies(root, entries) {
  const files = new Set(), packages = new Set(), unresolved = [], manual = [];
  const relative = (file) => path.relative(root, file).split(path.sep).join('/');
  function visit(file, importer = '(entry)') {
    const rel = relative(file);
    if (rel.startsWith('../') || path.isAbsolute(rel)) { unresolved.push({ importer, reference: rel, reason: 'outside-root' }); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { unresolved.push({ importer, reference: rel, reason: 'missing-file' }); return; }
    if (files.has(rel)) return;
    files.add(rel);
    if (file.endsWith('.css')) { manual.push({ file: rel, reason: 'Review CSS imports, url assets, global selectors and design tokens' }); return; }
    if (!/\.[cm]?[jt]sx?$/.test(file)) return;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function dependency(specifier) {
      if (!specifier.startsWith('.')) {
        packages.add(specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]);
        return;
      }
      const base = path.resolve(path.dirname(file), specifier);
      const bases = /\.[cm]?js$/.test(base) ? [base, base.replace(/\.[cm]?js$/, '')] : [base];
      const candidates = bases.flatMap((candidate) => [candidate, ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'].map((extension) => candidate + extension)]);
      const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) visit(resolved, rel);
      else unresolved.push({ importer: rel, reference: specifier, reason: 'unresolved-relative-import' });
    }
    function walk(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) dependency(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) dependency(argument.text);
        else manual.push({ file: rel, reason: 'Computed import/require requires manual resolution' });
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  for (const entry of entries) visit(path.resolve(root, entry));
  return { files: [...files].sort(), packages: [...packages].sort(), unresolved, manual,
    limits: ['Bare package imports and project aliases are reported, not traversed.', 'Implicit JSX runtimes are not inferred; an empty package list does not mean dependency-free.', 'CSS assets, global styles, runtime configuration and backend contracts require manual review.', 'A complete report does not prove target-project compatibility.'] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = process.argv[2];
  const catalog = JSON.parse(fs.readFileSync(path.join(repo, '_methodology/components/index.json'), 'utf8'));
  const component = catalog.components.find((row) => row.code === code);
  if (!component) { console.error('Supply a component code from the catalog, e.g. CMP-01'); process.exitCode = 1; }
  else {
    const report = inspectDependencies(repo, component.sourcePaths);
    console.log(JSON.stringify({ component: code, ...report }, null, 2));
    if (report.unresolved.length) process.exitCode = 1;
  }
}
