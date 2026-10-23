import { z } from 'zod';

const code = z.string().trim().min(1).max(32).regex(/^[A-Z0-9_-]+$/, '编码只允许大写字母、数字、-、_');
const itemCode = z.string().trim().min(1).max(32).regex(/^[A-Z0-9_.-]+$/, '物料编码只允许大写字母、数字、.、-、_');
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const status = z.enum(['ACTIVE', 'DISABLED']);
const quantity = z.string().regex(/^\d{1,14}(?:\.\d{1,4})?$/, '数量最多四位小数').refine((value) => Number(value) > 0, '数量必须大于零');
const optionalQuantity = z.string().regex(/^\d{1,14}(?:\.\d{1,4})?$/).nullable().optional();
const amount = z.string().regex(/^\d{1,16}(?:\.\d{1,2})?$/, '金额最多两位小数');
const audit = { id: z.string().uuid(), version: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() };
const pagination = z.strictObject({ page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() });

export const itemWriteSchema = z.strictObject({
  itemCode, itemName: z.string().trim().min(1).max(128), itemType: z.enum(['PRODUCT', 'MATERIAL', 'SEMI_FINISHED']),
  itemSource: z.string().trim().max(32).nullable().optional(), itemLifecycle: z.string().trim().max(32).nullable().optional(),
  majorCategoryId: z.string().uuid().nullable().optional(), middleCategoryId: z.string().uuid().nullable().optional(), minorCategoryId: z.string().uuid().nullable().optional(),
  model: nullableText(128), productLine: nullableText(64), baseUnit: z.string().trim().min(1).max(32), batchManaged: z.boolean().default(false),
  status: status.default('ACTIVE'), remark: nullableText(500),
});
export const itemCreateSchema = itemWriteSchema.omit({ itemCode: true, majorCategoryId: true, middleCategoryId: true }).extend({
  majorCategoryId: z.string().uuid(), middleCategoryId: z.string().uuid(),
});
export const itemUpdateSchema = itemWriteSchema.omit({ itemCode: true }).partial().extend({ version: z.number().int().positive() });
export const itemSchema = itemWriteSchema.extend(audit).extend({ majorCategoryName: z.string().nullable(), middleCategoryName: z.string().nullable(), minorCategoryName: z.string().nullable(), itemSourceName: z.string().nullable().optional(), itemLifecycleName: z.string().nullable().optional() });
export const itemListSchema = z.strictObject({ items: z.array(itemSchema), pagination });

export const legalEntityWriteSchema = z.strictObject({
  orgUnitId: z.string().uuid(), entityCode: code, entityName: z.string().trim().min(1).max(128), currencyCode: z.literal('CNY').default('CNY'),
  status: status.default('ACTIVE'), sortNo: z.number().int().min(0).default(0), remark: nullableText(500),
});
export const legalEntityUpdateSchema = legalEntityWriteSchema.omit({ entityCode: true }).partial().extend({ version: z.number().int().positive() });
export const legalEntitySchema = legalEntityWriteSchema.extend(audit).extend({ orgUnitName: z.string() });
export const legalEntityListSchema = z.strictObject({ items: z.array(legalEntitySchema), pagination });

export const warehouseWriteSchema = z.strictObject({
  legalEntityId: z.string().uuid(), warehouseCode: code, warehouseName: z.string().trim().min(1).max(128), warehouseType: z.string().trim().min(1).max(32),
  warehouseNature: z.string().trim().min(1).max(32), status: status.default('ACTIVE'), sortNo: z.number().int().min(0).default(0), remark: nullableText(500),
});
export const warehouseUpdateSchema = warehouseWriteSchema.omit({ warehouseCode: true }).partial().extend({ version: z.number().int().positive() });
export const warehouseSchema = warehouseWriteSchema.extend(audit).extend({ legalEntityName: z.string(), warehouseTypeName: z.string().optional(), warehouseNatureName: z.string().optional() });
export const warehouseListSchema = z.strictObject({ items: z.array(warehouseSchema), pagination });

export const inboundLineWriteSchema = z.strictObject({
  lineNo: z.number().int().positive(), itemCode, batchNo: z.string().trim().max(64).nullable().optional(), originalQty: optionalQuantity,
  actualQty: quantity, amount, remark: nullableText(1000),
});
export const inboundOrderWriteSchema = z.strictObject({
  legalEntityId: z.string().uuid(), warehouseId: z.string().uuid(), documentDate: z.string().date(),
  inboundType: z.enum(['PRODUCTION', 'FINISHED_GOODS', 'TRANSFER', 'STOCK_GAIN']), reasonCode: code,
  factoryCode: code.nullable().optional(), currencyCode: z.literal('CNY').default('CNY'), remark: nullableText(1000),
  version: z.number().int().nonnegative(), lines: z.array(inboundLineWriteSchema).min(1).max(500),
}).superRefine((value, context) => {
  const keys = value.lines.map((line) => `${line.itemCode}:${normalizeBatch(line.batchNo)}`);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: 'custom', path: ['lines'], message: '同一物项和批次不能重复' });
});
export const inventoryCommandSchema = z.strictObject({ version: z.number().int().positive(), requestKey: z.string().uuid(), note: z.string().trim().max(1000).default('') });

