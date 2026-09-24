import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Real shell entrypoint, isolated from Docker, GUI and long-running dev processes.
function run(mode = '') {
  const dir = mkdtempSync(join(tmpdir(), 'forge-start-test-'));
  try {
    mkdirSync(join(dir, 'bin'));
    mkdirSync(join(dir, 'node_modules'));
    copyFileSync(new URL('../start.sh', import.meta.url), join(dir, 'start.sh'));
    if (mode !== 'env-missing') writeFileSync(join(dir, '.env'), 'PORT=3000\n');
    writeFileSync(join(dir, 'calls'), '');
    const stub = `#!/bin/bash
name="$(basename "$0")"
echo "$name $*" >> "$CASE_DIR/calls"
case "$name" in
  sleep) exit 0 ;;
  open) touch "$CASE_DIR/docker-ready" ;;
  lsof) [ "$CASE_MODE" = port-busy ] ;;
  pnpm) echo DEV_STARTED ;;
  docker)
    case "$1" in
      info) [ "$CASE_MODE" != docker-timeout ] && { [ "$CASE_MODE" != docker-cold ] || [ -f "$CASE_DIR/docker-ready" ]; } ;;
      inspect) [ "$CASE_MODE" != container-missing ] ;;
      start) [ "$CASE_MODE" != start-failed ] && touch "$CASE_DIR/db-running" ;;
      exec) [ "$CASE_MODE" != db-timeout ] && { [ "$CASE_MODE" = already-running ] || [ -f "$CASE_DIR/db-running" ]; } ;;
      *) exit 99 ;;
    esac ;;
  *) exit 99 ;;
esac
`;
    for (const command of ['docker', 'open', 'pnpm', 'sleep', 'lsof']) {
      writeFileSync(join(dir, 'bin', command), stub, { mode: 0o755 });
    }
    const result = spawnSync('bash', [join(dir, 'start.sh')], {
      cwd: tmpdir(), encoding: 'utf8', timeout: 10000,
      env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, CASE_DIR: dir, CASE_MODE: mode },
    });
    return { ...result, calls: readFileSync(join(dir, 'calls'), 'utf8') };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

for (const mode of ['', 'already-running', 'docker-cold']) {
  test(`starts existing database and dev environment: ${mode || 'stopped'}`, () => {
    const result = run(mode);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /DEV_STARTED/);
    assert.match(result.calls, /docker start interaction-pattern-lab-postgres-1/);
    assert.doesNotMatch(result.calls, /compose|seed|migrate|reset|prune/);
    assert.ok(result.calls.indexOf('docker start ') < result.calls.indexOf('pnpm dev'));
  });
}
for (const mode of ['container-missing', 'start-failed', 'docker-timeout', 'db-timeout', 'env-missing', 'port-busy']) {
  test(`fails safely without launching dev: ${mode}`, () => {
    const result = run(mode);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /DEV_STARTED/);
    assert.doesNotMatch(result.calls, /compose|seed|migrate|reset|prune/);
    assert.ok((result.stdout + result.stderr).trim());
  });
}
