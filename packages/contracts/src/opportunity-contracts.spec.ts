import { describe, expect, it } from 'vitest';
import {
  competitorWriteSchema,
  opportunityAnalysisWriteSchema,
  opportunityProductWriteSchema,
  opportunityWriteSchema,
  productWriteSchema,
  productSchema,
  opportunityStageWriteSchema,
  opportunityStageDeleteSchema,
} from './opportunity';

describe('opportunity contracts', () => {
  it('validates stage identity, integer probability and delete concurrency version', () => {
    const input = { stageCode: ' review ', stageName: ' 需求评审 ', probability: 30 };
    expect(opportunityStageWriteSchema.parse(input)).toMatchObject({ stageCode: 'review', stageName: '需求评审', status: 'ACTIVE', isDefault: false });
    for (const probability of [-1, 101, 0.5]) expect(() => opportunityStageWriteSchema.parse({ ...input, probability })).toThrow();
    expect(() => opportunityStageWriteSchema.parse({ ...input, stageCode: ' ' })).toThrow();
    expect(() => opportunityStageDeleteSchema.parse({})).toThrow();
    expect(() => opportunityStageDeleteSchema.parse({ version: 0 })).toThrow();
  });
  it('requires product identity and normalizes optional values', () => {
    expect(productWriteSchema.parse({ productCode: 'P2026090001', productName: '控制板', status: 'ACTIVE' })).toMatchObject({ productCode: 'P2026090001', productName: '控制板' });
    expect(() => productWriteSchema.parse({ productCode: '', productName: '', status: 'ACTIVE' })).toThrow();
  });

  it('accepts product category names projected for reusable pickers', () => {
    expect(productSchema.parse({
      id: '00000000-0000-4000-8000-000000000001', productCode: 'P1', productName: '控制板', model: null,
      productLine: null, unit: '件', status: 'ACTIVE', remark: null, middleCategoryName: '电子类', minorCategoryName: '控制板类',
      version: 1, createdAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z',
    })).toMatchObject({ middleCategoryName: '电子类', minorCategoryName: '控制板类' });
  });

  it('requires competitor name', () => {
    expect(competitorWriteSchema.parse({ competitorName: '竞品科技', status: 'ACTIVE' }).competitorName).toBe('竞品科技');
    expect(() => competitorWriteSchema.parse({ competitorName: '', status: 'ACTIVE' })).toThrow();
  });

  it('constrains opportunity confidence to an integer percentage', () => {
    const input = { opportunityName: '年度框架项目', customerId: crypto.randomUUID(), ownerUserId: crypto.randomUUID(), templateId: crypto.randomUUID(), stageId: crypto.randomUUID(), confidence: 60, status: 'ACTIVE' };
    expect(opportunityWriteSchema.parse(input).confidence).toBe(60);
    expect(() => opportunityWriteSchema.parse({ ...input, confidence: 101 })).toThrow();
  });

  it('requires positive quantity and non-negative unit price', () => {
    const input = { productId: crypto.randomUUID(), quantity: 2, unitPrice: 100, requirement: '首批交付' };
    expect(opportunityProductWriteSchema.parse(input).quantity).toBe(2);
    expect(() => opportunityProductWriteSchema.parse({ ...input, quantity: 0 })).toThrow();
  });

  it('rejects duplicate primary competitors in one analysis', () => {
    const id = crypto.randomUUID();
    const input = { stageId: crypto.randomUUID(), confidence: 70, competitorIds: [id, id], opportunityPoint: '方案领先', risk: '交付周期', nextPlan: '完成样机', remark: '' };
    expect(() => opportunityAnalysisWriteSchema.parse(input)).toThrow(/不能重复/);
  });
});
