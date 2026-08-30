import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { engineeringFingerprint } from './profile-fingerprint.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const applicationPath = path.join(projectDir, '.sdd-forge/profile.json');
const applicationBefore = JSON.parse(fs.readFileSync(applicationPath, 'utf8'));
const packageBefore = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
for (const [name, command] of Object.entries(applicationBefore.qualityCommandContracts ?? {})) {
  if (packageBefore.scripts?.[name] !== command) {
    console.error(`FAIL  质量命令契约被修改: ${name}`);
    process.exit(1);
  }
}
const result = spawnSync('corepack', ['pnpm', 'verify:engineering'], {
  cwd: projectDir,
  stdio: 'inherit',
  env: process.env,
});
if (result.status !== 0) process.exit(result.status ?? 1);

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(projectDir, relative), 'utf8'));
const writeJson = (relative, value) => {
  fs.writeFileSync(path.join(projectDir, relative), `${JSON.stringify(value, null, 2)}\n`);
};
const verifiedAt = new Date().toISOString();

const application = readJson('.sdd-forge/profile.json');
application.projectVerification = {
  status: 'verified',
  verifiedAt,
  command: 'pnpm verify',
  fingerprint: engineeringFingerprint(projectDir),
};
writeJson('.sdd-forge/profile.json', application);

const projectConfig = readJson('.sdd-forge.json');
projectConfig.technologyProfile.verificationStatus = 'verified';
projectConfig.technologyProfile.verifiedAt = verifiedAt;
writeJson('.sdd-forge.json', projectConfig);

const state = readJson('.specify/project-state.json');
state.technologyProfile.verificationStatus = 'verified';
state.technologyProfile.verifiedAt = verifiedAt;
state.updatedAt = verifiedAt;
writeJson('.specify/project-state.json', state);

console.log(`PASS  项目 Profile 工程验证已记录: ${application.id}@${application.version}`);
