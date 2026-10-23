import { resolve } from 'node:path';
import { componentLibraryEntries } from './template-library.seed';
import { assertComponentSyncPreserved, parseComponentSyncArgs, planComponentSync } from './component-library-maintenance';

const root = resolve(process.cwd(), '../..');
const rows = () => componentLibraryEntries(root).map((entry, index) => ({ id: String(index), systemCode: 'demo', assetCode: entry.code, ...entry.data, status: 'WIP', maturity: 'candidate', evidenceJson: ['human-review'], updatedBy: 'reviewer', updatedAt: new Date('2026-10-01') }));

describe('component catalog maintenance', () => {
  it('defaults to preview and requires an explicit existing-system argument', () => {
    expect(parseComponentSyncArgs(['--system', 'demo'])).toEqual({ systemCode: 'demo', apply: false });
    expect(parseComponentSyncArgs(['--system', 'demo', '--apply'])).toEqual({ systemCode: 'demo', apply: true });
    for (const args of [[], ['--apply'], ['--system', 'demo', '--all'], ['--system', 'demo', '--apply', '--apply']]) expect(() => parseComponentSyncArgs(args)).toThrow('Usage:');
  });
  it('plans only changed source fields without mutating stored records or review state', () => {
    const before = rows(); expect(planComponentSync(root, before, 'demo')).toEqual([]);
    before[0].description = 'old description';
    const snapshot = structuredClone(before), plan = planComponentSync(root, before, 'demo');
    expect(plan).toHaveLength(1); expect(plan[0].fields).toEqual(['description']);
    expect(before).toEqual(snapshot); expect(plan[0].data).not.toHaveProperty('evidenceJson');
  });
  it('refuses missing registrations instead of silently initializing or inventing review state', () => {
    expect(() => planComponentSync(root, rows().slice(1), 'demo')).toThrow('EXISTING_COMPONENT_REQUIRED:CMP-01');
    expect(() => planComponentSync(root, rows(), 'other')).toThrow('EXISTING_COMPONENT_REQUIRED');
  });
  it('accepts exact source updates but rejects review or unrelated-record changes', () => {
    const before: Array<Record<string, unknown>> = rows(); before[0].description = 'old';
    before.push({ id: 'other', systemCode: 'other', assetCode: 'CMP-01', note: 'keep' });
    before.push({ id: 'template', systemCode: 'demo', assetCode: 'TPL-01-01', note: 'keep' });
    const plan = planComponentSync(root, before, 'demo');
    const after = before.map(row => ({ ...row })); Object.assign(after[0], plan[0].data, { updatedBy: 'maintenance', updatedAt: new Date() });
    expect(() => assertComponentSyncPreserved(before, after, plan)).not.toThrow();
    for (const [index, key, value] of [[0, 'evidenceJson', []], [0, 'status', 'DONE'], [0, 'maturity', 'verified'], [15, 'note', 'changed'], [16, 'note', 'changed']] as const) {
      const broken = after.map(row => ({ ...row })); broken[index][key] = value;
      expect(() => assertComponentSyncPreserved(before, broken, plan)).toThrow('CATALOG_PROTECTED_FIELD_CHANGED');
    }
    after[0].description = 'wrong';
    expect(() => assertComponentSyncPreserved(before, after, plan)).toThrow('CATALOG_UPDATE_MISMATCH');
  });
});
