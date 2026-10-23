import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const guide = fs.readFileSync(path.join(root, '_methodology/templates/ui/ADOPTION.md'), 'utf8');
const paths = [...guide.matchAll(/`((?:packages|_methodology)\/[^`]+)`/g)].map(m => m[1]);
for (const item of paths) if (!fs.existsSync(path.join(root, item))) throw new Error(`Broken adoption source: ${item}`);
for (const name of ['_methodology/templates/ui/adoption-record-template.md', '_methodology/examples/ui-adoption-rehearsal/README.md', '_methodology/scripts/rehearse-ui-adoption.mjs']) {
  if (!fs.existsSync(path.join(root, name))) throw new Error(`Missing adoption asset: ${name}`);
}
const maturity = fs.readFileSync(path.join(root, '_methodology/09-资产类型、成熟度与晋升规范.md'), 'utf8');
const candidate = fs.readFileSync(path.join(root, '_methodology/templates/ui/interaction-pattern-candidate-template.md'), 'utf8');
const adoption = fs.readFileSync(path.join(root, '_methodology/templates/ui/adoption-record-template.md'), 'utf8');
const rehearsal = fs.readFileSync(path.join(root, '_methodology/examples/ui-adoption-rehearsal/README.md'), 'utf8');
if (!maturity.includes('项目内可调用') || !maturity.includes('跨项目可直接复用')) throw new Error('Missing reuse-scope boundary in maturity standard');
if (!candidate.includes('复用范围：') || !adoption.includes('来源资产当前复用范围与成熟度')) throw new Error('Reuse-scope boundary missing from candidate or adoption template');
if (!rehearsal.includes('独立业务项目采用')) throw new Error('Golden rehearsal must state its project-adoption limit');
console.log(`PASS UI adoption entry and ${paths.length} source paths`);
