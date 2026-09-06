import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordWorkspaceDemo } from './RecordWorkspaceDemo';

it('演示查询、重置、新增、详情和可关闭页签', async () => {
  const user = userEvent.setup();
  render(<RecordWorkspaceDemo />);

  await user.type(screen.getByRole('searchbox', { name: '查询示例记录' }), 'B');
  await user.click(screen.getByRole('button', { name: '查询' }));
  expect(screen.getByText('示例记录 B')).toBeInTheDocument();
  expect(screen.queryByText('示例记录 A')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '重置查询' }));
  expect(screen.getByText('示例记录 A')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '新建记录' }));
  expect(screen.getByRole('heading', { name: '新建记录' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '关闭页签 新建记录' }));
  await user.click(screen.getByRole('button', { name: '查看 示例记录 A' }));
  expect(screen.getByRole('heading', { name: '示例记录 A' })).toBeInTheDocument();
});
