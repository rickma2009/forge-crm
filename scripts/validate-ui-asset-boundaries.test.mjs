import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const validator = path.join(projectRoot, 'scripts/validate-ui-asset-boundaries.mjs');
const probe = path.join(projectRoot, 'packages/web/src/ui-assets/templates/.task1010-boundary-probe.ts');

test('TC-1014 rejects BOM terminology and scenario imports from the generic core', () => {
  try {
    fs.writeFileSync(probe, "import { BomScenario } from '../scenarios/bom/BomScenario';\nexport const bomProductCode = 'MAT-AX-07';\n", 'utf8');
    assert.throws(
      () => execFileSync(process.execPath, [validator], { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }),
      /场景导入|BOM领域词|产品领域词/,
    );
  } finally {
    fs.rmSync(probe, { force: true });
  }
});
