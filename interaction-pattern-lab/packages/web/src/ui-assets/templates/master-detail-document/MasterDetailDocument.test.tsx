import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MasterDetailDocument } from './MasterDetailDocument';
import type { DocumentScenario } from './types';

interface Header {
  title: string;
}

interface Line {
  rowId: string;
  persistedState: 'draft' | 'persisted' | 'marked-for-deletion';
  description: string;
  quantity: number;
  amountMinorUnits: number;
}

const scenario = (overrides: Partial<DocumentScenario<Header, Line>> = {}): DocumentScenario<Header, Line> => ({
  scenarioId: 'document-template-test',
  title: '单据模板',
  mode: 'edit' as const,
  headerGroups: [{ id: 'general', label: '基本信息' }],
  headerSchema: [{ id: 'title', kind: 'text' as const, label: '单据标题', groupId: 'general', requiredWhen: { type: 'always' as const, value: true } }],
  initialState: {
    header: { title: '九月模拟单据' },
    lines: [{ rowId: 'line-1', persistedState: 'persisted' as const, description: '示例行', quantity: 2, amountMinorUnits: 2500 }],
    businessStatus: '草稿',
  },
  lineColumns: [
    { id: 'description', label: '描述', editable: true, getValue: (line: Line) => line.description },
    { id: 'quantity', label: '数量', editable: true, inputType: 'number' as const, getValue: (line: Line) => line.quantity },
    { id: 'amountMinorUnits', label: '金额', getValue: (line: Line) => line.amountMinorUnits, format: (value: unknown) => `¥${Number(value) / 100}` },
  ],
  emptyLine: { description: '', quantity: 1, amountMinorUnits: 0 },
  allocateLineId: () => 'draft-1',
  validate: (state: { header: Header }) => state.header.title
    ? { headerErrors: [], lineErrors: [] }
    : { headerErrors: [{ id: 'title-required', fieldId: 'title' as const, message: '单据标题必填。' }], lineErrors: [] },
  save: vi.fn(async () => ({ kind: 'success' as const, message: '模拟保存完成。', nextStatus: '已提交' })),
  summary: (lines: Line[]) => [{ id: 'total', label: '金额合计', value: `¥${lines.reduce((total, line) => total + line.amountMinorUnits, 0) / 100}` }],
  relatedEntries: ['相关记录：模拟数据，不会写入业务系统。'],
  ...overrides,
});

describe('TASK-1008 MasterDetailDocument', () => {
  it('composes header, line grid, integer summary, related entries, and a reachable save action', () => {
    render(<MasterDetailDocument scenario={scenario()} />);

    expect(screen.getByRole('heading', { name: '单据模板' })).toBeInTheDocument();
    expect(screen.getByText('业务状态：草稿')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '单据标题' })).toHaveValue('九月模拟单据');
    expect(screen.getByRole('table', { name: '单据模板行项目' })).toBeInTheDocument();
    expect(screen.getByText('金额合计：¥25')).toBeInTheDocument();
    expect(screen.getByText('相关记录：模拟数据，不会写入业务系统。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存模拟单据' })).toHaveAttribute('data-fixed-document-actions', 'true');
  });

  it('routes validation summary activation to the composed header field and does not call the save adapter', async () => {
    const user = userEvent.setup();
    const fixture = scenario();
    render(<MasterDetailDocument scenario={fixture} />);

    await user.clear(screen.getByRole('textbox', { name: '单据标题' }));
    await user.click(screen.getByRole('button', { name: '保存模拟单据' }));

    expect(fixture.save).not.toHaveBeenCalled();
    const summary = screen.getByRole('button', { name: '单据标题必填。' });
    summary.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('textbox', { name: '单据标题' })).toHaveFocus();
  });

  it('prevents duplicate save calls while saving and presents success feedback without changing business status', async () => {
    const user = userEvent.setup();
    let settle: ((outcome: { kind: 'success'; message: string; nextStatus: string }) => void) | undefined;
    const save = vi.fn(() => new Promise<{ kind: 'success'; message: string; nextStatus: string }>((resolve) => { settle = resolve; }));
    render(<MasterDetailDocument scenario={scenario({ save })} />);

    const saveButton = screen.getByRole('button', { name: '保存模拟单据' });
    await user.click(saveButton);
    await user.click(saveButton);
    expect(save).toHaveBeenCalledTimes(1);
    expect(saveButton).toBeDisabled();

    settle?.({ kind: 'success', message: '模拟保存完成。', nextStatus: '已提交' });
    expect(await screen.findByText('模拟操作已完成：模拟保存完成。')).toBeInTheDocument();
    expect(screen.getByText('业务状态：草稿')).toBeInTheDocument();
  });

  it('distinguishes readonly view mode and preserves dirty input when leaving is canceled', async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn();
    const { rerender } = render(<MasterDetailDocument scenario={scenario({ mode: 'view' })} onLeave={onLeave} />);
    expect(screen.getByRole('textbox', { name: '单据标题' })).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: '保存模拟单据' })).not.toBeInTheDocument();

    rerender(<MasterDetailDocument scenario={scenario()} onLeave={onLeave} />);
    const title = screen.getByRole('textbox', { name: '单据标题' });
    await user.clear(title);
    await user.type(title, '未保存标题');
    await user.click(screen.getByRole('button', { name: '离开单据' }));
    expect(screen.getByRole('dialog', { name: '确认离开' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '继续编辑' }));
    expect(screen.getByRole('textbox', { name: '单据标题' })).toHaveValue('未保存标题');
    expect(onLeave).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '离开单据' }));
    await user.click(screen.getByRole('button', { name: '确认离开' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
