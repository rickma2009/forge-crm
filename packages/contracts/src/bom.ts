import { z } from 'zod';

const positiveDecimal = z.string().regex(/^\d{1,14}(?:\.\d{1,4})?$/, '数量最多四位小数').refine((value) => Number(value) > 0, '数量必须大于零');
const lineCode = z.string().trim().min(1).max(32).regex(/^[A-Z0-9_-]+$/);
export const bomAlternativeWriteSchema = z.strictObject({ itemId: z.string().uuid(), priority: z.number().int().positive(), ratio: positiveDecimal });
export const bomLineWriteSchema = z.strictObject({ lineCode, itemId: z.string().uuid(), quantity: positiveDecimal, sortNo: z.number().int().min(0), childBomId: z.string().uuid().nullable(), alternatives: z.array(bomAlternativeWriteSchema).max(20) });
export const bomCreateSchema = z.strictObject({ itemId: z.string().uuid(), baseQuantity: positiveDecimal.default('1') });
export const bomSaveSchema = z.strictObject({ rowVersion: z.number().int().positive(), baseQuantity: positiveDecimal, lines: z.array(bomLineWriteSchema).max(500) }).superRefine((value, context) => {
  const codes = value.lines.map((line) => line.lineCode);
  if (new Set(codes).size !== codes.length) context.addIssue({ code: 'custom', path: ['lines'], message: '组件行编码不能重复' });
  value.lines.forEach((line, index) => {
    const alternatives = line.alternatives;
    if (new Set(alternatives.map((x) => x.itemId)).size !== alternatives.length) context.addIssue({ code: 'custom', path: ['lines', index, 'alternatives'], message: '同一物料不能重复作为替代料' });
    if (new Set(alternatives.map((x) => x.priority)).size !== alternatives.length) context.addIssue({ code: 'custom', path: ['lines', index, 'alternatives'], message: '替代料优先级不能重复' });
    if (alternatives.some((x) => x.itemId === line.itemId)) context.addIssue({ code: 'custom', path: ['lines', index, 'alternatives'], message: '原物料不能替代自身' });
  });
});
export const bomCommandSchema = z.strictObject({ rowVersion: z.number().int().positive() });
export const bomListRowSchema = z.strictObject({ id: z.string().uuid(), itemId: z.string().uuid(), itemCode: z.string(), itemName: z.string(), itemType: z.enum(['PRODUCT', 'SEMI_FINISHED']), bomCode: z.string(), revision: z.number().int().positive(), status: z.enum(['DRAFT', 'PUBLISHED']), isCurrent: z.boolean(), baseQuantity: z.string(), baseUnit: z.string(), lineCount: z.number().int().nonnegative(), rowVersion: z.number().int().positive(), updatedAt: z.string().datetime() });
export const bomListSchema = z.strictObject({ items: z.array(bomListRowSchema), pagination: z.strictObject({ page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() }) });
export const bomAlternativeSchema = bomAlternativeWriteSchema.extend({ id: z.string().uuid(), itemCode: z.string(), itemName: z.string(), baseUnit: z.string() });
export const bomTreeLineSchema: z.ZodType<BomTreeLine> = z.lazy(() => z.strictObject({ id: z.string().uuid(), bomId: z.string().uuid(), lineCode: z.string(), itemId: z.string().uuid(), itemCode: z.string(), itemName: z.string(), itemType: z.enum(['PRODUCT', 'MATERIAL', 'SEMI_FINISHED']), quantity: z.string(), baseUnit: z.string(), sortNo: z.number(), childBomId: z.string().uuid().nullable(), childBomRevision: z.number().int().positive().nullable(), cumulativeQuantity: z.string(), alternatives: z.array(bomAlternativeSchema), children: z.array(bomTreeLineSchema) }));
export const bomDetailSchema = bomListRowSchema.extend({ lines: z.array(bomTreeLineSchema) });
export const bomPreviewSchema = z.strictObject({ valid: z.boolean(), errors: z.array(z.strictObject({ row: z.number().int().positive(), message: z.string() })), added: z.number().int().nonnegative(), removed: z.number().int().nonnegative(), changed: z.number().int().nonnegative() });

export type BomAlternativeWrite = z.infer<typeof bomAlternativeWriteSchema>;
export type BomLineWrite = z.infer<typeof bomLineWriteSchema>;
export type BomSave = z.infer<typeof bomSaveSchema>;
export type BomListRow = z.infer<typeof bomListRowSchema>;
export type BomTreeLine = { id: string; bomId: string; lineCode: string; itemId: string; itemCode: string; itemName: string; itemType: 'PRODUCT' | 'MATERIAL' | 'SEMI_FINISHED'; quantity: string; baseUnit: string; sortNo: number; childBomId: string | null; childBomRevision: number | null; cumulativeQuantity: string; alternatives: z.infer<typeof bomAlternativeSchema>[]; children: BomTreeLine[] };
export type BomDetail = z.infer<typeof bomDetailSchema>;
