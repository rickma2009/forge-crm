import fs from 'node:fs';
import { buildPatternProjection, projectionPath, serializePatternProjection } from './pattern-projection.mjs';

fs.writeFileSync(projectionPath, serializePatternProjection(buildPatternProjection()));
console.log('WROTE src/catalog/patterns.data.json');
