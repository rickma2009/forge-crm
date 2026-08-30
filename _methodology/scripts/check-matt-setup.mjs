import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const repoArg = args.find((arg) => !arg.startsWith('--'));
const requireGit = args.includes('--require-git');
const repoDir = path.resolve(repoArg ?? '');
const failures = [];

if (!repoArg || !fs.existsSync(repoDir)) {
  console.error(`仓库目录不存在: ${repoDir}`);
  process.exit(2);
}

const requiredFiles = [
  'docs/agents/issue-tracker.md',
  'docs/agents/triage-labels.md',
  'docs/agents/domain.md'
];
for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(repoDir, relative))) failures.push(`缺少 ${relative}`);
}

const instructionPath = fs.existsSync(path.join(repoDir, 'CLAUDE.md'))
  ? path.join(repoDir, 'CLAUDE.md')
  : path.join(repoDir, 'AGENTS.md');
if (!fs.existsSync(instructionPath)) {
  failures.push('缺少 CLAUDE.md 或 AGENTS.md');
} else {
  const instructions = fs.readFileSync(instructionPath, 'utf8');
  for (const heading of ['## Agent skills', '### Issue tracker', '### Triage labels', '### Domain docs']) {
    if (!instructions.includes(heading)) failures.push(`AI 入口缺少 ${heading}`);
  }
}

const issuePath = path.join(repoDir, 'docs/agents/issue-tracker.md');
if (fs.existsSync(issuePath)) {
  const issueConfig = fs.readFileSync(issuePath, 'utf8');
  if (!issueConfig.includes('.scratch/')) failures.push('issue tracker 未声明本地 .scratch/ 位置');
  if (!issueConfig.includes('.specify/')) failures.push('issue tracker 未声明 .specify/ 权威边界');
  if (!issueConfig.includes('ready-for-agent')) failures.push('issue tracker 未约束 ready-for-agent');
}

const labelsPath = path.join(repoDir, 'docs/agents/triage-labels.md');
if (fs.existsSync(labelsPath)) {
  const labels = fs.readFileSync(labelsPath, 'utf8');
  for (const role of ['needs-triage', 'needs-info', 'ready-for-agent', 'ready-for-human', 'wontfix']) {
    if (!labels.includes(`\`${role}\``)) failures.push(`triage 配置缺少 ${role}`);
  }
  if (!labels.includes('Gate')) failures.push('triage 配置未声明 SDD Gate 边界');
}

const contextMap = path.join(repoDir, 'CONTEXT-MAP.md');
const context = path.join(repoDir, 'CONTEXT.md');
if (!fs.existsSync(contextMap) && !fs.existsSync(context)) failures.push('缺少 CONTEXT.md 或 CONTEXT-MAP.md');
if (fs.existsSync(contextMap) && fs.existsSync(context)) failures.push('同时存在根 CONTEXT.md 与 CONTEXT-MAP.md，领域布局不明确');

const scratchDir = path.join(repoDir, '.scratch');
if (fs.existsSync(scratchDir)) {
  const pending = [scratchDir];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      if (entry.isFile() && entry.name === 'spec.md') {
        failures.push(`发现第二规格源: ${path.relative(repoDir, entryPath)}`);
      }
    }
  }
}

if (requireGit) {
  try {
    const gitRoot = execFileSync('git', ['-C', repoDir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    if (fs.realpathSync(gitRoot) !== fs.realpathSync(repoDir)) failures.push(`不是独立 Git 根目录: ${gitRoot}`);
  } catch {
    failures.push('不是可识别的 Git 仓库');
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log(`PASS  Matt per-repo setup 完整且符合 SDD 权威边界: ${repoDir}`);
