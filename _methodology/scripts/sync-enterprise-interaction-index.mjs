import fs from 'node:fs';
import path from 'node:path';
import { buildEnterpriseInteractionIndex, indexRelativePath, serializeEnterpriseInteractionIndex } from './enterprise-interaction-index.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const outputPath = path.join(root, indexRelativePath);
const webProjectionPath = path.join(root, 'packages/web/src/showcase/data/interaction-index.data.json');
const expected = serializeEnterpriseInteractionIndex(buildEnterpriseInteractionIndex(root));

if (process.argv.includes('--check')) {
  const actual = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  const webProjection = fs.existsSync(webProjectionPath) ? fs.readFileSync(webProjectionPath, 'utf8') : '';
  if (actual !== expected || webProjection !== expected) {
    console.error('FAIL  企业交互资产登记册与分类源不一致；运行 sync-enterprise-interaction-index.mjs 更新');
    process.exit(1);
  }
  console.log('PASS  企业交互资产登记册与分类源一致');
} else {
  fs.writeFileSync(outputPath, expected);
  fs.mkdirSync(path.dirname(webProjectionPath), { recursive: true });
  fs.writeFileSync(webProjectionPath, expected);
  console.log(`WROTE ${indexRelativePath} and packages/web/src/showcase/data/interaction-index.data.json`);
}
