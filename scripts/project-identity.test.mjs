import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(read(path));

test('all workspace packages use the Forge CRM identity', () => {
  assert.equal(json('package.json').name, 'forge-crm');
  assert.equal(json('packages/contracts/package.json').name, '@forge-crm/contracts');
  assert.equal(json('packages/server/package.json').name, '@forge-crm/server');
  assert.equal(json('packages/web/package.json').name, '@forge-crm/web');
  assert.equal(json('packages/tsconfig/package.json').name, '@forge-crm/tsconfig');
});

test('active code and configuration no longer use the retired npm scope', () => {
  const roots = ['package.json', 'pnpm-lock.yaml', 'packages', 'scripts', '.github'];
  const extensions = new Set(['.json', '.mjs', '.ts', '.tsx', '.yml', '.yaml']);
  const files = [];

  const visit = (path) => {
    const absolute = new URL(path, root);
    if (!existsSync(absolute)) return;
    const statEntries = readdirSync(absolute, { withFileTypes: true });
    for (const entry of statEntries) {
      if (['dist', 'node_modules'].includes(entry.name)) continue;
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(`${child}/`);
      else if (extensions.has(extname(entry.name))) files.push(child);
    }
  };

  for (const path of roots) {
    if (path.endsWith('.json') || path.endsWith('.yaml')) files.push(path);
    else visit(`${path}/`);
  }

  const retiredScope = `@${['interaction', 'pattern', 'lab'].join('-')}/`;
  const offenders = files.filter((path) => path !== 'scripts/project-identity.test.mjs' && read(path).includes(retiredScope));
  assert.deepEqual(offenders, [], `retired npm scope remains in: ${offenders.join(', ')}`);
});

test('workflow and database compatibility are explicit', () => {
  assert.equal(existsSync(new URL('.github/workflows/forge-crm.yml', root)), true);
  assert.equal(existsSync(new URL('.github/workflows/interaction-pattern-lab.yml', root)), false);
  assert.match(read('compose.yaml'), /^name:\s*interaction-pattern-lab\s*$/m);
  assert.match(read('start.sh'), /db_container=interaction-pattern-lab-postgres-1/);
});
