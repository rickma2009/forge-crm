import { z } from 'zod';

export const attachmentOwnerTypeSchema = z.enum(['PRODUCT', 'SALES_ACTIVITY', 'OPPORTUNITY_FOLLOW_UP', 'RECORD_COMMENT']);
export const attachmentTypeSchema = z.enum(['PDF', 'EXCEL', 'IMAGE', 'OTHER']);
export const attachmentStatusSchema = z.enum(['ACTIVE', 'DELETE_PENDING', 'DELETE_FAILED']);
export const attachmentUpdateSchema = z.strictObject({
  version: z.number().int().positive(),
  description: z.string().trim().max(1000).nullable(),
  fileVersion: z.string().trim().max(64).nullable(),
});
export const attachmentMetaSchema = z.strictObject({
  id: z.string().uuid(), ownerType: attachmentOwnerTypeSchema, ownerId: z.string().uuid(),
  originalName: z.string().min(1).max(255), attachmentType: attachmentTypeSchema,
  mimeType: z.string().min(1).max(128), fileSize: z.number().int().positive(),
  description: z.string().nullable(), fileVersion: z.string().nullable(), status: attachmentStatusSchema,
  version: z.number().int().positive(), createdBy: z.string().uuid(), updatedBy: z.string().uuid(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
export const attachmentListSchema = z.array(attachmentMetaSchema);
export type AttachmentMeta = z.infer<typeof attachmentMetaSchema>;
export type AttachmentUpdate = z.infer<typeof attachmentUpdateSchema>;
