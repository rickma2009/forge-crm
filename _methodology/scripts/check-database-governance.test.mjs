import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const checker = path.join(root, '_methodology/scripts/check-database-governance.mjs');
const registryName = '_methodology/database-table-registry.json';
const schemaName = 'packages/server/prisma/schema.prisma';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-db-governance-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const registry = JSON.parse(fs.readFileSync(path.join(root, registryName), 'utf8'));
  const files = new Set([...fs.readFileSync(checker, 'utf8').matchAll(/'([^']+\.(?:md|json))'/g)].map((match) => match[1]));
  files.add(schemaName);
  for (const entry of registry.legacyExceptions) {
    if (entry.owner) files.add(entry.owner);
    if (entry.evidence) files.add(entry.evidence);
  }
  for (const name of files) {
    const source = path.join(root, name);
    if (!fs.existsSync(source)) continue;
    const target = path.join(directory, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  return {
    registry,
    writeRegistry() { fs.writeFileSync(path.join(directory, registryName), JSON.stringify(registry)); },
    changeSchema(change) { const file = path.join(directory, schemaName); fs.writeFileSync(file, change(fs.readFileSync(file, 'utf8'))); },
    run() {
      const result = spawnSync(process.execPath, [checker, directory], { encoding: 'utf8', timeout: 10000 });
      assert.ifError(result.error);
      return result;
    },
  };
}

test('current governance inputs pass without touching the real database', (t) => {
  const result = fixture(t).run();
  assert.equal(result.status, 0, result.stderr);
});

test('new legacy exceptions cannot disable or omit field checks', (t) => {
  const f = fixture(t);
  const entry = f.registry.legacyExceptions.find((row) => row.table === 'ai_analysis_task');
  for (const value of [false, undefined]) {
    entry.enforceFieldNaming = value;
    f.writeRegistry();
    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /新增遗留登记不得关闭字段命名检查: ai_analysis_task/);
  }
});

test('exceptions require an existing owner and evidence file', (t) => {
  const f = fixture(t);
  const entry = f.registry.legacyExceptions.find((row) => row.table === 'agent_task');
  entry.owner = 'missing-owner.ts'; entry.evidence = 'missing-evidence.md';
  f.writeRegistry();
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /引用不存在: missing-owner.ts/);
  assert.match(result.stderr, /引用不存在: missing-evidence.md/);
});

test('a valid domain prefix does not excuse an invalid migration target', (t) => {
  const f = fixture(t);
  const entry = f.registry.legacyExceptions.find((row) => row.table === 'agent_task');
  for (const target of ['sys_badName', `sys_${'a'.repeat(33)}`, 'agent_replacement']) {
    entry.target = target; f.writeRegistry();
    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /遗留整改目标必须采用批准前缀/);
  }
});

test('registered AI task exceptions retain physical field validation', (t) => {
  const f = fixture(t);
  f.changeSchema((schema) => schema.replace('model AiAnalysisTask {', 'model AiAnalysisTask {\n  invalidPhysicalField String?'));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ai_analysis_task.invalidPhysicalField/);
});
