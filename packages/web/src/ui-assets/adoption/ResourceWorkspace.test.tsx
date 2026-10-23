import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ResourceWorkspace } from './ResourceWorkspace';

describe('isolated resource adoption', () => {
  it('keeps the same resource across list, detail, edit and return', async () => {
    const user = userEvent.setup();
    render(<ResourceWorkspace />);
    await user.click(await screen.findByRole('button', { name: '查看 演练资源 A' }));
    await user.click(screen.getByRole('button', { name: '编辑资源' }));
    const name = screen.getByRole('textbox', { name: /资源名称/ });
    await user.clear(name);
    await user.type(name, '资源 A 已修改');
    await user.click(screen.getByRole('button', { name: '保存资源' }));
    expect(await screen.findByRole('status', { name: '资源保存结果' })).toHaveTextContent('本地保存完成');
    await user.click(screen.getByRole('button', { name: '离开单据' }));
    expect(screen.getByRole('heading', { name: '资源 A 已修改' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '记录列表' }));
    expect(screen.getByRole('button', { name: '查看 资源 A 已修改' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看 演练资源 B' })).toBeInTheDocument();
  });
  it('blocks invalid save and preserves edits when leaving is cancelled', async () => {
    const user = userEvent.setup();
    render(<ResourceWorkspace />);
    await user.click(await screen.findByRole('button', { name: '查看 演练资源 A' }));
    await user.click(screen.getByRole('button', { name: '编辑资源' }));
    await user.clear(screen.getByRole('textbox', { name: /资源名称/ }));
    await user.click(screen.getByRole('button', { name: '保存资源' }));
    expect(screen.getAllByText('资源名称不能为空。').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '离开单据' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '继续编辑' }));
    expect(screen.getByRole('textbox', { name: /资源名称/ })).toHaveValue('');
    await user.click(screen.getByRole('button', { name: '离开单据' }));
    await user.click(screen.getByRole('button', { name: '确认离开' }));
    expect(screen.getByRole('heading', { name: '演练资源 A' })).toBeInTheDocument();
  });
});
