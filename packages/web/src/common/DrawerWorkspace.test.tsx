import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DrawerWorkspace } from './DrawerWorkspace';

afterEach(() => vi.restoreAllMocks());
describe('DrawerWorkspace focus ownership', () => {
  it('excludes negative tab stops from forward and reverse focus wrapping', () => {
    // JSDOM has no layout; model visible rectangles only, not browser geometry.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    render(<DrawerWorkspace title="演练" onClose={vi.fn()}><button>最后操作</button><button tabIndex={-1}>仅程序聚焦</button></DrawerWorkspace>);
    const first = screen.getByRole('button', { name: '关闭演练' });
    const last = screen.getByRole('button', { name: '最后操作' });
    last.focus(); fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
  it('lets a child consume Escape before requesting drawer close', () => {
    const close = vi.fn();
    render(<DrawerWorkspace title="演练" onClose={close}><input aria-label="子控件" onKeyDown={event => { if (event.key === 'Escape') event.preventDefault(); }} /></DrawerWorkspace>);
    fireEvent.keyDown(screen.getByLabelText('子控件'), { key: 'Escape' });
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });
  it('focuses the drawer on mount and restores its live trigger on unmount', () => {
    const trigger = document.createElement('button'); trigger.textContent = '入口'; document.body.append(trigger); trigger.focus();
    try {
      const view = render(<DrawerWorkspace title="演练" onClose={vi.fn()}><p>内容</p></DrawerWorkspace>);
      expect(screen.getByRole('dialog')).toHaveFocus();
      view.unmount(); expect(trigger).toHaveFocus();
    } finally { trigger.remove(); }
  });
});
