import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inventoryEvidence } from './component-evidence-inventory.mjs';

test('lists all records and missing components without rewriting or selecting a winning record', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'component-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const examples = path.join(root, '_methodology/examples/nested');
  fs.mkdirSync(examples, { recursive: true });
  fs.mkdirSync(path.join(root, '_methodology/components'));
  fs.writeFileSync(path.join(root, '_methodology/components/index.json'), JSON.stringify({ components: [{ code: 'CMP-01', name: 'One' }, { code: 'CMP-02', name: 'Two' }] }));
  fs.writeFileSync(path.join(root, 'source.ts'), 'original');
  const record = { component: 'CMP-01', sources: [{ source: 'source.ts', sha256: createHash('sha256').update('original').digest('hex') }] };
  const samples = {
    'a-verification.json': record,
    'b-verification.json': { ...record, sources: [{ ...record.sources[0], sha256: '0'.repeat(64) }] },
    'legacy-verification.json': { sources: record.sources },
    'unknown-verification.json': { ...record, component: 'CMP-99' },
  };
  for (const [name, value] of Object.entries(samples)) fs.writeFileSync(path.join(examples, name), JSON.stringify(value));
  fs.writeFileSync(path.join(examples, 'broken-verification.json'), '{');
  fs.writeFileSync(path.join(examples, 'ignored.json'), '{');
  const result = inventoryEvidence(root);
  assert.deepEqual(result.components[0].records.map(row => row.status), ['MATCH', 'STALE']);
  assert.equal(result.components[1].evidence, 'NO_ASSOCIATED_RECORD');
  assert.equal(result.unassigned.length, 3);
  assert.equal(result.unassigned.find(row => row.record.includes('broken')).status, 'INVALID');
  assert.equal(result.unassigned.find(row => row.record.includes('legacy')).association, 'MISSING_COMPONENT');
  assert.equal(result.unassigned.find(row => row.record.includes('unknown')).association, 'UNKNOWN_COMPONENT');
  for (const [name, value] of Object.entries(samples)) assert.equal(fs.readFileSync(path.join(examples, name), 'utf8'), JSON.stringify(value));
  assert.deepEqual(inventoryEvidence(root), result);
});
