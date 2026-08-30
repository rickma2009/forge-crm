#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const methodologyDir = path.resolve(scriptDir, '..');

function usage(message) {
  if (message) console.error(message);
  console.error('用法:');
  console.error('  node _methodology/scripts/forge.mjs init <project-directory> --name <project-name> [--dry-run]');
  console.error('  node _methodology/scripts/forge.mjs apply-profile <project-directory> <profile-id> [--dry-run]');
  process.exit(message ? 2 : 0);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertSafeRelative(relativePath) {
  if (path.isAbsolute(relativePath) || relativePath.split(path.sep).includes('..')) {
    throw new Error(`清单包含不安全路径: ${relativePath}`);
  }
}

function render(template, variables) {
  return template.replace(/\{\{([a-z_]+)\}\}/g, (match, key) => {
    if (!(key in variables)) throw new Error(`模板变量没有值: ${key}`);
    return String(variables[key]);
  });
}

function ensureNewTarget(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  const entries = fs.readdirSync(targetDir);
  if (entries.length > 0) throw new Error(`初始化目标必须不存在或为空目录: ${targetDir}`);
}

function initializeProject(targetArg, name, dryRun) {
  if (!name?.trim()) throw new Error('init 必须提供非空 --name');
  const targetDir = path.resolve(targetArg);
  if (targetDir === path.parse(targetDir).root) throw new Error('禁止把文件系统根目录作为初始化目标');

  const manifestPath = path.join(methodologyDir, 'project-init', 'manifest.json');
  const manifest = readJson(manifestPath);
  ensureNewTarget(targetDir);

  const now = new Date();
  const variables = {
    project_name: name.trim(),
    generated_date: now.toISOString().slice(0, 10),
    generated_datetime: now.toISOString(),
    initializer_version: manifest.initializerVersion
  };

  const planned = [];
  for (const directory of manifest.directories) {
    assertSafeRelative(directory);
    planned.push(`mkdir ${directory}`);
  }
  for (const file of manifest.files) {
    assertSafeRelative(file.source);
    assertSafeRelative(file.target);
    planned.push(`write ${file.target}`);
  }
  for (const link of manifest.symlinks) {
    assertSafeRelative(link.path);
    assertSafeRelative(link.target);
    planned.push(`symlink ${link.path} -> ${link.target}`);
  }

  if (dryRun) {
    console.log(planned.join('\n'));
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  for (const directory of manifest.directories) {
    fs.mkdirSync(path.join(targetDir, directory), { recursive: true });
  }
  for (const file of manifest.files) {
    const sourcePath = path.join(methodologyDir, 'project-init', file.source);
    const targetPath = path.join(targetDir, file.target);
    const output = render(fs.readFileSync(sourcePath, 'utf8'), variables);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, output, { flag: 'wx' });
  }
  for (const link of manifest.symlinks) {
    fs.symlinkSync(link.target, path.join(targetDir, link.path));
  }

  console.log(`PASS  已初始化治理骨架: ${targetDir}`);
  console.log('NEXT  归档第一份来源并完成 Business Gate；不要在此阶段选择技术 Profile。');
}

function applyProfile(targetArg, profileId, dryRun) {
  if (!profileId) throw new Error('apply-profile 必须提供 profile-id');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(profileId)) throw new Error(`非法 profile-id: ${profileId}`);

  const targetDir = path.resolve(targetArg);
  const projectConfigPath = path.join(targetDir, '.sdd-forge.json');
  const statePath = path.join(targetDir, '.specify', 'project-state.json');
  if (!fs.existsSync(projectConfigPath) || !fs.existsSync(statePath)) {
    throw new Error('目标不是由 forge init 建立的治理项目，缺少 .sdd-forge.json 或 project-state.json');
  }

  const profileDir = path.join(methodologyDir, 'profiles', profileId);
  const profilePath = path.join(profileDir, 'profile.json');
  if (!fs.existsSync(profilePath)) throw new Error(`未知 Profile: ${profileId}`);

  const state = readJson(statePath);
  for (const gate of ['business', 'architecture']) {
    if (!String(state.gates?.[gate] ?? '').startsWith('approved-')) {
      throw new Error(`${gate} Gate 尚无来源支持的 approved-* 状态，不能应用技术 Profile`);
    }
  }

  const applicationPath = path.join(targetDir, '.sdd-forge', 'profile.json');
  const decisionPath = path.join(targetDir, 'docs', 'architecture', 'technology-profile.md');
  if (fs.existsSync(applicationPath) || fs.existsSync(decisionPath)) {
    throw new Error('项目已存在 Profile 应用记录；切换 Profile 必须走架构变更而不是覆盖');
  }

  const profile = readJson(profilePath);
  const appliedAt = new Date().toISOString();
  if (dryRun) {
    console.log(`write .sdd-forge/profile.json (${profile.id}@${profile.version})`);
    console.log('write docs/architecture/technology-profile.md');
    console.log('update .sdd-forge.json and .specify/project-state.json');
    return;
  }

  fs.mkdirSync(path.dirname(applicationPath), { recursive: true });
  fs.mkdirSync(path.dirname(decisionPath), { recursive: true });
  fs.writeFileSync(applicationPath, `${JSON.stringify({ ...profile, appliedAt }, null, 2)}\n`, { flag: 'wx' });
  fs.copyFileSync(path.join(profileDir, 'technology-profile.md'), decisionPath, fs.constants.COPYFILE_EXCL);

  const projectConfig = readJson(projectConfigPath);
  projectConfig.technologyProfile = { id: profile.id, version: profile.version, appliedAt };
  fs.writeFileSync(projectConfigPath, `${JSON.stringify(projectConfig, null, 2)}\n`);
  state.technologyProfile = { id: profile.id, version: profile.version, status: profile.status };
  state.updatedAt = appliedAt;
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

  console.log(`PASS  已应用 Profile 契约: ${profile.id}@${profile.version}`);
  if (profile.status.includes('contract-only')) {
    console.log('NOTE  当前 Profile 不生成可运行代码；工程能力仍需实际实现并验证。');
  }
}

const [command, ...args] = process.argv.slice(2);
const dryRunIndex = args.indexOf('--dry-run');
const dryRun = dryRunIndex >= 0;
if (dryRun) args.splice(dryRunIndex, 1);

try {
  if (command === 'init') {
    const nameIndex = args.indexOf('--name');
    if (nameIndex < 0 || !args[nameIndex + 1]) usage('缺少 --name');
    const targetArg = args[0];
    const name = args[nameIndex + 1];
    if (!targetArg) usage('缺少 project-directory');
    initializeProject(targetArg, name, dryRun);
  } else if (command === 'apply-profile') {
    if (args.length < 2) usage('缺少 project-directory 或 profile-id');
    applyProfile(args[0], args[1], dryRun);
  } else {
    usage(command ? `未知命令: ${command}` : undefined);
  }
} catch (error) {
  console.error(`FAIL  ${error.message}`);
  process.exit(1);
}
