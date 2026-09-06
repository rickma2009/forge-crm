import projectionData from './patterns.data.json';
import type { PatternDefinition, PatternFilters, PatternProjection, ValidationSliceDefinition } from './types';

const projection = projectionData as PatternProjection;
const patterns = projection.patterns;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function normalizeFilters(filters: PatternFilters | string | undefined): PatternFilters {
  return typeof filters === 'string' ? { query: filters } : (filters ?? {});
}

export function listPatterns(filters?: PatternFilters | string): PatternDefinition[] {
  const { query = '', maturity = 'all', demoAvailability = 'all' } = normalizeFilters(filters);
  const normalizedQuery = normalize(query);

  return patterns.filter((pattern) => {
    const matchesQuery = !normalizedQuery || normalize([
      pattern.name,
      pattern.id,
      pattern.kind,
      pattern.category,
      ...pattern.keywords,
      ...pattern.summary.appliesWhen,
    ].join(' ')).includes(normalizedQuery);
    const matchesMaturity = maturity === 'all' || pattern.maturity === maturity;
    const hasDemo = pattern.demos.length > 0;
    const matchesDemo = demoAvailability === 'all'
      || (demoAvailability === 'available' ? hasDemo : !hasDemo);
    return matchesQuery && matchesMaturity && matchesDemo;
  });
}

export function getPattern(patternId: string): PatternDefinition | null {
  return patterns.find((pattern) => pattern.id === patternId) ?? null;
}

export function getValidationSlice(validationId: string): ValidationSliceDefinition | null {
  return projection.validations.find((validation) => validation.validationId === validationId) ?? null;
}

export function listValidationSlices(): ValidationSliceDefinition[] {
  return [...projection.validations];
}

export function resolvePatternId(candidate: string | null): string {
  return candidate && getPattern(candidate) ? candidate : patterns[0].id;
}
