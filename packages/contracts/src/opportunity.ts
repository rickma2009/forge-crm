import { z } from 'zod';

const statusSchema = z.enum(['ACTIVE', 'DISABLED']);
const nullableText = (max: number) => z.string().trim().max(max).optional().nullable();
const auditFields = {
  id: z.string().uuid(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
const pageSchema = z.strictObject({ page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() });

export const productWriteSchema = z.strictObject({
  productCode: z.string().trim().min(1).max(32),
  productName: z.string().trim().min(1).max(128),
  model: nullableText(128), productLine: nullableText(64), unit: nullableText(32),
  status: statusSchema.default('ACTIVE'), remark: nullableText(500),
});
export const productUpdateSchema = productWriteSchema.partial().extend({ version: z.number().int().positive() });
export const productDeleteSchema = z.strictObject({ version: z.number().int().positive() });
export const productSchema = productWriteSchema.extend(auditFields);
export const productListSchema = z.strictObject({ items: z.array(productSchema), pagination: pageSchema });

export const competitorWriteSchema = z.strictObject({
  competitorName: z.string().trim().min(1).max(128),
  industryPosition: nullableText(128), location: nullableText(256), mainProducts: nullableText(1000),
  strengths: nullableText(2000), weaknesses: nullableText(2000), status: statusSchema.default('ACTIVE'), remark: nullableText(500),
});
export const competitorUpdateSchema = competitorWriteSchema.partial().extend({ version: z.number().int().positive() });
export const competitorSchema = competitorWriteSchema.extend(auditFields);
export const competitorListSchema = z.strictObject({ items: z.array(competitorSchema), pagination: pageSchema });

export const opportunityStageSchema = z.strictObject({
  ...auditFields, templateId: z.string().uuid(), stageCode: z.string().min(1).max(32), stageName: z.string().min(1).max(128),
  probability: z.number().int().min(0).max(100), isDefault: z.boolean(), sortNo: z.number().int().min(0), status: statusSchema,
});
export const opportunityTemplateSchema = z.strictObject({
  ...auditFields, templateCode: z.string().min(1).max(32), templateName: z.string().min(1).max(128), isDefault: z.boolean(), status: statusSchema,
  stages: z.array(opportunityStageSchema),
});
export const opportunityTemplateListSchema = z.array(opportunityTemplateSchema);
export const opportunityStageWriteSchema = z.strictObject({
  stageCode: z.string().trim().min(1).max(32), stageName: z.string().trim().min(1).max(128),
  probability: z.number().int().min(0).max(100), isDefault: z.boolean().default(false),
  sortNo: z.number().int().min(0).max(2147483647).default(0), status: statusSchema.default('ACTIVE'),
});
export const opportunityStageDeleteSchema = z.strictObject({ version: z.number().int().positive() });
export const opportunityStageUpdateSchema = z.strictObject({
  stageName: z.string().trim().min(1).max(128).optional(), probability: z.number().int().min(0).max(100).optional(),
  isDefault: z.boolean().optional(), sortNo: z.number().int().min(0).optional(), status: statusSchema.optional(), version: z.number().int().positive(),
});

export const opportunityProductWriteSchema = z.strictObject({
  productId: z.string().uuid(), quantity: z.number().positive(), unitPrice: z.number().nonnegative(), requirement: nullableText(1000), sortNo: z.number().int().min(0).default(0),
});
export const opportunityProductSchema = z.strictObject({
  ...auditFields, opportunityId: z.string().uuid(), productId: z.string().uuid(), productCode: z.string(), productName: z.string(), model: z.string().nullable(),
  quantity: z.number(), unitPrice: z.number(), expectedAmount: z.number(), requirement: z.string().nullable(), sortNo: z.number().int(),
});

export const opportunityWriteSchema = z.strictObject({
  opportunityName: z.string().trim().min(1).max(200), customerId: z.string().uuid(), contactId: z.string().uuid().optional().nullable(),
  ownerUserId: z.string().uuid(), source: nullableText(128), templateId: z.string().uuid(), stageId: z.string().uuid(),
  confidence: z.number().int().min(0).max(100).default(0), confirmedDate: z.string().date().optional().nullable(), expectedSignDate: z.string().date().optional().nullable(),
  customerBudget: z.number().nonnegative().optional().nullable(), expectedAmount: z.union([z.number().nonnegative(), z.string().regex(/^\d{1,16}(?:\.\d{1,2})?$/, '预计金额最多两位小数')]).optional().nullable(), partner: nullableText(200),
  status: statusSchema.default('ACTIVE'), remark: nullableText(1000), products: z.array(opportunityProductWriteSchema).max(200).default([]),
});
export const opportunityUpdateSchema = opportunityWriteSchema.partial().extend({ version: z.number().int().positive() });
export const opportunitySchema = z.strictObject({
  ...auditFields, opportunityCode: z.string(), opportunityName: z.string(), customerId: z.string().uuid(), customerName: z.string(),
  contactId: z.string().uuid().nullable(), contactName: z.string().nullable(), ownerUserId: z.string().uuid(), ownerName: z.string(), source: z.string().nullable(),
  templateId: z.string().uuid(), templateName: z.string(), stageId: z.string().uuid(), stageName: z.string(), stageProbability: z.number().int(), confidence: z.number().int(),
  confirmedDate: z.string().nullable(), expectedSignDate: z.string().nullable(), customerBudget: z.number().nullable(), expectedAmount: z.number().nullable(),
  expectedAmountExact: z.string().nullable().optional(),
  partner: z.string().nullable(), status: statusSchema, remark: z.string().nullable(), products: z.array(opportunityProductSchema).optional(),
});
export const opportunityListSchema = z.strictObject({ items: z.array(opportunitySchema), pagination: pageSchema });

export const opportunityFollowUpWriteSchema = z.strictObject({
  followedAt: z.string().datetime(), workItem: z.string().trim().min(1).max(1000), resultNext: nullableText(2000), status: statusSchema.default('ACTIVE'),
});
export const opportunityFollowUpUpdateSchema = opportunityFollowUpWriteSchema.partial().extend({ version: z.number().int().positive() });
export const opportunityFollowUpSchema = z.strictObject({
  ...auditFields, opportunityId: z.string().uuid(), followedAt: z.string().datetime(), followerUserId: z.string().uuid(), followerName: z.string(),
  workItem: z.string(), resultNext: z.string().nullable(), status: statusSchema,
});

export const opportunityAnalysisWriteSchema = z.strictObject({
  stageId: z.string().uuid(), confidence: z.number().int().min(0).max(100), competitorIds: z.array(z.string().uuid()).max(2).default([]),
  opportunityPoint: z.string().trim().min(1).max(2000), risk: z.string().trim().min(1).max(2000), nextPlan: z.string().trim().min(1).max(2000), remark: nullableText(1000),
  opportunityVersion: z.number().int().positive().optional(),
}).superRefine((value, context) => {
  if (new Set(value.competitorIds).size !== value.competitorIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['competitorIds'], message: '主要竞争对手不能重复' });
});
export const opportunityAnalysisSchema = z.strictObject({
  id: z.string().uuid(), opportunityId: z.string().uuid(), opportunityName: z.string(), stageId: z.string().uuid(), stageName: z.string(), stageProbability: z.number().int(),
  confidence: z.number().int(), opportunityPoint: z.string(), risk: z.string(), nextPlan: z.string(), remark: z.string().nullable(), analystUserId: z.string().uuid(),
  analystName: z.string(), analyzedAt: z.string().datetime(), competitors: z.array(z.strictObject({ id: z.string().uuid(), competitorId: z.string().uuid(), competitorName: z.string(), rank: z.number().int() })),
});

export const opportunityDetailSchema = z.strictObject({
  opportunity: opportunitySchema.extend({ products: z.array(opportunityProductSchema) }),
  followUps: z.array(opportunityFollowUpSchema), analyses: z.array(opportunityAnalysisSchema),
});

export type Product = z.infer<typeof productSchema>;
export type ProductWrite = z.infer<typeof productWriteSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type ProductList = z.infer<typeof productListSchema>;
export type Competitor = z.infer<typeof competitorSchema>;
export type CompetitorWrite = z.infer<typeof competitorWriteSchema>;
export type CompetitorUpdate = z.infer<typeof competitorUpdateSchema>;
export type CompetitorList = z.infer<typeof competitorListSchema>;
export type OpportunityTemplate = z.infer<typeof opportunityTemplateSchema>;
export type OpportunityStageUpdate = z.infer<typeof opportunityStageUpdateSchema>;
export type OpportunityStageWrite = z.infer<typeof opportunityStageWriteSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type OpportunityWrite = z.infer<typeof opportunityWriteSchema>;
export type OpportunityUpdate = z.infer<typeof opportunityUpdateSchema>;
export type OpportunityList = z.infer<typeof opportunityListSchema>;
export type OpportunityProductWrite = z.infer<typeof opportunityProductWriteSchema>;
export type OpportunityFollowUp = z.infer<typeof opportunityFollowUpSchema>;
export type OpportunityFollowUpWrite = z.infer<typeof opportunityFollowUpWriteSchema>;
export type OpportunityFollowUpUpdate = z.infer<typeof opportunityFollowUpUpdateSchema>;
export type OpportunityAnalysis = z.infer<typeof opportunityAnalysisSchema>;
export type OpportunityAnalysisWrite = z.infer<typeof opportunityAnalysisWriteSchema>;
export type OpportunityDetail = z.infer<typeof opportunityDetailSchema>;
