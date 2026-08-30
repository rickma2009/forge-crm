import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  '_methodology/reference-cases/gf-scm-customer-record-workspace-distillation.md',
  '_methodology/patterns/record-management-workspace.md',
  '_methodology/templates/ui/record-management-workspace/README.md',
  '_methodology/templates/ui/record-management-workspace/record-workspace.tokens.css',
  '_methodology/templates/ui/record-management-workspace/record-workspace.schema.example.json',
  '_methodology/templates/ui/record-management-workspace/acceptance-checklist.md',
  '_methodology/examples/003-golden-interaction-record-management-workspace/README.md',
  '_methodology/examples/003-golden-interaction-record-management-workspace/index.html',
  '_methodology/examples/003-golden-interaction-record-management-workspace/styles.css',
  '_methodology/examples/003-golden-interaction-record-management-workspace/app.js',
];
for (const file of files) assert.ok(fs.existsSync(path.join(root, file)), `记录管理工作区资产缺失: ${file}`);

const tokens = fs.readFileSync(path.join(root, files[3]), 'utf8');
for (const token of ['--record-tab-height', '--record-page-title-size', '--record-table-row-height', '--record-surface', '--record-primary']) assert.ok(tokens.includes(token), `缺少令牌 ${token}`);
const schema = JSON.parse(fs.readFileSync(path.join(root, files[4]), 'utf8'));
assert.ok(schema.routes?.list && schema.routes?.create && schema.routes?.detail, '模板必须声明列表、新增和详情路由');
assert.ok(schema.queryFields?.every((field) => field.apiParameter), '查询字段必须声明真实 API 参数');
const html = fs.readFileSync(path.join(root, files[7]), 'utf8');
for (const marker of ['data-page="list"', 'data-page="create"', 'data-page="detail"', 'data-search', 'data-reset', 'data-open="detail"']) assert.ok(html.includes(marker), `案例缺少 ${marker}`);
const js = fs.readFileSync(path.join(root, files[9]), 'utf8');
for (const marker of ['openView', 'dataset.close', '[data-query]', '[data-rows]']) assert.ok(js.includes(marker), `案例脚本缺少 ${marker}`);

console.log('PASS  记录管理工作区模式、模板、交互案例和自动检查一致');
