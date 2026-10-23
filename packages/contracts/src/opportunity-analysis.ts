import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; }, '日期无效');
export const opportunityAnalyticsQuerySchema = z.object({ orgUnitId: z.string().uuid().optional(), templateId: z.string().uuid().optional(), dateFrom: date.optional(), dateTo: date.optional() }).refine(v => !v.dateFrom || !v.dateTo || v.dateFrom <= v.dateTo, '预签开始日期不能晚于结束日期');
export type OpportunityAnalyticsQuery = z.infer<typeof opportunityAnalyticsQuerySchema>;
export const opportunityAnalyticsSchema = z.object({
  query: z.object({ orgUnitId: z.string().uuid().optional(), templateId: z.string().uuid().optional(), dateFrom: date, dateTo: date }),
  organizations: z.array(z.object({ id: z.string(), name: z.string(), parentId: z.string().nullable() })),
  templates: z.array(z.object({ id: z.string(), name: z.string() })), months: z.array(z.string()).length(6),
  stages: z.array(z.object({ id: z.string(), name: z.string(), templateId: z.string(), templateName: z.string(), probability: z.number(), count: z.number(), amount: z.string(), monthlyAmounts: z.array(z.string()).length(6), missingAmount: z.number() })),
  totals: z.object({ count: z.number(), amount: z.string(), monthlyAmounts: z.array(z.string()).length(6), weightedAmounts: z.array(z.string()).length(6), missingAmount: z.number() }),
});
export type OpportunityAnalytics = z.infer<typeof opportunityAnalyticsSchema>;
export const opportunityAnalyticsRecordsSchema = z.object({ items: z.array(z.object({ id: z.string(), code: z.string(), name: z.string(), customer: z.string(), owner: z.string(), stage: z.string(), businessStatus: z.string(), expectedSignDate: date, amount: z.string().nullable() })), pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }) });
export type OpportunityAnalyticsRecords = z.infer<typeof opportunityAnalyticsRecordsSchema>;
