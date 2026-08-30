import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const forge = path.join(scriptDir, 'forge.mjs');
const checkProject = path.join(scriptDir, 'check-project.sh');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-forge-init-'));
const projectDir = path.join(temporaryRoot, 'sample-project');

try {
  execFileSync(process.execPath, [forge, 'init', projectDir, '--name', 'Sample Enterprise App'], { stdio: 'pipe' });

  for (const expected of [
    'README.md',
    'AGENTS.md',
    'CLAUDE.md',
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
  execFileSync('bash', [checkProject, projectDir], { stdio: 'pipe' });

  const earlyProfile = spawnSync(process.execPath, [forge, 'apply-profile', projectDir, 'typescript-enterprise-web']);
  assert.notEqual(earlyProfile.status, 0, 'profile must be blocked before gates');

  const statePath = path.join(projectDir, '.specify', 'project-state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  state.gates.business = 'approved-test-REQSRC-001';
  state.gates.architecture = 'approved-test-REQSRC-002';
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

  execFileSync(process.execPath, [forge, 'apply-profile', projectDir, 'typescript-enterprise-web'], { stdio: 'pipe' });
  const applied = JSON.parse(fs.readFileSync(path.join(projectDir, '.sdd-forge', 'profile.json'), 'utf8'));
  assert.equal(applied.id, 'typescript-enterprise-web');
  assert.equal(applied.status, 'candidate-contract-only');

  const rerun = spawnSync(process.execPath, [forge, 'init', projectDir, '--name', 'Overwrite Attempt']);
  assert.notEqual(rerun.status, 0, 'initializer must not overwrite a non-empty project');

  console.log('PASS  forge init/apply-profile 初始化、Gate 阻断与防覆盖测试通过');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
