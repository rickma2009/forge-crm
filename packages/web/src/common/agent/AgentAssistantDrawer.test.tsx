import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentAssistantDrawer, type AgentGateway } from './AgentAssistantDrawer';
import { aiSectionKeys, type AgentTask } from '@forge-crm/contracts';
const task: AgentTask = { id: 'task1', contextId: 'opp1', contextType: 'opportunity', mode: 'COMMUNICATION_PLAN', instruction: '关注交期', status: 'SUCCEEDED', snapshot: { capturedAt: '2026-09-29T00:00:00Z', hash: 'hash', opportunity: { id: 'opp1', name: '测试商机', stageId: 'stage', stageName: '线索', stageProbability: 10, confidence: 20 }, focus: '', issues: [], sources: [{ id: 'O:1', kind: 'opportunity', title: '测试商机资料', content: { name: '测试商机', remark: '确认交期' } }] }, steps: [{ id: 'step1', kind: 'TOOL', label: '读取当前商机', status: 'SUCCEEDED', at: '2026-09-29T00:00:00Z', sourceIds: ['O:1'] }], result: { sections: aiSectionKeys.map(key => ({ key, items: [{ text: key === 'actions' ? '询问交期安排' : '测试建议', kind: 'INFERENCE', sourceIds: ['O:1'] }] })) }, confirmedResult: null, plan: null, followUpId: null, provider: 'mock', model: 'mock', error: null, createdAt: '2026-09-29T00:00:00Z' };
const api = (existing = true): AgentGateway => ({ preview: vi.fn(async () => ({ contextName: '测试商机', configuration: { configured: true, provider: 'mock', model: 'mock', timeoutMs: 1000, maxInputChars: 10000, dailyLimit: 30 }, tools: [{ name: 'getOpportunity', label: '读取当前商机' }] })), list: vi.fn(async () => ({ items: existing ? [task] : [], total: existing ? 1 : 0, page: 1 })), detail: vi.fn(async () => task), start: vi.fn(async () => ({ ...task, result: null, status: 'QUEUED' as const })), cancel: vi.fn(async () => ({ ...task, status: 'CANCELLED' as const })), save: vi.fn(async (_s, _id, _t, input) => ({ ...task, followUpId: 'saved1', plan: input })) });
const props = { systemCode: 'demo-portal', contextId: 'opp1', contextName: '测试商机', canSave: true };
describe('Agent assistant drawer', () => {
  it('starts in current context, closes without cancelling and restores persisted results on reopen', async () => {
    const gateway = api(false), close = vi.fn(); const view = render(<AgentAssistantDrawer {...props} api={gateway} onClose={close} onSaved={() => {}} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '开始执行' })).toBeEnabled()); fireEvent.change(screen.getByLabelText('任务类型'), { target: { value: 'COMMUNICATION_PLAN' } }); fireEvent.change(screen.getByLabelText('补充要求'), { target: { value: '关注交期' } }); fireEvent.click(screen.getByRole('button', { name: '开始执行' }));
    await screen.findByText('任务：排队中 · 模拟结果'); expect(gateway.start).toHaveBeenCalledWith('demo-portal', 'opp1', expect.objectContaining({ mode: 'COMMUNICATION_PLAN', instruction: '关注交期' })); fireEvent.click(screen.getByRole('button', { name: '关闭' })); expect(close).toHaveBeenCalledOnce(); expect(gateway.cancel).not.toHaveBeenCalled(); view.unmount();
    render(<AgentAssistantDrawer {...props} api={api()} onClose={close} onSaved={() => {}} />); expect(await screen.findByText('读取当前商机 · 完成')).toBeInTheDocument();
  });
  it('shows evidence, protects edited plans and saves the reviewed plan rather than writing automatically', async () => {
    const gateway = api(), close = vi.fn(), saved = vi.fn(); render(<AgentAssistantDrawer {...props} api={gateway} onClose={close} onSaved={saved} />);
    await screen.findByLabelText('沟通计划'); expect(gateway.save).not.toHaveBeenCalled(); fireEvent.click(screen.getAllByRole('button', { name: '查看依据：测试商机资料' })[0]); expect(await screen.findByRole('heading', { name: '依据：测试商机资料' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('沟通计划'), { target: { value: '人工审阅后的沟通安排' } }); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false); fireEvent.click(screen.getByRole('button', { name: '关闭' })); expect(close).not.toHaveBeenCalled(); expect(confirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '保存沟通计划' })); await waitFor(() => expect(saved).toHaveBeenCalledOnce()); expect(gateway.save).toHaveBeenCalledWith('demo-portal', 'opp1', 'task1', expect.objectContaining({ resultNext: '人工审阅后的沟通安排' })); expect(await screen.findByText('任务：已保存沟通计划 · 模拟结果')).toBeInTheDocument(); confirm.mockRestore();
  });
  it('hides save without follow-up permission and blocks generation when model is unconfigured', async () => {
    const gateway = api(); gateway.preview = vi.fn(async () => ({ contextName: '测试商机', configuration: { configured: false, provider: 'anthropic', model: 'test', timeoutMs: 1000, maxInputChars: 1000, dailyLimit: 30 }, tools: [] })); render(<AgentAssistantDrawer {...props} canSave={false} api={gateway} onClose={() => {}} onSaved={() => {}} />);
    await screen.findByText('模型尚未配置，请联系管理员；暂不能生成任务。'); expect(screen.queryByRole('button', { name: '保存沟通计划' })).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: '重新生成' })).toBeDisabled();
  });
});
