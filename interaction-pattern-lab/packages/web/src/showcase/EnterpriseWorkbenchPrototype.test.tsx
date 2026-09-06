import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnterpriseWorkbenchPrototype } from './EnterpriseWorkbenchPrototype';

describe('enterprise workbench prototype', () => {
  it('creates a personal todo without implying a business-state change', async () => {
    const user = userEvent.setup();
    render(<EnterpriseWorkbenchPrototype variant="personal" />);

    await user.type(screen.getByRole('textbox', { name: '新待办标题' }), '确认下周交付计划');
    await user.click(screen.getByRole('button', { name: '添加个人待办' }));

    expect(screen.getByRole('button', { name: /确认下周交付计划/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('已创建个人待办');
  });

  it('defers a reminder without completing the selected work item', async () => {
    const user = userEvent.setup();
    render(<EnterpriseWorkbenchPrototype variant="master-detail" />);

    await user.click(screen.getByRole('button', { name: '30 分钟后提醒' }));

    expect(screen.getByRole('status')).toHaveTextContent('延后提醒 30 分钟');
    expect(screen.getByRole('button', { name: '标记完成' })).toBeEnabled();
  });

  it('keeps every compact filter label semantically complete', () => {
    render(<EnterpriseWorkbenchPrototype variant="master-detail" />);
    expect(screen.getByRole('button', { name: '只看异常' })).toHaveTextContent('异常');
  });

  it('exposes process and collaboration as detail views for the selected object', async () => {
    const user = userEvent.setup();
    render(<EnterpriseWorkbenchPrototype variant="master-detail" />);

    await user.click(screen.getByRole('button', { name: '流程' }));
    expect(screen.getAllByText('提交订单并补充折扣说明')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '协作' }));
    expect(screen.getByRole('heading', { name: '在对象上下文中协作' })).toBeInTheDocument();
  });
});
