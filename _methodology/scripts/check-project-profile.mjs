import fs from 'node:fs';
import path from 'node:path';

const projectDir = path.resolve(process.argv[2] ?? '');
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
if (profile.status === 'candidate-contract-only') {
  console.log(`PASS  Profile 契约已登记: ${profile.id}@${profile.version}`);
  console.log('NOTE  contract-only 不代表可运行工程骨架已建立');
  process.exit(0);
}

const packagePath = path.join(projectDir, 'package.json');
if (!fs.existsSync(packagePath)) {
  console.error('FAIL  工程 Profile 缺少 package.json');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const required = profile.requiredQualityCommands ?? [];
const missing = required.filter((name) => typeof pkg.scripts?.[name] !== 'string');
if (missing.length > 0) {
  console.error(`FAIL  Profile 缺少质量脚本: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`PASS  Profile 工程入口完整: ${profile.id}@${profile.version}`);
