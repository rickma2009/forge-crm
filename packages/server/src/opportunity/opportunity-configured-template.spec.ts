import { OpportunityService } from './opportunity.service';
import type { DatabaseService } from '../database/database.service';

const id = (digit: string) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const app = { id: id('1'), tenantId: id('2') };
const chosen = { id: id('3'), templateCode: 'public', templateName: '公共', status: 'ACTIVE' };
const stage = { id: id('4'), templateId: chosen.id, stageName: '初始线索', probability: 10, status: 'ACTIVE' };
const input = { opportunityName: '测试商机', customerId: id('5'), ownerUserId: id('6'), templateId: id('7'), stageId: stage.id, source: null, partner: null, remark: null };
function fixture(value: string | null) {
  const tx = {
    sysParameter: { findFirst: jest.fn().mockResolvedValue({ value }) },
    sdOppTemplate: { findFirst: jest.fn().mockResolvedValue(chosen) },
    crmCustomer: { findFirst: jest.fn().mockResolvedValue({ customerName: '测试客户' }) },
    iamUser: { findFirst: jest.fn().mockResolvedValue({ displayName: '测试销售' }) },
    sdOppStage: { findFirst: jest.fn().mockResolvedValue(stage) },
    sdOpp: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: id('8') }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: id('8') }) },
    mdItem: { findMany: jest.fn().mockResolvedValue([]) },
    sdOppProduct: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const db = { sysApplication: { findFirst: jest.fn().mockResolvedValue(app) }, $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
  const service = new OpportunityService(db as unknown as DatabaseService, { allocate: jest.fn().mockResolvedValue('OP2026100400001') } as never);
  Object.assign(service, { opp: (row: unknown) => row });
  return { service, tx };
}
describe('new opportunity configured stage template', () => {
  it('uses the system parameter even when a client sends another template ID', async () => {
    const { service, tx } = fixture('public');
    await service.createOpportunity('demo-portal', id('9'), 'admin', input);
    expect(tx.sdOpp.create).toHaveBeenCalledWith({ data: expect.objectContaining({ templateId: chosen.id, templateName: '公共', stageId: stage.id, stageName: '初始线索' }) });
    expect(tx.sdOppTemplate.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ templateCode: 'public', status: 'ACTIVE' }) });
  });
  it('does not create an opportunity when the configured template is missing', async () => {
    const { service, tx } = fixture(null);
    await expect(service.createOpportunity('demo-portal', id('9'), 'admin', input)).rejects.toThrow('未设置有效商机阶段模板');
    expect(tx.sdOpp.create).not.toHaveBeenCalled();
  });
});
