import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { NavigationShellDemo } from './NavigationShellDemo';

it('reports navigation intent without overriding caller-owned selection', async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  const groups = [{ id: 'custom', label: '自定义分组', marker: 'C', children: [{ id: 'first', label: '第一页面', marker: '1' }, { id: 'second', label: '第二页面', marker: '2' }] }];
  const { rerender } = render(<NavigationShellDemo groups={groups} activeId="first" onSelect={onSelect} showOverview={false}>调用者内容</NavigationShellDemo>);
  await user.click(screen.getByRole('button', { name: '第二页面' }));
  expect(onSelect).toHaveBeenCalledWith('second');
  expect(screen.getByRole('button', { name: '第一页面' })).toHaveAttribute('aria-current', 'page');
  rerender(<NavigationShellDemo groups={groups} activeId="second" onSelect={onSelect} showOverview={false}>调用者内容</NavigationShellDemo>);
  expect(screen.getByRole('button', { name: '第二页面' })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('button', { name: '工作概览' })).not.toBeInTheDocument();
});
