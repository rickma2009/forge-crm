import { z } from 'zod';

const quantity = z.string().regex(/^\d{1,14}(?:\.\d{1,4})?$/).refine((value) => Number(value) > 0, '数量必须大于零');
const price = z.string().regex(/^\d{1,12}(?:\.\d{1,6})?$/);
const rate = z.string().regex(/^(?:0(?:\.\d{1,4})?|1(?:\.0{1,4})?)$/);

export const salesOrderLineWriteSchema = z.strictObject({
  itemId: z.string().uuid(), sourceLineId: z.string().uuid().nullable().optional(),
  quantity, unitPrice: price, discount: rate, taxRate: rate,
  sortNo: z.number().int().positive(), remark: z.string().trim().max(1000).default(''),
});

export const salesOrderWriteSchema = z.strictObject({
  version: z.number().int().nonnegative(), orderDate: z.string().date(),
  sourceType: z.enum(['MANUAL', 'OPPORTUNITY', 'QUOTATION']), sourceId: z.string().uuid().nullable().optional(),
  customerId: z.string().uuid(), salespersonId: z.string().uuid(),
  organizationId: z.string().uuid().nullable().optional(), region: z.string().trim().min(1).max(64),
  orderType: z.enum(['NORMAL', 'SAMPLE', 'REPLACEMENT']), discount: rate,
  remark: z.string().trim().max(1000).default(''),
  lines: z.array(salesOrderLineWriteSchema).max(500),
}).superRefine((value, context) => {
  if (value.sourceType === 'MANUAL' && value.sourceId) context.addIssue({ code: 'custom', path: ['sourceId'], message: '按客户新建不能关联来源单' });
  if (value.sourceType !== 'MANUAL' && !value.sourceId) context.addIssue({ code: 'custom', path: ['sourceId'], message: '请选择来源单' });
});

export const salesOutboundLineWriteSchema = z.strictObject({
  orderLineId: z.string().uuid(), batchNo: z.string().trim().max(64).nullable().optional(),
  quantity, remark: z.string().trim().max(1000).default(''),
});

export const salesOutboundWriteSchema = z.strictObject({
  version: z.number().int().nonnegative(), orderId: z.string().uuid(), documentDate: z.string().date(),
  warehouseId: z.string().uuid(), shipperId: z.string().uuid(), remark: z.string().trim().max(1000).default(''),
  lines: z.array(salesOutboundLineWriteSchema).min(1).max(500),
});

export const salesCommandSchema = z.strictObject({
  version: z.number().int().positive(), requestKey: z.string().uuid(), note: z.string().trim().max(1000).default(''),
});

export type SalesOrderWrite = z.infer<typeof salesOrderWriteSchema>;
export type SalesOutboundWrite = z.infer<typeof salesOutboundWriteSchema>;
export type SalesCommand = z.infer<typeof salesCommandSchema>;
