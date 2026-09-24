import { z } from 'zod';
import { ApiException } from '../http/api-exceptions';
import { conditionSchema, fieldRuleSchema, type Condition, type Scalar } from '@forge-crm/contracts';
export { dataPolicySchema, type DataPolicy } from '@forge-crm/contracts';

export interface PolicyField { code: string; type: 'string' | 'number' | 'boolean' | 'date'; filterable: boolean }
type Where = Record<string, unknown>;
const invalid = (message: string): never => { throw new ApiException('BAD_REQUEST', 400, message); };

export function compileCondition(raw: unknown, fields: PolicyField[], context: { userId: string }): Where {
  const condition = conditionSchema.parse(raw);
  const compile = (node: Condition): Where => {
    if (node.kind === 'all') return {};
    if (node.kind === 'group') {
      const parts = node.children.map(compile);
      if (node.mode === 'ANY' && parts.some((p) => !Object.keys(p).length)) return {};
      return { [node.mode === 'ALL' ? 'AND' : 'OR']: parts };
    }
    const field = fields.find((f) => f.code === node.field && f.filterable);
    if (!field) return invalid('字段未登记为可查询字段');
    let value: Scalar | Scalar[] = node.value;
    if (node.source === 'context') {
      if (node.value !== 'userId') return invalid('不支持的上下文变量');
      value = context.userId;
    }
    const compatible = (v: Scalar) => v === null || field.type === 'date' ? v === null || typeof v === 'string' && Number.isFinite(Date.parse(v)) : typeof v === field.type;
    if (node.operator === 'isNull') {
      if (typeof value !== 'boolean') return invalid('空值判断必须为布尔值');
      return { [field.code]: value ? null : { not: null } };
    }
    if (node.operator === 'in' || node.operator === 'notIn') {
      if (!Array.isArray(value) || !value.length || !value.every(compatible)) return invalid('集合必须非空且类型匹配');
      return { [field.code]: { [node.operator]: value } };
    }
    if (Array.isArray(value) || !compatible(value)) return invalid('条件值类型不匹配');
    if (['contains', 'startsWith'].includes(node.operator) && (field.type !== 'string' || value === null)) return invalid('该运算符仅支持文本');
    if (['lt', 'lte', 'gt', 'gte'].includes(node.operator) && (!['number', 'date'].includes(field.type) || value === null)) return invalid('该运算符仅支持数值或日期');
    const operator = node.operator === 'eq' ? 'equals' : node.operator === 'ne' ? 'not' : node.operator;
    return { [field.code]: { [operator]: value } };
  };
  return compile(condition);
}

export function combinePolicyWhere(rules: Array<{ effect: 'ALLOW' | 'DENY'; where: Where }>): Where {
  const allows = rules.filter((r) => r.effect === 'ALLOW').map((r) => r.where);
  const denies = rules.filter((r) => r.effect === 'DENY').map((r) => r.where);
  // Empty logical groups may be elided by the ORM when nested in another AND.
  // An empty primary-key set remains an explicit false predicate at every depth.
  if (!allows.length || denies.some((w) => !Object.keys(w).length)) return { id: { in: [] } };
  const allowed = allows.some((w) => !Object.keys(w).length) ? {} : { OR: allows };
  return denies.length ? { AND: [allowed, { NOT: { OR: denies } }] } : allowed;
}

/** Evaluate only compiler-produced predicates for a not-yet-persisted record. */
export function matchesPolicyWhere(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, constraint]) => {
    if (key === 'AND') return Array.isArray(constraint) && constraint.every((part) => matchesPolicyWhere(row, part));
    if (key === 'OR') return Array.isArray(constraint) && constraint.some((part) => matchesPolicyWhere(row, part));
    if (key === 'NOT') return !!constraint && typeof constraint === 'object' && !matchesPolicyWhere(row, constraint as Where);
    const rawValue = row[key] ?? null;
    if (constraint === null) return rawValue === null;
    if (!constraint || typeof constraint !== 'object' || Array.isArray(constraint)) return false;
    return Object.entries(constraint).every(([op, expected]) => {
      const value = rawValue instanceof Date ? rawValue.toISOString() : rawValue;
      if (op === 'equals') return value === expected;
      if (op === 'not') return expected === null ? value !== null : value !== null && value !== expected;
      if (op === 'in') return Array.isArray(expected) && value !== null && expected.includes(value);
      if (op === 'notIn') return Array.isArray(expected) && value !== null && !expected.includes(value);
      if (op === 'contains' || op === 'startsWith') return typeof value === 'string' && typeof expected === 'string' && (op === 'contains' ? value.includes(expected) : value.startsWith(expected));
      if (value === null || expected === null || !['string', 'number'].includes(typeof value) || !['string', 'number'].includes(typeof expected)) return false;
      const left = typeof value === 'number' ? value : Date.parse(String(value));
      const right = typeof expected === 'number' ? expected : Date.parse(String(expected));
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      return op === 'lt' ? left < right : op === 'lte' ? left <= right : op === 'gt' ? left > right : op === 'gte' ? left >= right : false;
    });
  });
}

export function redactFields<T extends Record<string, unknown>>(row: T, rules: Array<z.infer<typeof fieldRuleSchema>>, exporting: boolean): Partial<T> {
  const output: Record<string, unknown> = { ...row };
  for (const field of new Set(rules.map((r) => r.field))) {
    const restrictions = rules.filter((r) => r.field === field);
    if (restrictions.some((r) => !r.visible || exporting && !r.exportable)) { delete output[field]; continue; }
    const masks = restrictions.map((r) => r.mask).filter((mask) => mask !== 'NONE');
    if (!masks.length || output[field] == null) continue;
    const text = String(output[field]);
    // Different masks cannot relax each other: ambiguous combinations are fully redacted.
    if (new Set(masks).size > 1) output[field] = '***';
    else if (masks[0] === 'PHONE') output[field] = text.length >= 7 ? text.slice(0, 3) + '*'.repeat(text.length - 7) + text.slice(-4) : '***';
    else if (masks[0] === 'AMOUNT') { const number = Number(text); output[field] = Number.isFinite(number) ? `${Math.floor(number / 1000) * 1000}–${Math.floor(number / 1000) * 1000 + 999}` : '***'; }
    else output[field] = text.length > 4 ? text.slice(0, 2) + '***' + text.slice(-2) : '***';
  }
  return output as Partial<T>;
}
