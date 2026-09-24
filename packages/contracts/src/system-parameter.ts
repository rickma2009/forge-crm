import { z } from 'zod';

export const parameterCodeSchema = z.enum(['DEFAULT_LEGAL_ENTITY', 'DEFAULT_WAREHOUSE']);
export type ParameterCode = z.infer<typeof parameterCodeSchema>;
export const parameterUpdateSchema = z.object({
  value: z.string().max(1000).nullable(), status: z.enum(['ACTIVE', 'DISABLED']), version: z.number().int().positive(),
}).strict();
export type ParameterUpdate = z.infer<typeof parameterUpdateSchema>;
export const systemParameterSchema = z.object({
  id: z.string().uuid(), parameterCode: parameterCodeSchema, parameterName: z.string(), value: z.string().nullable(),
  usageNote: z.string(), sortNo: z.number().int(),
  status: z.enum(['ACTIVE', 'DISABLED']), version: z.number().int().positive(),
}).strict();
export type SystemParameter = z.infer<typeof systemParameterSchema>;
export const parameterListSchema = z.object({ items: z.array(systemParameterSchema), pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }) }).strict();
export type ParameterList = z.infer<typeof parameterListSchema>;
export const parameterSaveSchema = z.object({ notice: z.string().nullable() }).strict();