export const inboundLineSchema = z.strictObject({
  id: z.string().uuid(), lineNo: z.number().int().positive(), itemCode, itemName: z.string(), batchNo: z.string().nullable(),
  originalQty: z.string().nullable(), actualQty: z.string(), baseUnit: z.string(), amount: z.string(), remark: z.string().nullable(),
});
export const inboundOrderSchema = z.strictObject({
  id: z.string().uuid(), orderNo: z.string(), documentDate: z.string().date(),
  inboundType: z.enum(['PRODUCTION', 'FINISHED_GOODS', 'TRANSFER', 'STOCK_GAIN']),
  status: z.enum(['DRAFT', 'POSTED', 'REVERSED', 'VOIDED']), legalEntityId: z.string().uuid(), warehouseId: z.string().uuid(),
  legalEntityName: z.string(), warehouseName: z.string(),
  factoryCode: z.string().nullable(), reasonCode: z.string(), currencyCode: z.literal('CNY'), remark: z.string().nullable(),
  postedAt: z.string().datetime().nullable(), reversedAt: z.string().datetime().nullable(), version: z.number().int().positive(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(), lines: z.array(inboundLineSchema),
});
export const inboundOrderListSchema = z.strictObject({ items: z.array(inboundOrderSchema), pagination });
export const inventoryBalanceSchema = z.strictObject({
  id: z.string().uuid(), legalEntityId: z.string().uuid(), warehouseId: z.string().uuid(), itemCode, itemName: z.string(),
  legalEntityName: z.string().optional(), warehouseName: z.string().optional(), majorCategoryName: z.string().optional(), middleCategoryName: z.string().optional(), minorCategoryName: z.string().optional(),
  itemType: z.enum(['PRODUCT', 'MATERIAL', 'SEMI_FINISHED']), batchNo: z.string().nullable(), baseUnit: z.string(),
  quantity: z.string(), amount: z.string(), currencyCode: z.literal('CNY'), version: z.number().int().positive(), updatedAt: z.string().datetime(),
});
export const inventoryBalanceListSchema = z.strictObject({ items: z.array(inventoryBalanceSchema), pagination });

export type InboundStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'VOIDED';
export function nextInboundStatus(statusValue: InboundStatus, action: 'post' | 'reverse' | 'void'): InboundStatus {
  if (statusValue === 'DRAFT' && action === 'post') return 'POSTED';
  if (statusValue === 'POSTED' && action === 'reverse') return 'REVERSED';
  if (statusValue === 'DRAFT' && action === 'void') return 'VOIDED';
  throw new Error(`状态 ${statusValue} 不允许执行 ${action}`);
}
export function normalizeBatch(value: string | null | undefined): string { return value?.trim() ?? ''; }

export type ItemWrite = z.infer<typeof itemWriteSchema>;
export type ItemCreate = z.infer<typeof itemCreateSchema>;
export type ItemUpdate = z.infer<typeof itemUpdateSchema>;
export type Item = z.infer<typeof itemSchema>;
export type ItemList = z.infer<typeof itemListSchema>;
export type LegalEntityWrite = z.infer<typeof legalEntityWriteSchema>;
export type LegalEntityUpdate = z.infer<typeof legalEntityUpdateSchema>;
export type LegalEntity = z.infer<typeof legalEntitySchema>;
export type LegalEntityList = z.infer<typeof legalEntityListSchema>;
export type WarehouseWrite = z.infer<typeof warehouseWriteSchema>;
export type WarehouseUpdate = z.infer<typeof warehouseUpdateSchema>;
export type Warehouse = z.infer<typeof warehouseSchema>;
export type WarehouseList = z.infer<typeof warehouseListSchema>;
export type InboundOrderWrite = z.infer<typeof inboundOrderWriteSchema>;
export type InboundOrder = z.infer<typeof inboundOrderSchema>;
export type InboundOrderList = z.infer<typeof inboundOrderListSchema>;
export type InventoryCommand = z.infer<typeof inventoryCommandSchema>;
export type InventoryBalance = z.infer<typeof inventoryBalanceSchema>;
export type InventoryBalanceList = z.infer<typeof inventoryBalanceListSchema>;
