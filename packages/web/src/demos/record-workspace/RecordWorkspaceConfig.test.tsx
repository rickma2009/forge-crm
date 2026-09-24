import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { RecordWorkspaceDemo } from './RecordWorkspaceDemo';

it('refreshes records and detail tab labels while preserving the selected record identity', async () => {
  const user = userEvent.setup();
  const record = { id: 'stable-id', name: '原名称', type: '类型', status: '草稿', updatedAt: '版本1' };
  const { rerender } = render(<RecordWorkspaceDemo records={[record]} allowCreate={false} />);
  await user.click(screen.getByRole('button', { name: '查看 原名称' }));
  rerender(<RecordWorkspaceDemo records={[{ ...record, name: '新名称' }]} allowCreate={false} />);
  expect(screen.getByRole('tab', { name: '新名称' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: '新名称' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新建记录' })).not.toBeInTheDocument();
});
