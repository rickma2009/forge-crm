import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRecordedSources } from './check-rehearsal-source.mjs';

// Read-only inventory: record presence and byte equality are not runtime validation.
export function inventoryEvidence(root) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, '_methodology/components/index.json'), 'utf8'));
  const components = catalog.components.map(({ code, name }) => ({ code, name, records: [] }));
  const byCode = new Map(components.map(component => [component.code, component]));
  const unassigned = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(file); continue; }
      if (!entry.isFile() || !entry.name.endsWith('verification.json')) continue;
      const row = { record: path.relative(root, file).split(path.sep).join('/') };
      let component;
      try {
        const record = JSON.parse(fs.readFileSync(file, 'utf8'));
        component = record.component;
        Object.assign(row, { declaredComponent: component ?? null, ...checkRecordedSources(root, record) });
      } catch (error) {
        Object.assign(row, { status: 'INVALID', invalid: [error.message], stale: [] });
      }
      if (byCode.has(component)) byCode.get(component).records.push(row);
      else unassigned.push({ ...row, association: component ? 'UNKNOWN_COMPONENT' : 'MISSING_COMPONENT' });
    }
  }
  visit(path.join(root, '_methodology/examples'));
  return {
    scope: 'Persisted *verification.json files under _methodology/examples; recorded source bytes only. No tests rerun, no maturity decision, no evidence files rewritten.',
    components: components.map(component => ({ ...component, evidence: component.records.length ? 'RECORDED' : 'NO_ASSOCIATED_RECORD' })),
    unassigned,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: node _methodology/scripts/component-evidence-inventory.mjs');
    console.log(JSON.stringify(inventoryEvidence(fileURLToPath(new URL('../../', import.meta.url))), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
