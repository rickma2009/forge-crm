import { OpportunityService } from './opportunity.service';
import type { DatabaseService } from '../database/database.service';

const templateId = '11111111-1111-4111-8111-111111111111';
const stageId = '22222222-2222-4222-8222-222222222222';
const existing = { id: stageId, templateId, stageCode: 'review', stageName: '评审', probability: 30, isDefault: false, status: 'ACTIVE', version: 1, sortNo: 20 };
function fixture() {
  const tx = {
    sdOppTemplate: { findFirst: jest.fn().mockResolvedValue({ id: templateId }), update: jest.fn() },
    sdOppStage: { findFirst: jest.fn().mockResolvedValue(existing), count: jest.fn().mockResolvedValue(1), create: jest.fn().mockResolvedValue({ id: stageId }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    sdOpp: { count: jest.fn().mockResolvedValue(0) }, sdOppAnalysis: { count: jest.fn().mockResolvedValue(0) }, sysAuditLog: { create: jest.fn() },
  };
  const db = { sysApplication: { findFirst: jest.fn().mockResolvedValue({ id: 'app', tenantId: 'tenant' }) }, sysParameter: { findFirst: jest.fn().mockResolvedValue({ value: null }) }, sdOppTemplate: { findMany: jest.fn().mockResolvedValue([]) }, $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
  return { tx, service: new OpportunityService(db as unknown as DatabaseService) };
}
describe('opportunity stage writes', () => {
  it('rejects templates outside the requested system', async () => {
    const { tx, service } = fixture(); tx.sdOppTemplate.findFirst.mockResolvedValue(null);
    await expect(service.createStage('demo', templateId, 'actor-id', 'admin', 'req', { stageCode: 'review', stageName: '评审', probability: 30 })).rejects.toThrow('模板');
    expect(tx.sdOppStage.create).not.toHaveBeenCalled();
    expect(tx.sdOppTemplate.findFirst).toHaveBeenCalledWith({ where: { id: templateId, tenantId: 'tenant', applicationId: 'app', status: 'ACTIVE' } });
  });
  it('creates under the validated template and returns the list contract', async () => {
    const { tx, service } = fixture();
    await expect(service.createStage('demo', templateId, 'actor-id', 'admin', 'req', { stageCode: 'review', stageName: '评审', probability: 30 })).resolves.toEqual([]);
    expect(tx.sdOppStage.create).toHaveBeenCalledWith({ data: { templateId, stageCode: 'review', stageName: '评审', probability: 30, sortNo: 0, status: 'ACTIVE', isDefault: false, createdBy: 'admin', updatedBy: 'admin' } });
    expect(tx.sysAuditLog.create).toHaveBeenCalled();
  });
  it.each(['sdOpp', 'sdOppAnalysis'] as const)('rejects deletion when %s references the stage', async (model) => {
    const { tx, service } = fixture(); tx[model].count.mockResolvedValue(1);
    await expect(service.deleteStage('demo', stageId, 'actor-id', 'admin', 'req', { version: 1 })).rejects.toThrow('引用');
    expect(tx.sdOppStage.deleteMany).not.toHaveBeenCalled();
  });
  it('rejects a default stage and stale versions', async () => {
    const { tx, service } = fixture(); tx.sdOppStage.findFirst.mockResolvedValue({ ...existing, isDefault: true });
    await expect(service.deleteStage('demo', stageId, 'actor-id', 'admin', 'req', { version: 1 })).rejects.toThrow('默认');
    await expect(service.deleteStage('demo', stageId, 'actor-id', 'admin', 'req', { version: 2 })).rejects.toThrow('修改');
    expect(tx.sdOppStage.deleteMany).not.toHaveBeenCalled();
  });
  it('deletes only the version-matched stage and audits it', async () => {
    const { tx, service } = fixture();
    await expect(service.deleteStage('demo', stageId, 'actor-id', 'admin', 'req', { version: 1 })).resolves.toEqual([]);
    expect(tx.sdOppStage.deleteMany).toHaveBeenCalledWith({ where: { id: stageId, templateId, version: 1, isDefault: false } });
    expect(tx.sysAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: 'actor-id', actionCode: 'opportunity.stage.delete', requestId: 'req' }) }));
  });
  it('does not allow disabling the default stage directly', async () => {
    const { tx, service } = fixture(); tx.sdOppStage.findFirst.mockResolvedValue({ ...existing, isDefault: true });
    await expect(service.updateStage('demo', stageId, 'actor-id', 'admin', 'req', { version: 1, status: 'DISABLED' })).rejects.toThrow('默认');
  });
  it('returns the updated template list only after the update commits', async () => {
    const { tx, service } = fixture();
    await expect(service.updateStage('demo', stageId, 'actor-id', 'admin', 'req', { version: 1, stageName: '新评审' })).resolves.toEqual([]);
    expect(tx.sdOppStage.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: stageId, templateId, version: 1 } }));
  });
});
