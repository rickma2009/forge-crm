import { z } from 'zod';

/** Shared server-side grid contract. Unknown fields are rejected, never interpolated. */
export const columnFiltersSchema = z.preprocess((raw) => typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw, z.record(z.string().max(255)).refine((filters) => Object.keys(filters).length <= 30)).optional();
export type GridField = 'text' | 'boolean' | 'date' | 'uuid' | readonly string[];
export function gridWhere(filters: Record<string, string> | undefined, fields: Record<string, GridField>): Record<string, unknown>[] {
  return Object.entries(filters ?? {}).filter(([, value]) => value !== '').map(([key, value]) => {
    const kind = fields[key];
    if (!kind) throw new Error(`不支持筛选字段：${key}`);
    if (kind === 'text') return { [key]: { contains: value, mode: 'insensitive' } };
    if (kind === 'boolean') return { [key]: z.enum(['true', 'false']).parse(value) === 'true' };
    if (kind === 'uuid') return { [key]: z.string().uuid().parse(value) };
    if (kind === 'date') {
      const day = z.string().date().parse(value), start = new Date(`${day}T00:00:00.000Z`), end = new Date(start.getTime() + 86400000);
      return { [key]: { gte: start, lt: end } };
    }
    if (!kind.includes(value)) throw new Error(`无效筛选值：${key}`);
    return { [key]: value };
  });
}
