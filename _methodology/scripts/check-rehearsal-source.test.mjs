import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { checkRecordedSources } from './check-rehearsal-source.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearsal-source-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'main.ts'), 'original');
  return { root, record: { sources: [{ source: 'main.ts', sha256: createHash('sha256').update('original').digest('hex') }] } };
}
test('matches original bytes and identifies modified source without changing evidence', (t) => {
  const { root, record } = fixture(t), before = JSON.stringify(record);
  assert.equal(checkRecordedSources(root, record).status, 'MATCH');
  fs.writeFileSync(path.join(root, 'main.ts'), 'changed');
  const result = checkRecordedSources(root, record);
  assert.equal(result.status, 'STALE'); assert.equal(result.stale[0].reason, 'changed');
  assert.equal(JSON.stringify(record), before);
});
test('missing files are stale, malformed or empty records are invalid', (t) => {
  const { root, record } = fixture(t);
  fs.unlinkSync(path.join(root, 'main.ts'));
  assert.equal(checkRecordedSources(root, record).stale[0].reason, 'missing');
  for (const invalid of [{}, { sources: [] }, { sources: [{ source: 'main.ts', sha256: 'bad' }] }]) assert.equal(checkRecordedSources(root, invalid).status, 'INVALID');
});
test('duplicate and outside-root source paths cannot be accepted', (t) => {
  const { root, record } = fixture(t);
  assert.equal(checkRecordedSources(root, { sources: [...record.sources, ...record.sources] }).status, 'INVALID');
  assert.equal(checkRecordedSources(root, { sources: [{ ...record.sources[0], source: '../outside' }] }).status, 'INVALID');
});
