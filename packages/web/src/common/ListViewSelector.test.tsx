import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListViewSelector } from './ListViewSelector';

describe('shared list view selector', () => {
  it('keeps the owning page authoritative when a selection is rejected or reset', () => {
    const props = { value: 'system', options: [{ value: 'system', label: '系统默认' }, { value: 'mine', label: '个人视图' }], onChange: vi.fn(), onSettings: vi.fn() };
    const { rerender } = render(<ListViewSelector {...props} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mine' } });
    expect(props.onChange).toHaveBeenCalledWith('mine');
    // Parent has not accepted the request: displaying the new value would be a second source of truth.
    expect(select).toHaveValue('system');
    rerender(<ListViewSelector {...props} value="mine" />);
    expect(select).toHaveValue('mine');
    rerender(<ListViewSelector {...props} />);
    expect(select).toHaveValue('system');
    expect(props.onChange).toHaveBeenCalledOnce();
  });
  it('passes selected values and settings actions to the owning page', () => {
    const change = vi.fn(), settings = vi.fn();
    render(<ListViewSelector value="system" options={[{ value: 'system', label: '系统默认' }, { value: 'mine', label: '个人视图' }]} onChange={change} onSettings={settings} />);
    fireEvent.change(screen.getByRole('combobox', { name: '当前列表视图' }), { target: { value: 'mine' } });
    expect(change).toHaveBeenCalledWith('mine');
    fireEvent.click(screen.getByRole('button', { name: '设置' })); expect(settings).toHaveBeenCalledOnce();
  });
  it('respects settings permission and disables empty/loading states', () => {
    const props = { value: 'system', options: [{ value: 'system', label: '系统默认' }], onChange: vi.fn(), onSettings: vi.fn() };
    const { rerender } = render(<ListViewSelector {...props} settingsDisabled />);
    expect(screen.getByRole('combobox')).toBeEnabled(); expect(screen.getByRole('button')).toBeDisabled();
    rerender(<ListViewSelector {...props} value="" options={[]} emptyLabel="加载视图…" />);
    expect(screen.getByRole('combobox')).toBeDisabled(); expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('option')).toHaveTextContent('加载视图…');
  });
});
