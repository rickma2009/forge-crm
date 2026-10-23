import { z } from 'zod';
const metricSchema = z.object({ count: z.number().int().nonnegative(), amount: z.string(), missingAmount: z.number().int().nonnegative() });
const itemSchema = z.object({ id: z.string(), requiresResult: z.boolean().optional(), version: z.number().optional(), title: z.string(), description: z.string(), date: z.string().nullable(), path: z.string() });
export const workbenchSchema = z.object({
  month: z.string(), generatedAt: z.string(),
  following: metricSchema.nullable(), signed: metricSchema.nullable(),
  inventory: z.array(z.object({ currency: z.string(), amount: z.string() })).nullable(),
  pending: z.object({ total: z.number(), items: z.array(itemSchema) }),
  warnings: z.object({ total: z.number(), items: z.array(itemSchema) }),
  agentTodos: z.object({ total: z.number(), items: z.array(itemSchema) }),
  opportunityAllowed: z.boolean(),
});
export type Workbench = z.infer<typeof workbenchSchema>;
