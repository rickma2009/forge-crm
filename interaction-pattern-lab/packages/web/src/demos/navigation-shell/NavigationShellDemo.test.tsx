import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigationShellDemo } from './NavigationShellDemo';

it('演示分组展开、菜单搜索、折叠和当前项反馈', async () => {
  const user = userEvent.setup();
  render(<NavigationShellDemo />);

  await user.click(screen.getByRole('button', { name: '对象管理' }));
  await user.click(screen.getByRole('button', { name: '记录列表' }));
  expect(screen.getByRole('button', { name: '记录列表' })).toHaveAttribute('aria-current', 'page');

  await user.type(screen.getByRole('searchbox', { name: '搜索案例菜单' }), '流程');
  expect(screen.getByRole('button', { name: '流程任务' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '记录列表' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '折叠案例导航' }));
  expect(screen.getByRole('complementary', { name: '导航壳层案例侧栏' })).toHaveAttribute('data-collapsed', 'true');
});
