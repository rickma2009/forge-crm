import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function loadRehearsalRecipe(root, code) {
  if (!/^CMP-\d{2}$/.test(code)) throw new Error('Invalid rehearsal component code');
  const source = `_methodology/components/rehearsals/${code}.json`;
  const file = path.join(root, source);
  if (!fs.existsSync(file)) throw new Error(`No rehearsal fixture for ${code}`);
  const bytes = fs.readFileSync(file), recipe = JSON.parse(bytes);
  const identifier = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(value);
  const list = (value, validate) => value === undefined || (Array.isArray(value) && value.length > 0 && new Set(value).size === value.length && value.every(validate));
  const known = new Set(['fixture', 'symbol', 'title', 'entry', 'exports', 'dependencies']);
  if (!recipe || Array.isArray(recipe) || Object.keys(recipe).some(key => !known.has(key)) ||
      typeof recipe.fixture !== 'string' || !/^[a-z][a-z0-9-]*$/.test(recipe.fixture) ||
      !identifier(recipe.symbol) || typeof recipe.title !== 'string' || !recipe.title.trim() || /[<>]/.test(recipe.title) ||
      (recipe.entry !== undefined && (typeof recipe.entry !== 'string' || !/^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*$/.test(recipe.entry))) ||
      !list(recipe.exports, identifier) || !list(recipe.dependencies, value => typeof value === 'string' && /^(?:@[a-z0-9-]+\/)?[a-z][a-z0-9-]*$/.test(value))) {
    throw new Error(`Invalid rehearsal recipe: ${source}`);
  }
  return { recipe, evidence: { source, sha256: createHash('sha256').update(bytes).digest('hex') } };
}
