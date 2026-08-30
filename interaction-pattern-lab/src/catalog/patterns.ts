import patternData from './patterns.data.json';
import type { PatternDefinition } from './types';

const patterns = patternData as PatternDefinition[];

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

export function listPatterns(query = ''): PatternDefinition[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [...patterns];

  return patterns.filter((pattern) => normalize([
    pattern.name,
    pattern.id,
    pattern.category,
    ...pattern.keywords,
  ].join(' ')).includes(normalizedQuery));
}

export function getPattern(patternId: string): PatternDefinition | null {
  return patterns.find((pattern) => pattern.id === patternId) ?? null;
}

export function resolvePatternId(candidate: string | null): string {
  return candidate && getPattern(candidate) ? candidate : patterns[0].id;
}
