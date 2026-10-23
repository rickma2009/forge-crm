import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const forge = path.join(scriptDir, 'forge.mjs');
const checkProject = path.join(scriptDir, 'check-project.sh');
const checkMattSetup = path.join(scriptDir, 'check-matt-setup.mjs');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-forge-init-'));
const projectDir = path.join(temporaryRoot, 'sample-project');

function addGateApproval(project, sourceId, gate) {
  const sourceDir = path.join(project, '.specify', 'sources', `${sourceId}-${gate}-gate-approval`);
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
    path.join(project, '.specify', 'sources', 'REGISTRY.md'),
    `| ${sourceId} | ${gate} Gate approval | 2026-08-31 | test | approved | project gate |\n`
  );
}

try {
  execFileSync(process.execPath, [forge, 'init', projectDir, '--name', 'Sample Enterprise App'], { stdio: 'pipe' });

  for (const expected of [
    'README.md',
    'AGENTS.md',
    'CLAUDE.md',
    'CONTEXT.md',
    'docs/agents/issue-tracker.md',
    'docs/agents/triage-labels.md',
    'docs/agents/domain.md',
    '.sdd-forge.json',
    '.specify/project-state.json',
    '.specify/memory/project-charter.md',
    '.specify/memory/business-context.md',
    '.specify/memory/constitution.md',
    '.specify/sources/REGISTRY.md'
  ]) {
    assert.ok(fs.existsSync(path.join(projectDir, expected)), `missing ${expected}`);
  }
  assert.equal(fs.readlinkSync(path.join(projectDir, 'CLAUDE.md')), 'AGENTS.md');
  assert.equal(fs.existsSync(path.join(projectDir, '_spec')), false);
  const generatedCharter = fs.readFileSync(path.join(projectDir, '.specify/memory/project-charter.md'), 'utf8');
  const generatedAgentRules = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(generatedCharter, /复用与团队学习目标/);
  assert.match(generatedCharter, /是否以跨项目复用或团队培训为目标/);
  assert.match(generatedAgentRules, /项目章程明确追求跨项目复用或团队培训/);
  assert.match(fs.readFileSync(path.join(scriptDir, '../templates/project-charter-template.md'), 'utf8'), /采用、培训成效与规范迭代的证据/);
  execFileSync('bash', [checkProject, projectDir], { stdio: 'pipe' });
  execFileSync(process.execPath, [checkMattSetup, projectDir, '--require-git'], { stdio: 'pipe' });
  assert.equal(execFileSync('git', ['-C', projectDir, 'branch', '--show-current'], { encoding: 'utf8' }).trim(), 'main');

  const earlyProfile = spawnSync(process.execPath, [forge, 'apply-profile', projectDir, 'typescript-enterprise-web']);
  assert.notEqual(earlyProfile.status, 0, 'profile must be blocked before gates');

  const statePath = path.join(projectDir, '.specify', 'project-state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  state.gates.business = 'approved-test-REQSRC-001';
  state.gates.architecture = 'approved-test-REQSRC-002';
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  const legacyFakeApproval = spawnSync(process.execPath, [forge, 'apply-profile', projectDir, 'typescript-enterprise-web']);
  assert.notEqual(legacyFakeApproval.status, 0, 'approved-* text must not count as Gate evidence');

  addGateApproval(projectDir, 'REQSRC-001', 'business');
  addGateApproval(projectDir, 'REQSRC-002', 'architecture');
  state.gates.business = {
    status: 'approved',
    evidence: { sourceId: 'REQSRC-001', approvedBy: 'Integration Test', approvedAt: '2026-08-31T00:00:00Z', conclusion: 'approved' }
  };
  state.gates.architecture = {
    status: 'approved',
    evidence: { sourceId: 'REQSRC-002', approvedBy: 'Integration Test', approvedAt: '2026-08-31T00:00:00Z', conclusion: 'approved' }
  };
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

  execFileSync(process.execPath, [forge, 'apply-profile', projectDir, 'typescript-enterprise-web'], { stdio: 'pipe' });
  const applied = JSON.parse(fs.readFileSync(path.join(projectDir, '.sdd-forge', 'profile.json'), 'utf8'));
  assert.equal(applied.id, 'typescript-enterprise-web');
  assert.equal(applied.status, 'implementation-verified');
  assert.equal(applied.projectVerification.status, 'unverified');
  assert.ok(fs.existsSync(path.join(projectDir, 'packages/server/src/main.ts')));
  assert.ok(fs.existsSync(path.join(projectDir, 'packages/web/src/App.tsx')));
  assert.ok(fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml')));
  execFileSync(process.execPath, [path.join(scriptDir, 'check-project-profile.mjs'), projectDir], { stdio: 'pipe' });
  applied.projectVerification = { status: 'verified', verifiedAt: '2026-08-31T00:00:00Z', command: 'pnpm verify', fingerprint: null };
  fs.writeFileSync(path.join(projectDir, '.sdd-forge', 'profile.json'), `${JSON.stringify(applied, null, 2)}\n`);
  const forgedVerification = spawnSync(process.execPath, [path.join(scriptDir, 'check-project-profile.mjs'), projectDir, '--require-verified']);
  assert.notEqual(forgedVerification.status, 0, 'verified text without an engineering fingerprint must fail');

  const textFiles = [
    'package.json',
    'pnpm-lock.yaml',
    'packages/server/package.json',
    'packages/server/src/health.controller.ts',
    'packages/web/package.json',
    'packages/web/src/App.tsx'
  ];
  for (const relative of textFiles) {
    assert.equal(fs.readFileSync(path.join(projectDir, relative), 'utf8').includes('{{'), false, `unrendered template in ${relative}`);
  }
  execFileSync('corepack', ['pnpm', 'install', '--lockfile-only', '--frozen-lockfile', '--offline'], {
    cwd: projectDir,
    stdio: 'pipe'
  });

  const rerun = spawnSync(process.execPath, [forge, 'init', projectDir, '--name', 'Overwrite Attempt']);
  assert.notEqual(rerun.status, 0, 'initializer must not overwrite a non-empty project');

  console.log('PASS  forge init/apply-profile 初始化、Gate 阻断与防覆盖测试通过');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
