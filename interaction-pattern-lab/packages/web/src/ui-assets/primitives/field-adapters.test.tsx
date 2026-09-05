import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { FieldAdapter } from './field-adapters';

afterEach(cleanup);

describe('TASK-1004 controlled field adapters', () => {
  it.each([
    ['text', { id: 'title', kind: 'text', label: '标题', groupId: 'main' }, '初始标题', '更新标题'],
    ['number', { id: 'quantity', kind: 'number', label: '数量', groupId: 'main' }, 2, 3],
    ['date', { id: 'deliveryDate', kind: 'date', label: '交付日期', groupId: 'main' }, '2026-09-05', '2026-09-20'],
    ['select', { id: 'currency', kind: 'select', label: '币种', groupId: 'main', options: [{ value: 'CNY', label: '人民币' }, { value: 'USD', label: '美元' }] }, 'CNY', 'USD'],
  ])('normalizes a controlled %s change without owning form state', (_kind, field, value, nextValue) => {
    const onChange = vi.fn();
    render(<FieldAdapter field={field} value={value} state="editable" onChange={onChange} />);

    const control = screen.getByLabelText(field.label);
    fireEvent.change(control, { target: { value: String(nextValue) } });

    expect(onChange).toHaveBeenCalledWith(nextValue);
  });

  it('keeps a readonly select copyable and immutable when a user attempts to change it', async () => {
    const onChange = vi.fn();
    render(<FieldAdapter field={{ id: 'currency', kind: 'select', label: '币种', groupId: 'main', options: [{ value: 'CNY', label: '人民币' }, { value: 'USD', label: '美元' }] }} value="CNY" state="readonly" onChange={onChange} />);
    const user = userEvent.setup();

    const control = screen.getByRole('textbox', { name: '币种' });
    expect(control).toHaveAttribute('aria-readonly', 'true');
    expect(control).toHaveDisplayValue('人民币');
    expect(control).not.toBeDisabled();
    expect(screen.queryByRole('combobox', { name: '币种' })).not.toBeInTheDocument();
    await user.type(control, 'USD');
    expect(control).toHaveDisplayValue('人民币');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps an explicitly disabled field distinct from readonly and exposes its reason', () => {
    render(<FieldAdapter field={{ id: 'owner', kind: 'text', label: '负责人', groupId: 'main', disabledReason: '创建后由审批流分配负责人。' }} value="陈思远" state="disabled" onChange={() => undefined} />);

    expect(screen.getByLabelText('负责人')).toBeDisabled();
    expect(screen.getByLabelText('负责人')).toHaveAttribute('title', '创建后由审批流分配负责人。');
  });

  it('renders an unknown field renderer as a visible configuration failure with its ID', () => {
    render(<FieldAdapter field={{ id: 'legacyCode', kind: 'legacy-code', label: '遗留编码', groupId: 'main' }} value="" state="editable" onChange={() => undefined} />);

    expect(screen.getByRole('alert')).toHaveTextContent('字段 legacyCode 配置错误：未知字段类型 legacy-code。');
  });

  it('does not present an ID-only remote select as an empty resolved control', () => {
    render(<FieldAdapter field={{ id: 'customer', kind: 'remote-select', label: '客户', groupId: 'main' }} value="C-001" state="editable" remoteState={{ status: 'failed', id: 'C-001', message: '客户名称回显失败，请重试。' }} onChange={() => undefined} />);

    expect(screen.getByRole('alert')).toHaveTextContent('客户名称回显失败，请重试。');
    expect(screen.queryByRole('combobox', { name: '客户' })).not.toBeInTheDocument();
  });

  it('uses the supplied remote label and returns an {id,label} selection without fetching', () => {
    const onChange = vi.fn();
    render(<FieldAdapter field={{ id: 'customer', kind: 'remote-select', label: '客户', groupId: 'main', options: [{ value: 'C-001', label: '广州精工设备有限公司' }, { value: 'C-002', label: '苏州精密科技有限公司' }] }} value="C-001" state="editable" remoteState={{ status: 'resolved', value: { id: 'C-001', label: '广州精工设备有限公司' } }} onChange={onChange} />);

    expect(screen.getByRole('combobox', { name: '客户' })).toHaveDisplayValue('广州精工设备有限公司');
    fireEvent.change(screen.getByRole('combobox', { name: '客户' }), { target: { value: 'C-002' } });
    expect(onChange).toHaveBeenCalledWith({ id: 'C-002', label: '苏州精密科技有限公司' });
  });

  it.each([
    ['resolved', { status: 'resolved', value: { id: 'C-001', label: '广州精工设备有限公司' } }],
    ['loading', { status: 'loading', id: 'C-001' }],
    ['failed', { status: 'failed', id: 'C-001', message: '客户名称回显失败，请重试。' }],
  ] as const)('rejects a stale %s hydration state after the controlled remote ID changes', (_status, remoteState) => {
    const field = { id: 'customer', kind: 'remote-select', label: '客户', groupId: 'main', options: [{ value: 'C-001', label: '广州精工设备有限公司' }, { value: 'C-002', label: '苏州精密科技有限公司' }] };
    const { rerender } = render(<FieldAdapter field={field} value="C-001" state="editable" remoteState={remoteState} onChange={() => undefined} />);

    rerender(<FieldAdapter field={field} value="C-002" state="editable" remoteState={remoteState} onChange={() => undefined} />);

    expect(screen.getByRole('alert')).toHaveTextContent('客户 C-002 回显状态与当前值不一致。');
    expect(screen.queryByRole('combobox', { name: '客户' })).not.toBeInTheDocument();
    expect(screen.queryByText('广州精工设备有限公司')).not.toBeInTheDocument();
  });

  it('announces a supplied remote loading state without performing a request', () => {
    render(<FieldAdapter field={{ id: 'customer', kind: 'remote-select', label: '客户', groupId: 'main' }} value="C-001" state="editable" remoteState={{ status: 'loading', id: 'C-001' }} onChange={() => undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent('正在加载客户 C-001…');
  });
});
