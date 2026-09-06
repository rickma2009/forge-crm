import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  reference: '_methodology/reference-cases/enterprise-workbench-master-detail-candidate.md',
  readme: '_methodology/templates/ui/enterprise-workbench/README.md',
  schema: '_methodology/templates/ui/enterprise-workbench/workbench-schema.example.json',
  tokens: '_methodology/templates/ui/enterprise-workbench/workbench.tokens.css',
  acceptance: '_methodology/templates/ui/enterprise-workbench/acceptance-checklist.md',
  exampleReadme: '_methodology/examples/004-golden-interaction-enterprise-workbench/README.md',
  html: '_methodology/examples/004-golden-interaction-enterprise-workbench/index.html',
  css: '_methodology/examples/004-golden-interaction-enterprise-workbench/styles.css',
  js: '_methodology/examples/004-golden-interaction-enterprise-workbench/app.js',
};
for (const [name, relative] of Object.entries(files)) assert.ok(fs.existsSync(path.join(root, relative)), `${name} 缺失: ${relative}`);

const schema = JSON.parse(fs.readFileSync(path.join(root, files.schema), 'utf8'));
assert.ok(Array.isArray(schema.sources) && schema.sources.length >= 4, '工作台模板必须区分多类工作来源');
assert.ok(schema.sources.some((item) => item.key === 'reminder' && item.semantics === 'attention-time'), '提醒必须使用注意力时机语义');
assert.ok(schema.actions.every((action) => typeof action.changesBusinessState === 'boolean'), '操作必须声明是否改变业务状态');
for (const region of ['objectSummary', 'process', 'collaboration']) assert.ok(schema.detailRegions.includes(region), `从区缺少 ${region}`);

const tokens = fs.readFileSync(path.join(root, files.tokens), 'utf8');
for (const token of ['--workbench-canvas', '--workbench-primary', '--workbench-master-width', '--workbench-context-width', '--workbench-item-min-height']) assert.ok(tokens.includes(token), `工作台令牌缺失: ${token}`);
const js = fs.readFileSync(path.join(root, files.js), 'utf8');
for (const marker of ['data-id', 'data-filter', 'data-complete', 'data-snooze', '没有匹配的工作项']) assert.ok(js.includes(marker), `独立案例缺少交互: ${marker}`);

console.log('PASS  企业工作台候选萃取、模板、独立案例和自动检查一致');
