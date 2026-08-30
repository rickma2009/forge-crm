#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../..');
const checkOnly = process.argv.includes('--check');
const manifestPath = path.join(rootDir, '_methodology/skills/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exitCode = 1;
}

function validateSkill(entry) {
  const source = path.resolve(rootDir, entry.source);
  const skillFile = path.join(source, 'SKILL.md');
  const evalFile = path.join(source, 'evals/evals.json');

  if (!fs.existsSync(skillFile)) {
    fail(`${entry.name} 缺少 SKILL.md：${skillFile}`);
    return;
  }

  const content = fs.readFileSync(skillFile, 'utf8');
  if (!content.startsWith('---\n') || !content.includes(`\nname: ${entry.name}\n`) || !content.includes('\ndescription: ')) {
    fail(`${entry.name} 的 frontmatter 缺少匹配的 name 或 description`);
  }

  if (!fs.existsSync(evalFile)) {
    fail(`${entry.name} 缺少 evals/evals.json`);
  } else {
    const evals = JSON.parse(fs.readFileSync(evalFile, 'utf8'));
    if (evals.skill_name !== entry.name || !Array.isArray(evals.evals) || evals.evals.length < 2) {
      fail(`${entry.name} 至少需要两个有效的测试场景`);
    }
  }

  for (const targetPath of entry.targets) {
    const target = path.resolve(rootDir, targetPath);
    const relativeSource = path.relative(path.dirname(target), source);

    if (!fs.existsSync(target) && !fs.lstatSync(path.dirname(target), { throwIfNoEntry: false })) {
      if (checkOnly) {
        fail(`未初始化 ${targetPath}`);
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
    }

    const stat = fs.lstatSync(target, { throwIfNoEntry: false });
    if (!stat) {
      if (checkOnly) {
        fail(`未初始化 ${targetPath}`);
      } else {
        fs.symlinkSync(relativeSource, target, 'dir');
        console.log(`INIT  ${targetPath} -> ${entry.source}`);
      }
      continue;
    }

    if (!stat.isSymbolicLink()) {
      fail(`${targetPath} 已存在且不是符号链接，为避免覆盖已停止`);
      continue;
    }

    const actual = path.resolve(path.dirname(target), fs.readlinkSync(target));
    if (actual !== source) {
      fail(`${targetPath} 指向 ${actual}，预期 ${source}`);
      continue;
    }

    console.log(`PASS  ${targetPath}`);
  }
}

if (!Array.isArray(manifest.required_local_skills) || manifest.required_local_skills.length === 0) {
  fail('Skills 清单没有 required_local_skills');
} else {
  manifest.required_local_skills.forEach(validateSkill);
}

if (!Array.isArray(manifest.conditional_skills)) {
  fail('Skills 清单缺少 conditional_skills');
}

if (!process.exitCode) {
  console.log(checkOnly ? 'PASS  工作台必需 Skills 已正确初始化' : 'PASS  Skills 初始化完成');
}
