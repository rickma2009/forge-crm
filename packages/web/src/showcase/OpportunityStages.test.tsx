import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GatewayError, type EnterpriseGateway } from './gateway';
import { OpportunityStageAdminPage } from './OpportunityPages';

const audit = { version: 1, createdAt: '2026-09-23T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' };
const templateId = '11111111-1111-4111-8111-111111111111';
const stages = [
  { ...audit, id: '22222222-2222-4222-8222-222222222222', templateId, stageCode: 'lead', stageName: '初始线索', probability: 10, isDefault: true, sortNo: 10, status: 'ACTIVE' as const },
  { ...audit, id: '33333333-3333-4333-8333-333333333333', templateId, stageCode: 'review', stageName: '需求评审', probability: 30, isDefault: false, sortNo: 20, status: 'ACTIVE' as const },
];
const templates = [
  { ...audit, id: templateId, templateCode: 'common', templateName: '公共', isDefault: true, status: 'ACTIVE' as const, stages },
  { ...audit, id: '55555555-5555-4555-8555-555555555555', templateCode: 'tender', templateName: '招投标项目', isDefault: false, status: 'ACTIVE' as const, stages: [] },
];
function setup(canManage = true) {
  const api = { opportunityTemplates: vi.fn().mockResolvedValue(templates), createOpportunityStage: vi.fn().mockResolvedValue(templates), deleteOpportunityStage: vi.fn().mockResolvedValue([{ ...templates[0], stages: [stages[0]] }]), updateOpportunityStage: vi.fn().mockResolvedValue(templates) };
  render(<OpportunityStageAdminPage systemCode="demo-portal" canManage={canManage} gateway={api as unknown as EnterpriseGateway} />);
  return api;
}
describe('opportunity stage maintenance', () => {
  it('uses a defaulted template dropdown and no longer renders a template tree', async () => {
    setup();
    const template = await screen.findByLabelText('商机模板');
    expect(template).toHaveValue(templateId);
    expect(screen.getByRole('option', { name: '招投标项目' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /收起商机模板树|展开商机模板树/ })).not.toBeInTheDocument();
  });
  it('creates a stage under the selected template', async () => {
    const api = setup(); const user = userEvent.setup();
    api.createOpportunityStage.mockResolvedValue([{ ...templates[0], stages: [...stages, { ...stages[1], id: '44444444-4444-4444-8444-444444444444', stageCode: 'proposal', stageName: '方案确认', probability: 45, sortNo: 30 }] }]);
    await screen.findByText('需求评审');
    await user.click(screen.getByRole('button', { name: /新增阶段/ }));
    await user.type(screen.getByLabelText('阶段编码'), 'proposal');
    await user.type(screen.getByLabelText('阶段名称'), '方案确认');
    await user.clear(screen.getByLabelText('阶段赢率（%）')); await user.type(screen.getByLabelText('阶段赢率（%）'), '45');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(api.createOpportunityStage).toHaveBeenCalledWith('demo-portal', templateId, expect.objectContaining({ stageCode: 'proposal', stageName: '方案确认', probability: 45 })));
    expect(await screen.findByText('方案确认')).toBeInTheDocument();
  });
  it('cancels without deleting then confirms deletion and refreshes the list', async () => {
    const api = setup(); const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '删除阶段 需求评审' }));
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(api.deleteOpportunityStage).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '删除阶段 需求评审' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    await waitFor(() => expect(screen.queryByText('需求评审')).not.toBeInTheDocument());
    expect(api.deleteOpportunityStage).toHaveBeenCalledWith('demo-portal', stages[1].id, 1);
  });
  it('protects the default stage', async () => {
    setup(); expect(await screen.findByRole('button', { name: '删除阶段 初始线索' })).toBeDisabled();
  });
  it('retains the stage and shows the reason when deletion is rejected', async () => {
    const api = setup(); const user = userEvent.setup();
    api.deleteOpportunityStage.mockRejectedValue(new GatewayError(409, 'BAD_REQUEST', '阶段已被历史分析引用'));
    await user.click(await screen.findByRole('button', { name: '删除阶段 需求评审' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(await screen.findByText('阶段已被历史分析引用')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除阶段 需求评审' })).toBeInTheDocument();
  });
  it('keeps stage codes immutable while saving an edited stage', async () => {
    const api = setup(); const user = userEvent.setup(); await screen.findByText('需求评审');
    await user.click(screen.getAllByRole('button', { name: '修改' })[1]);
    expect(screen.getByLabelText('阶段编码')).toBeDisabled();
    await user.clear(screen.getByLabelText('阶段名称')); await user.type(screen.getByLabelText('阶段名称'), '新评审');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(api.updateOpportunityStage).toHaveBeenCalledWith('demo-portal', stages[1].id, expect.objectContaining({ stageName: '新评审', version: 1 })));
  });
  it('does not expose create or delete to read-only users', async () => {
    setup(false); await screen.findByText('需求评审');
    expect(screen.queryByRole('button', { name: /新增阶段/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除阶段/ })).not.toBeInTheDocument();
  });
});
