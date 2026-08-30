#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const methodologyDir = path.resolve(scriptDir, '..');

function usage(message) {
  if (message) console.error(message);
  console.error('用法:');
  console.error('  node _methodology/scripts/forge.mjs init <project-directory> --name <project-name> [--dry-run] [--no-git]');
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

function projectSlug(projectName) {
  const slug = projectName
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (slug) return slug;
  const digest = crypto.createHash('sha256').update(projectName).digest('hex').slice(0, 8);
  return `enterprise-app-${digest}`;
}

function ensureNewTarget(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  const entries = fs.readdirSync(targetDir);
  if (entries.length > 0) throw new Error(`初始化目标必须不存在或为空目录: ${targetDir}`);
}

function assertApprovedGate(targetDir, state, gateName) {
  const gate = state.gates?.[gateName];
  if (!gate || gate.status !== 'approved') {
    throw new Error(`${gateName} Gate 尚未批准，不能应用技术 Profile`);
  }
  const evidence = gate.evidence;
  for (const field of ['sourceId', 'approvedBy', 'approvedAt', 'conclusion']) {
    if (!String(evidence?.[field] ?? '').trim()) {
      throw new Error(`${gateName} Gate 批准证据缺少 ${field}`);
    }
  }
  if (!/^REQSRC-\d+$/.test(evidence.sourceId)) {
    throw new Error(`${gateName} Gate sourceId 格式无效: ${evidence.sourceId}`);
  }
  if (evidence.conclusion !== 'approved') {
    throw new Error(`${gateName} Gate 结论不是 approved`);
  }
  if (Number.isNaN(Date.parse(evidence.approvedAt))) {
    throw new Error(`${gateName} Gate approvedAt 不是有效时间`);
  }

  const sourcesDir = path.join(targetDir, '.specify', 'sources');
  const sourceDirName = fs.readdirSync(sourcesDir).find((name) => name.startsWith(`${evidence.sourceId}-`));
  if (!sourceDirName) throw new Error(`${gateName} Gate 来源不存在: ${evidence.sourceId}`);
  const metadataPath = path.join(sourcesDir, sourceDirName, 'metadata.json');
  if (!fs.existsSync(metadataPath)) throw new Error(`${gateName} Gate 来源缺少 metadata.json`);
  const metadata = readJson(metadataPath);
  if (metadata.sourceId !== evidence.sourceId || metadata.status !== 'approved') {
    throw new Error(`${gateName} Gate 来源 metadata 未标记 approved`);
  }
  if (!String(metadata.gate ?? '').startsWith(gateName)) {
    throw new Error(`${gateName} Gate 来源 metadata.gate 不匹配`);
  }
  for (const field of ['approvedBy', 'approvedAt', 'conclusion']) {
    if (metadata.approval?.[field] !== evidence[field]) {
      throw new Error(`${gateName} Gate 状态与来源 metadata.approval.${field} 不一致`);
    }
  }
  const registryPath = path.join(sourcesDir, 'REGISTRY.md');
  const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
  const registryLine = registry.split('\n').find((line) => line.includes(`| ${evidence.sourceId} |`));
  if (!registryLine || !registryLine.includes('| approved |')) {
    throw new Error(`${gateName} Gate 来源未在 REGISTRY.md 登记为 approved`);
  }
  const managedPath = path.join(path.dirname(metadataPath), metadata.managedCopy ?? '');
  if (!fs.existsSync(managedPath)) throw new Error(`${gateName} Gate 管理副本不存在`);
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(managedPath)).digest('hex');
  if (actualHash !== metadata.sha256) throw new Error(`${gateName} Gate 来源哈希不匹配`);
}

