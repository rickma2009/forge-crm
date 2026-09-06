import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

test('generator reports the actual generated catalog path', () => {
  const result = spawnSync(process.execPath, ['scripts/generate-pattern-projection.mjs'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'WROTE packages/web/src/catalog/patterns.data.json');
});
