import { z } from 'zod';
export const activityTypeSchema = z.enum(['VISIT', 'CALL', 'EMAIL', 'FOLLOW_UP', 'NOTE']);
export const activityTypeLabels = { VISIT: '拜访', CALL: '电话', EMAIL: '邮件登记', FOLLOW_UP: '跟进', NOTE: '备注', SYSTEM: '系统事件' } as const;
export const timelineSourceSchema = z.enum(['ACTIVITY', 'FOLLOW_UP', 'STAGE_EVENT', 'STATUS_EVENT', 'AMOUNT_EVENT','GUIDANCE_EVENT']);
export const activityWriteSchema = z.strictObject({
 type: activityTypeSchema, title: z.string().trim().min(1).max(120), occurredAt: z.string().datetime(),
 content: z.string().trim().min(1).max(1000), result: z.string().trim().max(2000).default(''), nextStep: z.string().trim().max(1000).default(''),
 requestId: z.string().uuid(),
});
export const activityUpdateSchema = activityWriteSchema.omit({requestId:true,type:true}).extend({ version:z.number().int().positive(), status:z.enum(['ACTIVE','DISABLED']), reason:z.string().trim().min(1).max(500) });
export const timelineEntrySchema = z.strictObject({
 key:z.string(), sourceType:timelineSourceSchema, sourceId:z.string().uuid(), type:z.enum(['VISIT','CALL','EMAIL','FOLLOW_UP','NOTE','SYSTEM']),
 title:z.string(), content:z.string(), result:z.string(), nextStep:z.string(), occurredAt:z.string().datetime(), recordedAt:z.string().datetime(),
 actorName:z.string(), opportunityId:z.string().uuid().nullable(), version:z.number().int(), status:z.enum(['ACTIVE','DISABLED']), canEdit:z.boolean(),
});
export const timelinePageSchema = z.strictObject({items:z.array(timelineEntrySchema),nextCursor:z.string().nullable(),snapshotAt:z.string().datetime(),canCreate:z.boolean()});
export type TimelineEntry=z.infer<typeof timelineEntrySchema>;
export type TimelinePage=z.infer<typeof timelinePageSchema>;
export type ActivityWrite=z.infer<typeof activityWriteSchema>;
export type ActivityUpdate=z.infer<typeof activityUpdateSchema>;
