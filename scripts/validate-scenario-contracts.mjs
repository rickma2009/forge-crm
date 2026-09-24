import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateJsonSchema } from '../_methodology/scripts/json-schema-subset.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const contractPath = path.join(root, 'packages/web/src/demos/bulk-assignment/bulk-assignment.scenarios.json');
const schemaPath = path.join(root, 'packages/web/src/demos/bulk-assignment/bulk-assignment.scenario.schema.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

assert.equal(schema.$id, 'sdd-forge://interaction-pattern-lab/VAL-002/scenario.schema.json');
assert.deepEqual(validateJsonSchema(schema, contract), [], 'VAL-002 场景必须符合 JSON Schema');
const invalidProbe = structuredClone(contract);
delete invalidProbe.scenarios[0].expectedObservation;
assert.ok(validateJsonSchema(schema, invalidProbe).length > 0, 'Schema 负向探针必须拒绝缺失字段');
assert.equal(contract.version, 1);
assert.equal(contract.validationId, 'VAL-002');
assert.equal(new Set(contract.scenarios.map((scenario) => scenario.id)).size, contract.scenarios.length, '场景 ID 必须唯一');
assert.deepEqual(contract.scenarios.map((scenario) => scenario.id), ['partial-success', 'all-success', 'system-failure-first', 'loading', 'empty']);
for (const scenario of contract.scenarios) {
  assert.ok(scenario.label && typeof scenario.initialQuery === 'string', `${scenario.id} 缺少标签或初始查询`);
  assert.ok(Array.isArray(scenario.actions) && scenario.expectedObservation, `${scenario.id} 缺少动作或预期观察`);
}
for (const code of ['RECORD_LOCKED', 'STATE_INCOMPATIBLE', 'OWNER_UNAVAILABLE', 'CONCURRENT_CHANGE', 'SYSTEM_UNAVAILABLE']) {
  assert.ok(contract.failureCodes.includes(code), `缺少失败代码 ${code}`);
}
for (const key of ['Tab', 'Space', 'Enter', 'Escape']) assert.ok(contract.keyboardPath.includes(key), `缺少键盘路径 ${key}`);

console.log(`PASS  VAL-002 场景契约 ${contract.scenarios.length} 个场景、失败代码与键盘路径有效`);
