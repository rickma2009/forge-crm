import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { exportComponentSource } from './export-component-source.mjs';

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'component-export-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'repo'); fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'entry.ts'), "import './theme.css'; export const value=1;");
  fs.writeFileSync(path.join(root, 'theme.css'), ':root {color:red;}');
  return { root, directory, target: path.join(directory, 'output'), component: { code: 'EXAMPLE', name: 'Example', sourcePaths: ['entry.ts'] } };
}
test('exports transitive sources with independently verifiable content hashes', (t) => {
  const { root, component, target } = setup(t);
  const manifest = exportComponentSource(root, component, target);
  assert.equal(manifest.files.length, 2);
  for (const file of manifest.files) {
    const bytes = fs.readFileSync(path.join(target, file.destination));
    assert.deepEqual(bytes, fs.readFileSync(path.join(root, file.source)));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
  }
  assert.equal(manifest.status, 'source-snapshot-not-adoption');
  assert.equal(manifest.manualReview.length, 1);
});
test('does not overwrite an existing output directory', (t) => {
  const { root, component, target } = setup(t);
  fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'user-work'), 'keep');
  assert.throws(() => exportComponentSource(root, component, target), /EEXIST/);
  assert.equal(fs.readFileSync(path.join(target, 'user-work'), 'utf8'), 'keep');
});
test('missing imports abort before creating output', (t) => {
  const { root, component, target } = setup(t);
  fs.unlinkSync(path.join(root, 'theme.css'));
  assert.throws(() => exportComponentSource(root, component, target), /Unresolved/);
  assert.equal(fs.existsSync(target), false);
});
test('refuses source symlinks pointing outside the repository', (t) => {
  const { root, directory, component, target } = setup(t);
  const external = path.join(directory, 'private.css'); fs.writeFileSync(external, 'private');
  fs.unlinkSync(path.join(root, 'theme.css')); fs.symlinkSync(external, path.join(root, 'theme.css'));
  assert.throws(() => exportComponentSource(root, component, target), /escapes repository/);
  assert.equal(fs.existsSync(target), false);
});

test('CMP-08 snapshot includes the public entry and hook required by its documented integration', t => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, '_methodology/components/index.json'), 'utf8'));
  const component = catalog.components.find(row => row.code === 'CMP-08');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'route-tabs-export-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const target = path.join(directory, 'snapshot');
  const manifest = exportComponentSource(root, component, target);
  for (const name of ['index.ts', 'RouteTabs.tsx', 'useRouteTabs.ts', 'model.ts', 'route-tabs.css', 'README.md']) {
    const source = `packages/web/src/common/route-tabs/${name}`;
    const exported = manifest.files.find(file => file.source === source);
    assert.ok(exported, `Documented integration needs ${source}`);
    assert.equal(fs.readFileSync(path.join(target, exported.destination), 'utf8'), fs.readFileSync(path.join(root, source), 'utf8'));
  }
});
test('generic drawer export excludes Agent styles while Agent export includes its owned CSS', t => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, '_methodology/components/index.json'), 'utf8'));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'drawer-ownership-export-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const common = exportComponentSource(root, catalog.components.find(row => row.code === 'CMP-11'), path.join(directory, 'common'));
  const business = exportComponentSource(root, catalog.components.find(row => row.code === 'CMP-15'), path.join(directory, 'business'));
  assert.equal(common.files.length, 2);
  assert(common.files.every(row => !row.source.includes('/agent/')));
  const commonCss = common.files.find(row => row.source.endsWith('drawer-workspace.css'));
  assert(!fs.readFileSync(path.join(directory, 'common', commonCss.destination), 'utf8').includes('.agent-'));
  const businessCss = business.files.find(row => row.source.endsWith('/agent-assistant-drawer.css'));
  assert(businessCss, 'Business consumer must export the CSS it explicitly imports');
  assert.equal(fs.readFileSync(path.join(directory, 'business', businessCss.destination), 'utf8'), fs.readFileSync(path.join(root, businessCss.source), 'utf8'));
});
