import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('./check-markdown-links.mjs', import.meta.url));
function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'training-links-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content);
  }
  return spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
}

test('follows local file links from training through evidence and methodology', t => {
  const result = fixture(t, {
    'README.md': '[培训](docs/training/README.md)',
    'docs/training/README.md': '[案例](cases/query.md)',
    'docs/training/cases/query.md': '[证据](../../testing/query.md) [模板](../../../_methodology/template.md)',
    'docs/testing/query.md': '[源码](../../src/query.ts)',
    '_methodology/template.md': '模板', 'src/query.ts': 'export {};',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /5 个文件/);
});

for (const directory of ['docs/training/cases', 'docs/testing']) {
  test(`rejects a missing target referenced inside ${directory}`, t => {
    const result = fixture(t, { [`${directory}/broken.md`]: '[验收](missing-evidence.md)' });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(`${directory}/broken.md -> missing-evidence.md`));
  });
}

test('skips remote links and anchors without claiming they were verified', t => {
  const result = fixture(t, { 'docs/training/README.md': '[网站](https://example.invalid/no-page) [段落](#missing-heading)' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /不检查锚点和远程地址/);
});
