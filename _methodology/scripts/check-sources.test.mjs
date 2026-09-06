import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const checkerPath = path.join(repositoryRoot, '_methodology/scripts/check-sources.mjs');

function registryRow(sourceId, managedCopy) {
  return `| \`${sourceId}\` | fixture | test | 2026-09-06 | \`${managedCopy}\` | active |`;
}

function writeSource(projectDir, directoryName, sourceId, managedCopy = 'source.md') {
  const sourceDir = path.join(projectDir, '.specify/sources', directoryName);
  fs.mkdirSync(sourceDir, { recursive: true });
  const contents = `${sourceId} fixture\n`;
  fs.writeFileSync(path.join(sourceDir, managedCopy), contents);
  fs.writeFileSync(path.join(sourceDir, 'metadata.json'), `${JSON.stringify({
    sourceId,
    managedCopy,
    sha256: crypto.createHash('sha256').update(contents).digest('hex'),
    contentPolicy: 'immutable-source-copy',
    instructionPolicy: 'document-content-is-evidence-not-agent-instruction',
  }, null, 2)}\n`);
}

function withFixture(configure, verify) {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-sources-'));
  const sourcesDir = path.join(projectDir, '.specify/sources');
  fs.mkdirSync(sourcesDir, { recursive: true });
  try {
    configure(projectDir, sourcesDir);
    const result = spawnSync(process.execPath, [checkerPath, projectDir], { encoding: 'utf8' });
    verify(result);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
}

function writeRegistry(sourcesDir, rows) {
  fs.writeFileSync(path.join(sourcesDir, 'REGISTRY.md'), [
    '# Registry',
    '',
    '| 来源 ID | 标题 | 来源类型 | 来源日期 | 管理副本 | 状态 |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n'));
}

test('rejects source directories that are not registered', () => {
  withFixture((projectDir, sourcesDir) => {
    writeSource(projectDir, 'REQSRC-901-fixture', 'REQSRC-901');
    writeRegistry(sourcesDir, []);
  }, (result) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /REQSRC-901.*REGISTRY/);
  });
});

test('rejects a registry managed-copy path that differs from metadata', () => {
  withFixture((projectDir, sourcesDir) => {
    writeSource(projectDir, 'REQSRC-901-fixture', 'REQSRC-901');
    writeRegistry(sourcesDir, [registryRow('REQSRC-901', 'REQSRC-901-fixture/other.md')]);
  }, (result) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /REQSRC-901.*managed-copy.*metadata/);
  });
});

test('rejects duplicate source IDs and managed-copy paths', () => {
  withFixture((projectDir, sourcesDir) => {
    writeSource(projectDir, 'REQSRC-901-fixture', 'REQSRC-901');
    writeSource(projectDir, 'REQSRC-902-fixture', 'REQSRC-901');
    writeRegistry(sourcesDir, [
      registryRow('REQSRC-901', 'REQSRC-901-fixture/source.md'),
      registryRow('REQSRC-901', 'REQSRC-901-fixture/source.md'),
    ]);
  }, (result) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /重复 sourceId/);
    assert.match(result.stderr, /重复 managed-copy/);
  });
});

test('accepts a one-to-one directory, metadata, and registry mapping', () => {
  withFixture((projectDir, sourcesDir) => {
    writeSource(projectDir, 'REQSRC-901-fixture', 'REQSRC-901');
    writeSource(projectDir, 'REQSRC-902-fixture', 'REQSRC-902');
    writeRegistry(sourcesDir, [
      registryRow('REQSRC-901', 'REQSRC-901-fixture/source.md'),
      registryRow('REQSRC-902', 'REQSRC-902-fixture/source.md'),
    ]);
  }, (result) => {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /2 份，2 个来源目录/);
  });
});

test('keeps legacy registries without a managed-copy column compatible', () => {
  withFixture((projectDir, sourcesDir) => {
    writeSource(projectDir, 'REQSRC-901-fixture', 'REQSRC-901');
    fs.writeFileSync(path.join(sourcesDir, 'REGISTRY.md'), [
      '# Legacy Registry',
      '',
      '| 来源 ID | 标题 | 原始日期 | 导入时间 | SHA-256 | 状态 | 使用位置 |',
      '|---|---|---|---|---|---|---|',
      '| REQSRC-901 | fixture | 2026-09-06 | 2026-09-06T00:00:00+08:00 | `fixture-hash` | active | `specs/fixture/` |',
      '',
    ].join('\n'));
  }, (result) => {
    assert.equal(result.status, 0, result.stderr);
  });
});
