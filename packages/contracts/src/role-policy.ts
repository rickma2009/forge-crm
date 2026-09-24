import { z } from 'zod';

export type Scalar = string | number | boolean | null;
export type Condition = { kind: 'all' } | { kind: 'group'; mode: 'ALL' | 'ANY'; children: Condition[] } | { kind: 'condition'; field: string; operator: 'eq' | 'ne' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'lt' | 'lte' | 'gt' | 'gte' | 'isNull'; source: 'literal' | 'context'; value: Scalar | Scalar[] };
const scalar = z.union([z.string().max(512), z.number().finite(), z.boolean(), z.null()]);
const expression: z.ZodType<Condition> = z.lazy(() => z.union([
  z.strictObject({ kind: z.literal('all') }),
  z.strictObject({ kind: z.literal('group'), mode: z.enum(['ALL', 'ANY']), children: z.array(expression).min(1).max(20) }),
  z.strictObject({ kind: z.literal('condition'), field: z.string().min(1).max(128), operator: z.enum(['eq', 'ne', 'in', 'notIn', 'contains', 'startsWith', 'lt', 'lte', 'gt', 'gte', 'isNull']), source: z.enum(['literal', 'context']), value: z.union([scalar, z.array(scalar).max(100)]) }),
]));
function depth(node: Condition, level = 0): number { return node.kind === 'group' ? Math.max(...node.children.map((child) => depth(child, level + 1))) : level; }
export const conditionSchema = expression.refine((node) => depth(node) <= 6, '条件嵌套不能超过 6 层');
export const fieldRuleSchema = z.strictObject({ field: z.string().min(1).max(128), visible: z.boolean(), writable: z.boolean(), exportable: z.boolean(), mask: z.enum(['NONE', 'PHONE', 'AMOUNT', 'PARTIAL']) }).refine((rule) => !rule.exportable || rule.visible, '隐藏字段不能导出');
export const dataPolicySchema = z.strictObject({
  rules: z.array(z.strictObject({ name: z.string().trim().min(1).max(128), enabled: z.boolean(), effect: z.enum(['ALLOW', 'DENY']), condition: conditionSchema })).max(100),
  fields: z.array(fieldRuleSchema).max(200).refine((fields) => new Set(fields.map((f) => f.field)).size === fields.length, '字段限制不可重复'),
});
export type DataPolicy = z.infer<typeof dataPolicySchema>;