function initializeProject(targetArg, name, dryRun, noGit) {
  if (!name?.trim()) throw new Error('init 必须提供非空 --name');
  const targetDir = path.resolve(targetArg);
  if (targetDir === path.parse(targetDir).root) throw new Error('禁止把文件系统根目录作为初始化目标');

  const manifestPath = path.join(methodologyDir, 'project-init', 'manifest.json');
  const manifest = readJson(manifestPath);
  ensureNewTarget(targetDir);
  if (!noGit && !dryRun) execFileSync('git', ['--version'], { stdio: 'ignore' });

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
  if (!noGit) planned.push('git init --initial-branch=main');

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
  if (!noGit) {
    execFileSync('git', ['init', '--initial-branch=main', targetDir], { stdio: 'ignore' });
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
  for (const gate of ['business', 'architecture']) assertApprovedGate(targetDir, state, gate);

  const applicationPath = path.join(targetDir, '.sdd-forge', 'profile.json');
  const decisionPath = path.join(targetDir, 'docs', 'architecture', 'technology-profile.md');
  if (fs.existsSync(applicationPath) || fs.existsSync(decisionPath)) {
    throw new Error('项目已存在 Profile 应用记录；切换 Profile 必须走架构变更而不是覆盖');
  }

  const profile = readJson(profilePath);
  const appliedAt = new Date().toISOString();
  const projectConfig = readJson(projectConfigPath);
  const variables = {
    project_name: projectConfig.projectName,
    project_slug: projectSlug(projectConfig.projectName),
    generated_date: appliedAt.slice(0, 10),
    generated_datetime: appliedAt
  };
  const profileFiles = profile.files ?? [];
  const renderedFiles = [];
  for (const file of profileFiles) {
    assertSafeRelative(file.source);
    assertSafeRelative(file.target);
    if (fs.existsSync(path.join(targetDir, file.target))) {
      throw new Error(`Profile 不覆盖已有项目文件: ${file.target}`);
    }
    const sourcePath = path.join(profileDir, file.source);
    if (!fs.existsSync(sourcePath)) throw new Error(`Profile 模板不存在: ${file.source}`);
    renderedFiles.push({
      target: file.target,
      output: render(fs.readFileSync(sourcePath, 'utf8'), variables)
    });
  }
  if (dryRun) {
    for (const file of profileFiles) console.log(`write ${file.target}`);
    console.log(`write .sdd-forge/profile.json (${profile.id}@${profile.version})`);
    console.log('write docs/architecture/technology-profile.md');
    console.log('update .sdd-forge.json and .specify/project-state.json');
    return;
  }

  const originalProjectConfig = fs.readFileSync(projectConfigPath, 'utf8');
  const originalState = fs.readFileSync(statePath, 'utf8');
  const createdPaths = [];
  try {
    fs.mkdirSync(path.dirname(applicationPath), { recursive: true });
    fs.mkdirSync(path.dirname(decisionPath), { recursive: true });
    for (const file of renderedFiles) {
      const targetPath = path.join(targetDir, file.target);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      createdPaths.push(targetPath);
      fs.writeFileSync(targetPath, file.output, { flag: 'wx' });
    }
    createdPaths.push(applicationPath);
    fs.writeFileSync(applicationPath, `${JSON.stringify({
      ...profile,
      appliedAt,
      projectVerification: { status: 'unverified', verifiedAt: null, command: null, fingerprint: null }
    }, null, 2)}\n`, { flag: 'wx' });
    createdPaths.push(decisionPath);
    fs.copyFileSync(path.join(profileDir, 'technology-profile.md'), decisionPath, fs.constants.COPYFILE_EXCL);

    projectConfig.technologyProfile = {
      id: profile.id,
      version: profile.version,
      appliedAt,
      assetStatus: profile.status,
      verificationStatus: 'unverified'
    };
    fs.writeFileSync(projectConfigPath, `${JSON.stringify(projectConfig, null, 2)}\n`);
    state.technologyProfile = {
      id: profile.id,
      version: profile.version,
      assetStatus: profile.status,
      verificationStatus: 'unverified'
    };
    state.updatedAt = appliedAt;
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  } catch (error) {
    try { fs.writeFileSync(projectConfigPath, originalProjectConfig); } catch {}
    try { fs.writeFileSync(statePath, originalState); } catch {}
    for (const createdPath of createdPaths.reverse()) {
      try { fs.rmSync(createdPath, { force: true }); } catch {}
    }
    throw new Error(`Profile 应用失败并已回滚已创建文件: ${error.message}`);
  }

  console.log(`PASS  已应用 Profile 契约: ${profile.id}@${profile.version}`);
  console.log('NEXT  运行 pnpm install --frozen-lockfile，再在项目内运行 pnpm verify；成功前不得声称项目工程骨架已验证。');
}

const [command, ...args] = process.argv.slice(2);
const dryRunIndex = args.indexOf('--dry-run');
const dryRun = dryRunIndex >= 0;
if (dryRun) args.splice(dryRunIndex, 1);
const noGitIndex = args.indexOf('--no-git');
const noGit = noGitIndex >= 0;
if (noGit) args.splice(noGitIndex, 1);

try {
  if (command === 'init') {
    const nameIndex = args.indexOf('--name');
    if (nameIndex < 0 || !args[nameIndex + 1]) usage('缺少 --name');
    const targetArg = args[0];
    const name = args[nameIndex + 1];
    if (!targetArg) usage('缺少 project-directory');
    initializeProject(targetArg, name, dryRun, noGit);
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
