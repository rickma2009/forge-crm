import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../../', import.meta.url));
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-export-adoption-'));
const source = 'packages/web/src/common/data-grid/csv-export.ts';
const bytes = fs.readFileSync(path.join(root, source));
fs.writeFileSync(path.join(target, 'csv-export.ts'), bytes);
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({ type: 'module', private: true }));
fs.writeFileSync(path.join(target, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM'], types: [], strict: true, outDir: 'lib' }, files: ['csv-export.ts'] }));
const compiler = path.join(root, 'packages/web/node_modules/typescript/bin/tsc');
const build = spawnSync(process.execPath, [compiler, '-p', path.join(target, 'tsconfig.json')], { cwd: target, encoding: 'utf8', timeout: 30000 });
fs.writeFileSync(path.join(target, 'compile.log'), (build.stdout ?? '') + (build.stderr ?? ''));
assert.equal(build.status, 0, `Independent TypeScript compilation failed: ${target}/compile.log`);
assert(!fs.existsSync(path.join(target, 'node_modules')));
const { createCsvBlob, csvCell } = await import(pathToFileURL(path.join(target, 'lib/csv-export.js')));
const rows = [['名称', '数量'], ['中文,"引用"\n下一行', '8.0000'], ['\t=1+1', null]];
const original = JSON.stringify(rows);
const blob = createCsvBlob(rows), result = new Uint8Array(await blob.arrayBuffer());
assert.equal(blob.type, 'text/csv;charset=utf-8');
assert.deepEqual([...result.slice(0, 3)], [239, 187, 191]);
assert.equal(new TextDecoder().decode(result), '"名称","数量"\r\n"中文,""引用""\n下一行","8.0000"\r\n"\'\t=1+1",""');
assert.equal(csvCell(undefined), '""');
assert.equal(JSON.stringify(rows), original);
const hash = value => createHash('sha256').update(value).digest('hex');
const record = { createdAt: new Date().toISOString(), utility: 'csv-export', nodeVersion: process.version,
  typescriptVersion: JSON.parse(fs.readFileSync(path.join(root, 'packages/web/node_modules/typescript/package.json'))).version,
  sources: [source, '_methodology/scripts/rehearse-csv-export.mjs'].map(source => ({ source, sha256: hash(fs.readFileSync(path.join(root, source))) })),
  isolatedDirectory: target, targetHasNodeModules: false, buildExitCode: build.status, outputSha256: hash(result),
  checks: ['copied-source-compilation', 'UTF-8-BOM', 'exact-CSV-bytes', 'input-unchanged', 'native-Blob'],
  limitations: ['Compiler reused from source workspace; target installs no packages.', 'Node native Blob check only; no browser download or spreadsheet application verification.', 'Current text-prefix policy is not a universal formula safety guarantee.'] };
fs.writeFileSync(path.join(target, 'result.json'), JSON.stringify(record, null, 2));
console.log(`PASS standalone CSV utility; evidence: ${target}`);
