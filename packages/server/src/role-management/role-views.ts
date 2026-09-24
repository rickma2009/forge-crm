import { z } from 'zod';

export const roleViewAssignmentSchema = z.strictObject({
  version: z.number().int().positive(),
  viewIds: z.array(z.string().uuid()).max(500).refine((ids) => new Set(ids).size === ids.length, '视图不可重复'),
});
