import { isDeepStrictEqual } from 'node:util';
import { componentLibraryEntries } from './template-library.seed';

export function parseComponentSyncArgs(args: string[]) {
  const apply = args.includes('--apply');
  const rest = args.filter(value => value !== '--apply');
  if (args.filter(value => value === '--apply').length > 1 || rest.length !== 2 || rest[0] !== '--system' || !/^[a-zA-Z0-9_-]+$/.test(rest[1])) throw new Error('Usage: sync-component-library.ts --system <existing-system> [--apply]');
  return { systemCode: rest[1], apply };
}

export function planComponentSync(root: string, rows: Array<Record<string, unknown>>, systemCode: string) {
  return componentLibraryEntries(root).map(entry => {
    const matches = rows.filter(row => row.systemCode === systemCode && row.assetCode === entry.code);
    if (matches.length !== 1) throw new Error(`EXISTING_COMPONENT_REQUIRED:${entry.code}`);
    const before = matches[0];
    const fields = Object.entries(entry.data).filter(([key, value]) => !isDeepStrictEqual(before[key], value)).map(([key]) => key);
    return { ...entry, fields, id: String(before.id) };
  }).filter(entry => entry.fields.length > 0);
}

/** Compare every stored field except the exact code-owned updates and maintenance audit stamp. */
export function assertComponentSyncPreserved(before: Array<Record<string, unknown>>, after: Array<Record<string, unknown>>, plan: ReturnType<typeof planComponentSync>) {
  if (before.length !== after.length) throw new Error('CATALOG_ROW_COUNT_CHANGED');
  for (const row of before) {
    const updated = after.find(candidate => candidate.id === row.id);
    if (!updated) throw new Error('CATALOG_ROW_REMOVED');
    const entry = plan.find(candidate => candidate.id === row.id);
    const allowed = new Set(entry ? [...Object.keys(entry.data), 'updatedAt', 'updatedBy'] : []);
    const protectedFields = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([key]) => !allowed.has(key)));
    if (!isDeepStrictEqual(protectedFields(row), protectedFields(updated))) throw new Error(`CATALOG_PROTECTED_FIELD_CHANGED:${row.assetCode}`);
    if (entry && !Object.entries(entry.data).every(([key, value]) => isDeepStrictEqual(updated[key], value))) throw new Error(`CATALOG_UPDATE_MISMATCH:${entry.code}`);
  }
}
