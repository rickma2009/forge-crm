import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { engineeringFingerprint } from '../profiles/typescript-enterprise-web/templates/scripts/profile-fingerprint.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const projectDir = path.resolve(process.argv[2] ?? '');
const requireVerified = process.argv.includes('--require-verified');
if (!projectDir || !fs.existsSync(projectDir)) {
  console.error(`项目目录不存在: ${projectDir}`);
  process.exit(2);
}

const applicationPath = path.join(projectDir, '.sdd-forge', 'profile.json');
if (!fs.existsSync(applicationPath)) {
  console.error('FAIL  项目尚未应用技术 Profile');
  process.exit(1);
}

const profile = JSON.parse(fs.readFileSync(applicationPath, 'utf8'));
const canonicalPath = path.join(scriptDir, '..', 'profiles', profile.id ?? '', 'profile.json');
if (!fs.existsSync(canonicalPath)) {
  console.error(`FAIL  找不到 Profile 权威契约: ${profile.id ?? 'missing-id'}`);
  process.exit(1);
}
const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
if (canonical.version !== profile.version) {
  console.error(`FAIL  Profile 版本与权威契约不一致: ${profile.version} != ${canonical.version}`);
  process.exit(1);
}
for (const relative of canonical.requiredFiles ?? []) {
  if (!fs.existsSync(path.join(projectDir, relative))) {
    console.error(`FAIL  Profile 缺少必需文件: ${relative}`);
    process.exit(1);
  }
}

const packagePath = path.join(projectDir, 'package.json');
if (!fs.existsSync(packagePath)) {
  console.error('FAIL  工程 Profile 缺少 package.json');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const required = canonical.requiredQualityCommands ?? [];
const missing = required.filter((name) => typeof pkg.scripts?.[name] !== 'string');
if (missing.length > 0) {
  console.error(`FAIL  Profile 缺少质量脚本: ${missing.join(', ')}`);
  process.exit(1);
}
for (const [name, command] of Object.entries(canonical.qualityCommandContracts ?? {})) {
  if (pkg.scripts?.[name] !== command) {
    console.error(`FAIL  质量命令契约被修改: ${name}`);
    process.exit(1);
  }
}
console.log(`PASS  Profile 工程入口完整: ${profile.id}@${profile.version}`);
const verificationStatus = profile.projectVerification?.status ?? 'unverified';
if (requireVerified && verificationStatus !== 'verified') {
  console.error(`FAIL  项目 Profile 尚未完成真实工程验证: ${verificationStatus}`);
  process.exit(1);
}
if (verificationStatus === 'verified') {
  const currentFingerprint = engineeringFingerprint(projectDir);
  if (!profile.projectVerification?.fingerprint || profile.projectVerification.fingerprint !== currentFingerprint) {
    console.error('FAIL  工程文件已在最近一次 Profile 验证后变化，必须重新运行 pnpm verify');
    process.exit(1);
  }
}
console.log(`${verificationStatus === 'verified' ? 'PASS' : 'NOTE'}  项目 Profile 验证状态: ${verificationStatus}`);
