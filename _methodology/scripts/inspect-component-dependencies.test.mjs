import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectDependencies } from './inspect-component-dependencies.mjs';

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'component-deps-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
  return root;
}
test('follows re-exports, literal lazy imports, styles and cycles; reports packages', (t) => {
  const root = fixture(t, { 'main.tsx': "import React from 'react'; import './style.css'; export * from './part'; const load=()=>import('./lazy');", 'part.ts': "export * from './main'; import type {X} from '@forge-crm/contracts';", 'lazy.ts': 'export const value=1;', 'style.css': ':root { color:red; }' });
  const result = inspectDependencies(root, ['main.tsx']);
  assert.deepEqual(result.files, ['lazy.ts', 'main.tsx', 'part.ts', 'style.css']);
  assert.deepEqual(result.packages, ['@forge-crm/contracts', 'react']);
  assert.equal(result.unresolved.length, 0);
  assert.match(result.manual[0].reason, /CSS/);
});
test('does not claim computed or missing dependencies are complete', (t) => {
  const root = fixture(t, { 'main.ts': "import './missing'; const load=(name:string)=>import(name);" });
  const result = inspectDependencies(root, ['main.ts']);
  assert.equal(result.unresolved[0].reference, './missing');
  assert.match(result.manual[0].reason, /Computed/);
});
test('refuses entry paths outside the source root', (t) => {
  const root = fixture(t, {});
  assert.equal(inspectDependencies(root, ['../outside.ts']).unresolved[0].reason, 'outside-root');
});
