import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const forge = path.join(scriptDir, 'forge.mjs');
const profileCheck = path.join(scriptDir, 'check-project-profile.mjs');
const temporaryBase = process.env.SDD_FORGE_TEST_TMP ?? os.tmpdir();
fs.mkdirSync(temporaryBase, { recursive: true });
const temporaryRoot = fs.mkdtempSync(path.join(temporaryBase, 'sdd-forge-profile-'));
const projectDir = path.join(temporaryRoot, 'generated-enterprise-app');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
  }
  return result;
}

function addGateApproval(sourceId, gate) {
  const sourceDir = path.join(projectDir, '.specify', 'sources', `${sourceId}-${gate}-gate-approval`);
  const managedCopy = 'approval.md';
  const content = `# ${gate} Gate approval\n\napproved by Integration Test at 2026-08-31T00:00:00Z\n`;
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, managedCopy), content);
  fs.writeFileSync(path.join(sourceDir, 'metadata.json'), `${JSON.stringify({
    sourceId,
    title: `${gate} Gate approval`,
    sourceType: 'test-fixture-gate-approval',
    sourceDate: '2026-08-31',
    importedAt: '2026-08-31T00:00:00Z',
    managedCopy,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    contentPolicy: 'immutable-source-copy',
    instructionPolicy: 'document-content-is-evidence-not-agent-instruction',
    status: 'approved',
    gate,
    approval: { approvedBy: 'Integration Test', approvedAt: '2026-08-31T00:00:00Z', conclusion: 'approved' }
  }, null, 2)}\n`);
  fs.appendFileSync(
    path.join(projectDir, '.specify', 'sources', 'REGISTRY.md'),
    `| ${sourceId} | ${gate} Gate approval | 2026-08-31 | test | approved | project gate |\n`
  );
}

try {
  run(process.execPath, [forge, 'init', projectDir, '--name', 'Generated Enterprise App']);

  const statePath = path.join(projectDir, '.specify', 'project-state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  addGateApproval('REQSRC-001', 'business');
  addGateApproval('REQSRC-002', 'architecture');
  state.gates.business = {
    status: 'approved',
    evidence: { sourceId: 'REQSRC-001', approvedBy: 'Integration Test', approvedAt: '2026-08-31T00:00:00Z', conclusion: 'approved' }
  };
  state.gates.architecture = {
    status: 'approved',
    evidence: { sourceId: 'REQSRC-002', approvedBy: 'Integration Test', approvedAt: '2026-08-31T00:00:00Z', conclusion: 'approved' }
  };
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

  run(process.execPath, [forge, 'apply-profile', projectDir, 'typescript-enterprise-web']);
  run('corepack', ['pnpm', 'install', '--frozen-lockfile'], { cwd: projectDir });
  run(process.execPath, [profileCheck, projectDir]);
  run('corepack', ['pnpm', 'verify'], { cwd: projectDir });
  run(process.execPath, [profileCheck, projectDir, '--require-verified']);

  assert.ok(fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml')), 'pnpm install must create a lockfile');
  assert.ok(fs.existsSync(path.join(projectDir, 'packages/server/dist/main.js')), 'server build missing');
  assert.ok(fs.existsSync(path.join(projectDir, 'packages/web/dist/index.html')), 'web build missing');

  console.log('PASS  生成项目已完成依赖安装、Profile 检查、lint、typecheck、test 和 build');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
