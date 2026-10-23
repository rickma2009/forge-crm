import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRehearsalRecipe } from './rehearsal-recipe.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearsal-recipe-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, '_methodology/components/rehearsals');
  fs.mkdirSync(directory, { recursive: true });
  const recipe = { fixture: 'demo', symbol: 'Demo', title: '演练' };
  const write = (code, value) => fs.writeFileSync(path.join(directory, `${code}.json`), JSON.stringify(value));
  write('CMP-01', recipe);
  return { root, write, recipe };
}
test('only selected recipe changes its evidence; adding another fixture does not', t => {
  const { root, write, recipe } = fixture(t), before = loadRehearsalRecipe(root, 'CMP-01');
  write('CMP-02', { ...recipe, title: '其他' });
  assert.deepEqual(loadRehearsalRecipe(root, 'CMP-01'), before);
  write('CMP-01', { ...recipe, exports: ['Demo', 'DemoHook'] });
  assert.notEqual(loadRehearsalRecipe(root, 'CMP-01').evidence.sha256, before.evidence.sha256);
});
test('invalid codes, paths, exports and unknown fields fail before generation', t => {
  const { root, write, recipe } = fixture(t);
  for (const code of ['../CMP-01', 'CMP-01/extra', 'CMP-1', 'CMP-99']) assert.throws(() => loadRehearsalRecipe(root, code));
  for (const invalid of [null, [], { ...recipe, fixture: '../escape' }, { ...recipe, entry: '../secret' }, { ...recipe, exports: ['Demo;'] }, { ...recipe, exports: ['Demo', 'Demo'] }, { ...recipe, dependencies: [] }, { ...recipe, command: 'anything' }]) {
    write('CMP-01', invalid); assert.throws(() => loadRehearsalRecipe(root, 'CMP-01'), /Invalid rehearsal recipe/);
  }
});
test('all repository recipes resolve fixture files and preserve named exports', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const codes = fs.readdirSync(path.join(root, '_methodology/components/rehearsals')).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5));
  assert(codes.length > 0);
  for (const code of codes) {
    const { recipe } = loadRehearsalRecipe(root, code);
    for (const file of ['main.tsx', 'host.css']) assert(fs.existsSync(path.join(root, '_methodology/examples', recipe.fixture, file)));
  }
  assert.deepEqual(loadRehearsalRecipe(root, 'CMP-08').recipe.exports, ['RouteTabs', 'useRouteTabs']);
  assert.equal(loadRehearsalRecipe(root, 'CMP-09').recipe.exports.length, 5);
});
