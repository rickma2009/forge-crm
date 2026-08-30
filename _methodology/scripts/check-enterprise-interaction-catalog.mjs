import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  catalog: '_methodology/08-企业管理系统交互模式分类方法.md',
  template: '_methodology/templates/ui/interaction-pattern-candidate-template.md',
  navigationExample: '_methodology/examples/002-golden-interaction-enterprise-navigation-shell/README.md',
  recordExample: '_methodology/examples/003-golden-interaction-record-management-workspace/README.md',
};

for (const [name, relative] of Object.entries(files)) {
  assert.ok(fs.existsSync(path.join(root, relative)), `${name} 缺失: ${relative}`);
}

const catalog = fs.readFileSync(path.join(root, files.catalog), 'utf8');
for (const marker of [
  '## 4. 页面模式分类',
  '## 5. 操作模式分类',
  '## 6. UI 展示模式分类',
  '## 7. 特殊操作分类',
  '## 8. 操作行为契约',
  '## 13. 后续补充清单',
  '## 14. 当前已确认、未确认与 Gate 状态',
  'EPM-PAGE-',
  'EPM-ACT-',
  'EPM-VIEW-',
  'EPM-STATE-',
  'EPM-SPECIAL-',
  'EPM-SCENE-',
]) assert.ok(catalog.includes(marker), `分类方法缺少 ${marker}`);

const template = fs.readFileSync(path.join(root, files.template), 'utf8');
for (const marker of [
  '## 2. 适用与不适用边界',
  '## 4. 操作行为契约',
  '## 5. 状态与反馈',
  '## 6. 特殊操作与风险',
  '## 8. 验收清单',
  '## 9. 来源与验证证据',
]) assert.ok(template.includes(marker), `候选模板缺少 ${marker}`);

const navigationExample = fs.readFileSync(path.join(root, files.navigationExample), 'utf8');
assert.ok(navigationExample.includes('EPM-PAGE-001'), '导航案例必须映射到页面分类');
const recordExample = fs.readFileSync(path.join(root, files.recordExample), 'utf8');
for (const marker of ['EPM-PAGE-010', 'EPM-PAGE-011', 'EPM-PAGE-012']) {
  assert.ok(recordExample.includes(marker), `记录案例必须映射到 ${marker}`);
}

console.log('PASS  企业管理系统交互分类、候选模板与已有金标准案例一致');

