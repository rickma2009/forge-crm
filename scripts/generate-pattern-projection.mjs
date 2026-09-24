import fs from 'node:fs';
import { buildPatternProjection, projectionPath, serializePatternProjection } from './pattern-projection.mjs';

fs.writeFileSync(projectionPath, serializePatternProjection(buildPatternProjection()));
console.log('WROTE packages/web/src/catalog/patterns.data.json');
