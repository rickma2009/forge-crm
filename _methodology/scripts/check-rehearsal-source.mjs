import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** Compares recorded files only. Matching hashes do not revalidate runtime behavior. */
export function checkRecordedSources(directory, record) {
  const invalid = [], stale = [], seen = new Set();
  if (!Array.isArray(record?.sources) || record.sources.length === 0) return { status: 'INVALID', invalid: ['Missing non-empty sources array'], stale };
  const canonicalRoot = fs.realpathSync(directory);
  for (const row of record.sources) {
    if (!row || typeof row.source !== 'string' || !/^[a-f0-9]{64}$/.test(row.sha256 ?? '')) { invalid.push('Invalid source path or SHA-256'); continue; }
    const file = path.resolve(directory, row.source), relative = path.relative(directory, file);
    if (path.isAbsolute(row.source) || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) { invalid.push(`Outside repository: ${row.source}`); continue; }
    if (seen.has(relative)) { invalid.push(`Duplicate source: ${row.source}`); continue; }
    seen.add(relative);
    if (!fs.existsSync(file)) { stale.push({ source: row.source, reason: 'missing' }); continue; }
    const canonical = fs.realpathSync(file), actualRelative = path.relative(canonicalRoot, canonical);
    if (actualRelative === '..' || actualRelative.startsWith(`..${path.sep}`) || path.isAbsolute(actualRelative) || !fs.statSync(canonical).isFile()) { invalid.push(`Invalid source file: ${row.source}`); continue; }
    const actual = createHash('sha256').update(fs.readFileSync(canonical)).digest('hex');
    if (actual !== row.sha256) stale.push({ source: row.source, reason: 'changed', recorded: row.sha256, actual });
  }
  return { status: invalid.length ? 'INVALID' : stale.length ? 'STALE' : 'MATCH', checkedFiles: seen.size, invalid, stale };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const records = process.argv.slice(2);
  if (!records.length) { console.error('Usage: node check-rehearsal-source.mjs <verification.json> [...]'); process.exitCode = 1; }
  for (const recordPath of records) {
    try {
      const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
      const result = checkRecordedSources(root, record);
      console.log(JSON.stringify({ record: recordPath, ...result, scope: 'recorded-source-bytes-only' }));
      if (result.status !== 'MATCH') process.exitCode = 1;
    } catch (error) { console.error(`${recordPath}: ${error.message}`); process.exitCode = 1; }
  }
}
