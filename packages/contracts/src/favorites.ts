import { z } from 'zod';

export const favoriteTargetTypes = ['CUSTOMER', 'PRODUCT', 'ITEM', 'OPPORTUNITY', 'QUOTATION', 'SALES_ORDER'] as const;
export const favoriteTargetTypeSchema = z.enum(favoriteTargetTypes);
export const favoriteCreateSchema = z.strictObject({ targetType: favoriteTargetTypeSchema, targetId: z.string().uuid() });
export const favoriteSchema = z.object({
  id: z.string().uuid(), targetType: favoriteTargetTypeSchema, targetId: z.string().uuid(),
  createdAt: z.string().datetime(), objectTypeName: z.string(), objectValue: z.string(),
  available: z.boolean(), routePath: z.string().nullable(),
});
export const favoriteListSchema = z.array(favoriteSchema);
export type FavoriteTargetType = z.infer<typeof favoriteTargetTypeSchema>;
export type FavoriteCreate = z.infer<typeof favoriteCreateSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;
