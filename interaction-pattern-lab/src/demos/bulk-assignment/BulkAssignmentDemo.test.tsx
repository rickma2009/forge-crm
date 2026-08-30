import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkAssignmentDemo } from './BulkAssignmentDemo';

async function prepareCurrentPage(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '选择当前页' }));
  await user.selectOptions(screen.getByRole('combobox', { name: '目标负责人' }), 'owner-lin');
  await user.click(screen.getByRole('button', { name: '执行预检查' }));
}

describe('Bulk Assignment Demo', () => {
  it('TC-307/308/309: 显式区分当前页和全部查询结果，查询变化清空选择', async () => {
    const user = userEvent.setup();
    render(<BulkAssignmentDemo />);
    expect(screen.getByText('共 12 条，当前页 5 条')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '选择当前页' }));
    expect(screen.getByRole('status')).toHaveTextContent('当前页 5 条');
    await user.click(screen.getByRole('button', { name: '选择当前查询全部 12 条' }));
    expect(screen.getByRole('status')).toHaveTextContent('全部查询结果 12 条');
    await user.type(screen.getByRole('searchbox', { name: '查询工作项' }), '北区');
    expect(screen.getByRole('status')).toHaveTextContent('范围变化');
    expect(screen.getByText('共 4 条，当前页 4 条')).toBeInTheDocument();
  });

  it('TC-310/311/313/EDGE-304: 预检查、Escape 取消和部分成功结果可复核', async () => {
    const user = userEvent.setup();
    render(<BulkAssignmentDemo />);
    await prepareCurrentPage(user);
    expect(screen.getByText('可执行 3')).toBeInTheDocument();
    expect(screen.getByText('拒绝 2')).toBeInTheDocument();
    expect(screen.getByText('RECORD_LOCKED')).toBeInTheDocument();
    const confirmTrigger = screen.getByRole('button', { name: '确认执行批量分配' });
    await user.click(confirmTrigger);
    const dialog = screen.getByRole('dialog', { name: '确认批量分配' });
    expect(within(dialog).getByText(/5 条工作项/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(confirmTrigger).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('记录未发生变化');
    await user.click(confirmTrigger);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '执行分配' }));
    expect(screen.getByRole('heading', { name: '部分成功' })).toBeInTheDocument();
    expect(screen.getByText('成功 2')).toBeInTheDocument();
    expect(screen.getByText('失败 3')).toBeInTheDocument();
    expect(screen.getByText('未处理 0')).toBeInTheDocument();
  });

  it('TC-314: 系统失败显示零变更并保留上下文供重试', async () => {
    const user = userEvent.setup();
    render(<BulkAssignmentDemo />);
    await user.selectOptions(screen.getByRole('combobox', { name: '演示场景' }), 'system-failure-first');
    await prepareCurrentPage(user);
    await user.click(screen.getByRole('button', { name: '确认执行批量分配' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '执行分配' }));
    expect(screen.getByRole('heading', { name: '系统失败 · 零变更' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '目标负责人' })).toHaveValue('owner-lin');
    await user.click(screen.getByRole('button', { name: '重试本次执行' }));
    expect(screen.getByRole('heading', { name: '部分成功' })).toBeInTheDocument();
  });

  it('TC-312: 全部成功场景产生完整成功摘要', async () => {
    const user = userEvent.setup();
    render(<BulkAssignmentDemo />);
    await user.selectOptions(screen.getByRole('combobox', { name: '演示场景' }), 'all-success');
    await prepareCurrentPage(user);
    await user.click(screen.getByRole('button', { name: '确认执行批量分配' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '执行分配' }));
    expect(screen.getByRole('heading', { name: '全部成功' })).toBeInTheDocument();
    expect(screen.getByText('成功 5')).toBeInTheDocument();
  });
});
