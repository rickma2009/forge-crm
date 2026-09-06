import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SalesOrderPrototype } from './SalesOrderPrototype';

describe('sales order prototype', () => {
  it('adds a draft row through the product picker and recalculates totals', async () => {
    const user = userEvent.setup();
    render(<SalesOrderPrototype />);

    await user.click(screen.getByRole('button', { name: '添加一行' }));
    const picker = screen.getByRole('listbox', { name: '匹配产品' });
    await user.click(within(picker).getByRole('option', { name: /PRD-5001/ }));

    expect(screen.getByRole('textbox', { name: '产品编码' })).toHaveValue('PRD-5001');
    expect(screen.getByRole('textbox', { name: '产品名称' })).toHaveValue('滚珠丝杠副');
  });

  it('deletes a persisted row and supports undo', async () => {
    const user = userEvent.setup();
    render(<SalesOrderPrototype />);

    await user.click(screen.getByRole('button', { name: '删除第 3 行' }));
    expect(screen.queryByText('直线导轨')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('已删除第 3 行');
    await user.click(screen.getByRole('button', { name: '撤销' }));
    expect(screen.getByText('直线导轨')).toBeInTheDocument();
  });

  it('commits the visible draft state through the primary action', async () => {
    const user = userEvent.setup();
    render(<SalesOrderPrototype />);

    await user.click(screen.getAllByRole('button', { name: '保存并提交' })[0]);
    expect(screen.getByText('已提交')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('订单已保存并提交');
  });
});
