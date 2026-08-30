import fs from 'node:fs';
import path from 'node:path';

const featureDir = process.argv[2];
const stage = process.argv[3] ?? 'full';
if (!featureDir) {
  console.error('用法: node check-traceability.mjs <feature-directory> [spec|full]');
  process.exit(2);
}
if (!['spec', 'full'].includes(stage)) {
  console.error(`未知检查阶段: ${stage}`);
  process.exit(2);
}

function read(name) {
  return fs.readFileSync(path.join(featureDir, name), 'utf8');
}

function ids(text, pattern) {
  return new Set(text.match(pattern) ?? []);
}

const spec = read('spec.md');
const testcases = read('testcases.md');
const tasks = stage === 'full' ? read('tasks.md') : '';
const traceability = read('traceability.md');

const definitions = [
  ['REQ/NFR', ids(spec, /\b(?:REQ|NFR)-[A-Z0-9-]+\b/g)],
  ['AC', ids(spec, /\bAC-[A-Z0-9-]+\b/g)],
  ['TC', ids(testcases, /\bTC-[A-Z0-9-]+\b/g)],
];
if (stage === 'full') {
  definitions.push(['TASK', ids(tasks, /\bTASK-[A-Z0-9-]+\b/g)]);
}

const failures = [];
for (const [kind, values] of definitions) {
  if (values.size === 0) failures.push(`${kind} 没有定义`);
  for (const value of values) {
    if (!traceability.includes(value)) failures.push(`${value} 未进入追溯矩阵`);
  }
}

for (const acceptanceId of definitions[1][1]) {
  if (!testcases.includes(acceptanceId)) {
    failures.push(`${acceptanceId} 未被测试用例引用`);
  }
}

for (const requirementId of definitions[0][1]) {
  if (!/\b(?:REQ|NFR)-[A-Z0-9-]+\b/.test(requirementId)) continue;
  if (!traceability.includes(requirementId)) {
    failures.push(`${requirementId} 没有实现追溯`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log(
  stage === 'full'
    ? 'PASS  追溯矩阵覆盖全部 REQ/NFR、AC、TC 和 TASK'
    : 'PASS  追溯矩阵覆盖全部 REQ/NFR、AC 和 TC（TASK 留待后续阶段）',
);
