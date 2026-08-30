import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const contractPath = path.join(root, 'src/demos/bulk-assignment/bulk-assignment.scenarios.json');
const schemaPath = path.join(root, 'src/demos/bulk-assignment/bulk-assignment.scenario.schema.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

assert.equal(schema.$id, 'sdd-forge://interaction-pattern-lab/VAL-002/scenario.schema.json');
assert.equal(contract.version, 1);
assert.equal(contract.validationId, 'VAL-002');
assert.equal(new Set(contract.scenarios.map((scenario) => scenario.id)).size, contract.scenarios.length, '场景 ID 必须唯一');
assert.deepEqual(contract.scenarios.map((scenario) => scenario.id), ['partial-success', 'all-success', 'system-failure-first', 'empty']);
for (const scenario of contract.scenarios) {
  assert.ok(scenario.label && typeof scenario.initialQuery === 'string', `${scenario.id} 缺少标签或初始查询`);
  assert.ok(scenario.actions.length > 0 && scenario.expectedOutcome, `${scenario.id} 缺少动作或预期结果`);
}
for (const code of ['RECORD_LOCKED', 'STATE_INCOMPATIBLE', 'OWNER_UNAVAILABLE', 'CONCURRENT_CHANGE', 'SYSTEM_UNAVAILABLE']) {
  assert.ok(contract.failureCodes.includes(code), `缺少失败代码 ${code}`);
}
for (const key of ['Tab', 'Space', 'Enter', 'Escape']) assert.ok(contract.keyboardPath.includes(key), `缺少键盘路径 ${key}`);

console.log(`PASS  VAL-002 场景契约 ${contract.scenarios.length} 个场景、失败代码与键盘路径有效`);
