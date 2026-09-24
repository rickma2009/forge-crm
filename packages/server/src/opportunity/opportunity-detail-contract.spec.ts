import { opportunityDetailSchema } from '@interaction-pattern-lab/contracts';
import { OpportunityService } from './opportunity.service';
import type { DatabaseService } from '../database/database.service';

const id = '11111111-1111-4111-8111-111111111111';
const date = new Date('2026-09-23T00:00:00.000Z');
const opportunity = {
  id, opportunityCode: 'OP-001', opportunityName: '商机', customerId: id, customerName: '客户',
  contactId: null, contactName: null, ownerUserId: id, ownerName: '销售', source: null,
  templateId: id, templateName: '默认', stageId: id, stageName: '初步接触', stageProbability: 10,
  confidence: 20, confirmedDate: null, expectedSignDate: null, customerBudget: null,
  expectedAmount: null, partner: null, status: 'ACTIVE', remark: null,
  version: 1, createdAt: date, updatedAt: date, products: [], followUps: [],
};
const analysis = {
  id, opportunityId: id, opportunityName: '商机', stageId: id, stageName: '初步接触',
  stageProbability: 10, confidence: 20, opportunityPoint: '机会', risk: '风险', nextPlan: '计划',
  remark: null, analystUserId: id, analystName: '销售', analyzedAt: date,
  competitors: [{ id, analysisId: id, competitorId: id, competitorName: '竞争对手', rank: 1 }],
};

describe('opportunity detail wire contract', () => {
  it.each([{ analyses: [] }, { analyses: [analysis] }])('projects database relations into the strict public response (%j)', async ({ analyses }) => {
    const db = {
      sysApplication: { findFirst: jest.fn().mockResolvedValue({ id: 'app', tenantId: 'tenant' }) },
      sdOpp: { findFirst: jest.fn().mockResolvedValue({ ...opportunity, analyses }) },
    };
    const result = await new OpportunityService(db as unknown as DatabaseService).detail('demo', id);
    expect(() => opportunityDetailSchema.parse(result)).not.toThrow();
    if (analyses.length) expect(result.analyses[0].competitors[0]).toEqual({ id, competitorId: id, competitorName: '竞争对手', rank: 1 });
    expect(db.sdOpp.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id, applicationId: 'app' } }));
  });
});
