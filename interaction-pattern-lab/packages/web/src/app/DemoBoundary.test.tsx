import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DemoBoundary } from './DemoBoundary';

function BrokenDemo(): never {
  throw new Error('adapter failed');
}

it('原型失败时保留可理解说明和重试入口', async () => {
  const user = userEvent.setup();
  const retry = vi.fn();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  render(<DemoBoundary onRetry={retry}><BrokenDemo /></DemoBoundary>);

  expect(screen.getByRole('alert')).toHaveTextContent('交互案例暂不可用');
  await user.click(screen.getByRole('button', { name: '重试原型' }));
  expect(retry).toHaveBeenCalledOnce();
});
