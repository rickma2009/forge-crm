import { z } from 'zod';

export const customerRelatedKindSchema = z.enum(['opportunities', 'quotations', 'sales-orders', 'sales-outbounds']);
export type CustomerRelatedKind = z.infer<typeof customerRelatedKindSchema>;
export const customerRelatedRowSchema = z.object({
  id: z.string().uuid(), code: z.string(), name: z.string(), status: z.string(),
  amount: z.string().nullable(), currency: z.string().nullable(), date: z.string().nullable(),
  owner: z.string().nullable(), stage: z.string().nullable(),
});
export type CustomerRelatedRow = z.infer<typeof customerRelatedRowSchema>;
export const customerRelatedPageSchema = z.object({ items: z.array(customerRelatedRowSchema), pagination: z.object({
  page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
}) });
export type CustomerRelatedPage = z.infer<typeof customerRelatedPageSchema>;
export const customerOverviewSchema = z.object({ items: z.array(z.object({ kind: customerRelatedKindSchema, count: z.number().int().nonnegative().nullable(), error: z.boolean() })) });
export type CustomerOverview = z.infer<typeof customerOverviewSchema>;
