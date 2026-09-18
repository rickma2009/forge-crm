import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const guide = fs.readFileSync(path.join(root, '_methodology/templates/ui/ADOPTION.md'), 'utf8');
const paths = [...guide.matchAll(/`((?:interaction-pattern-lab|_methodology)\/[^`]+)`/g)].map(m => m[1]);
for (const item of paths) if (!fs.existsSync(path.join(root, item))) throw new Error(`Broken adoption source: ${item}`);
for (const name of ['_methodology/templates/ui/adoption-record-template.md', '_methodology/examples/ui-adoption-rehearsal/README.md', '_methodology/scripts/rehearse-ui-adoption.mjs']) {
  if (!fs.existsSync(path.join(root, name))) throw new Error(`Missing adoption asset: ${name}`);
}
console.log(`PASS UI adoption entry and ${paths.length} source paths`);
