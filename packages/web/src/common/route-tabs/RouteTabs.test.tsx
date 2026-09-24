import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { RouteTabs } from './RouteTabs';

function setup() {
  const onAction = vi.fn();
  const onNavigate = vi.fn();
  render(<RouteTabs tabs={[{ path: '/', title: '首页', closable: false }, { path: '/a', title: '页面A' }]}
    activePath="/" onAction={onAction} onNavigate={onNavigate} getHref={(tab) => `https://example.test/#${tab.path}`} />);
  return { onAction, onNavigate };
}
describe('route tab menu', () => {
  it('operates on the right-click target without first navigating', () => {
    const { onAction, onNavigate } = setup();
    fireEvent.contextMenu(screen.getByRole('button', { name: '页面A' }), { clientX: 120, clientY: 80 });
    expect(screen.getAllByRole('menuitem')).toHaveLength(6);
    expect(screen.getByRole('menuitem', { name: '关闭右侧' })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: '关闭其他' }));
    expect(onAction).toHaveBeenCalledWith('close-others', '/a');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('supports keyboard menu navigation and Escape focus restoration', () => {
    setup();
    const home = screen.getByRole('button', { name: '首页' });
    fireEvent.keyDown(home, { key: 'F10', shiftKey: true });
    expect(screen.getByRole('menuitem', { name: '关闭当前' })).toBeDisabled();
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('menuitem', { name: '在新窗口打开' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(home).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('dismisses on outside pointer and opens the supplied URL with opener isolated', () => {
    setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const target = screen.getByRole('button', { name: '页面A' });
    fireEvent.contextMenu(target);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.contextMenu(target);
    fireEvent.click(within(screen.getByRole('menu')).getByText('在新窗口打开'));
    expect(open).toHaveBeenCalledWith('https://example.test/#/a', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });
});
