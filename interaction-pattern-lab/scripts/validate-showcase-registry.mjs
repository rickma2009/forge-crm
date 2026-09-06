import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateShowcaseRegistry } from './showcase-registry-validation.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const registry = JSON.parse(fs.readFileSync(path.join(projectRoot, 'packages/web/src/showcase/registry/showcase-registry.data.json'), 'utf8'));
const methodIndex = JSON.parse(fs.readFileSync(path.resolve(projectRoot, '../_methodology/patterns/index.json'), 'utf8'));
const iconKeys = new Set(['portal', 'overview', 'foundation', 'palette', 'text', 'layout', 'icons', 'components', 'action', 'form', 'table', 'feedback', 'pages', 'list', 'filter', 'detail', 'split', 'workbench', 'interaction', 'state', 'scenario', 'settings', 'user', 'role', 'lock', 'menu', 'log', 'resource', 'data']);
const rendererKeys = new Set(['overview', 'resource-catalog', 'customer-directory', 'dictionary-admin', 'list-view-admin', 'sales-order-prototype', 'personal-workbench', 'master-detail-workbench', 'bom-scenario', 'description']);
const errors = validateShowcaseRegistry(registry, {
  iconKeys,
  rendererKeys,
  traceabilityEvidence: {
    assetIds: new Set(methodIndex.assets.map((asset) => asset.assetId)),
    implementationRefExists(reference) {
      const resolved = path.resolve(projectRoot, reference);
      return resolved.startsWith(`${projectRoot}${path.sep}`) && fs.existsSync(resolved);
    },
  },
});
assert.deepEqual(errors, [], `Showcase Registry 校验失败:\n${errors.join('\n')}`);
console.log(`PASS  Showcase Registry v${registry.version}：${registry.pages.length} 个页面、${registry.capabilities.length} 个 capability`);
