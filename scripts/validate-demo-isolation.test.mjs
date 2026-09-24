import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const validator = path.join(projectRoot, 'scripts/validate-demo-isolation.mjs');
const probe = path.join(projectRoot, 'packages/web/src/ui-assets/scenarios/.task9-isolation-probe.ts');

test('TC-1016 scans ui-assets scenarios for every prohibited boundary', () => {
  const probes = [
    ['fetch()', '网络请求'],
    ['localStorage.getItem(\'probe\')', '浏览器持久化'],
    ['Math.random()', '随机数'],
    ['Date.now()', '当前时间'],
    ["import value from '@interaction-pattern-lab/server';", '服务端导入'],
  ];

  try {
    for (const [source, label] of probes) {
      fs.writeFileSync(probe, source, 'utf8');
      assert.throws(
        () => execFileSync(process.execPath, [validator], { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }),
        new RegExp(label),
      );
    }
  } finally {
    fs.rmSync(probe, { force: true });
  }
});
