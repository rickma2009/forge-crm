import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SystemParameter } from '@interaction-pattern-lab/contracts';
import { SystemParametersPage } from './SystemParametersPage';

const row: SystemParameter = { id: '00000000-0000-4000-8000-000000000001', parameterCode: 'DEFAULT_LEGAL_ENTITY', parameterName: '默认法人记录', value: null, usageNote: '请设置法人', sortNo: 10, status: 'ACTIVE', version: 1 };
function setup(actions = ['view', 'manage']) {
  const gateway = {
    parameters: vi.fn().mockResolvedValue({ items: [row], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
    updateParameter: vi.fn().mockResolvedValue({ notice: null }),
  };
  render(<SystemParametersPage systemCode="demo-portal" allowedActions={actions} gateway={gateway} />);
  return gateway;
}
describe('参数设置', () => {
  it('shows the six visible fields without create/delete/view actions and hides editing for read-only access', async () => {
    setup(['view']); await screen.findByText('DEFAULT_LEGAL_ENTITY');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['参数编码', '参数名称', '参数值', '使用说明', '显示序号', '当前状态']);
    expect(screen.getByText('未设置')).toBeInTheDocument();
    expect(screen.queryByText(row.id)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新增|删除|查看|编辑/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('applies filters only on query and resets both inputs and applied filters', async () => {
    const gateway = setup(), user = userEvent.setup(); await screen.findByText('DEFAULT_LEGAL_ENTITY');
    await user.type(screen.getByLabelText('参数搜索'), '法人');
    expect(gateway.parameters).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(gateway.parameters.mock.calls.at(-1)?.[1].get('keyword')).toBe('法人'));
    await user.click(screen.getByRole('button', { name: '重置' }));
    await waitFor(() => expect(gateway.parameters.mock.calls.at(-1)?.[1].get('keyword')).toBeNull());
    expect(screen.getByLabelText('参数搜索')).toHaveValue('');
  });
  it('saves arbitrary raw text and status with the original version and reloads', async () => {
    const gateway = setup(), user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '编辑默认法人记录' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('候选搜索')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /上一页|下一页/ })).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('参数值'), ' 错误法人编码 2026/99/99 001.20 ');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    expect(gateway.updateParameter).toHaveBeenCalledWith('demo-portal', row.id, { value: ' 错误法人编码 2026/99/99 001.20 ', status: 'ACTIVE', version: 1 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('参数已保存')).toBeInTheDocument();
    expect(gateway.parameters).toHaveBeenCalledTimes(2);
  });
  it('retains the editor and chosen value on conflict, and restores focus after cancel', async () => {
    const gateway = setup(), user = userEvent.setup(); gateway.updateParameter.mockRejectedValue(new Error('参数已被其他人修改，请刷新后重试'));
    const trigger = await screen.findByRole('button', { name: '编辑默认法人记录' });
    await user.click(trigger); const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('参数已被其他人修改');
    await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
  });
  it('shows failed loading and permits retry rather than silently showing an empty success', async () => {
    const gateway = setup(), user = userEvent.setup(); await screen.findByText('DEFAULT_LEGAL_ENTITY');
    gateway.parameters.mockRejectedValueOnce(new Error('服务不可用'));
    await user.click(screen.getByRole('button', { name: '刷新参数' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('服务不可用');
    await user.click(screen.getByRole('button', { name: '刷新参数' }));
    expect(await screen.findByText('DEFAULT_LEGAL_ENTITY')).toBeInTheDocument();
  });
});
