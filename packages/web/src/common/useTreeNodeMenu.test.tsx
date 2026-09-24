import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useTreeNodeMenu } from './useTreeNodeMenu';

function Tree({ edit, readOnly = false }: { edit: (id: string) => void; readOnly?: boolean }) {
  const menu = useTreeNodeMenu();
  return <>{['甲', '乙'].map((id) => { const actions = readOnly ? [] : [{ key: 'edit', label: '编辑', run: () => edit(id) }]; return <div key={id} data-testid={id} onContextMenu={(event) => menu.open(event, id, actions)}>{id}{menu.button(id, actions)}</div>; })}{menu.menu}</>;
}
describe('shared tree node menu', () => {
  it('uses the clicked node for both triggers and restores button focus on Escape', async () => {
    const edit = vi.fn(), user = userEvent.setup(); render(<Tree edit={edit} />);
    fireEvent.contextMenu(screen.getByTestId('乙'), { clientX: 30, clientY: 20 });
    await user.click(screen.getByRole('menuitem', { name: '编辑' })); expect(edit).toHaveBeenLastCalledWith('乙');
    const trigger = screen.getByRole('button', { name: '甲操作' }); await user.click(trigger);
    await user.keyboard('{Escape}'); expect(screen.queryByRole('menu')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
    await user.click(trigger); await user.click(screen.getByRole('menuitem', { name: '编辑' })); expect(edit).toHaveBeenLastCalledWith('甲');
  });
  it('dismisses outside and does not offer actions for a read-only tree', () => {
    const { rerender } = render(<Tree edit={vi.fn()} />);
    fireEvent.contextMenu(screen.getByTestId('甲')); fireEvent.pointerDown(document.body); expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rerender(<Tree edit={vi.fn()} readOnly />); fireEvent.contextMenu(screen.getByTestId('甲'));
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
