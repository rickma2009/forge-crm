import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { EditableLineGrid, type LineColumn } from './EditableLineGrid';
import { createEditableLineState, reduceEditableLines } from './reducer';
import type { EditableLineState, LineMutation, LineRecord } from './types';

interface ExampleLine extends LineRecord {
  description: string;
  quantity: number;
  amountMinorUnits: number;
}

const columns: LineColumn<ExampleLine>[] = [
  { id: 'description', label: '描述', editable: true, getValue: (row: ExampleLine) => row.description },
  { id: 'quantity', label: '数量', editable: true, inputType: 'number' as const, getValue: (row: ExampleLine) => row.quantity },
  { id: 'amountMinorUnits', label: '金额', getValue: (row: ExampleLine) => row.amountMinorUnits, format: (value: unknown) => `¥${Number(value) / 100}` },
];

const initialRows: ExampleLine[] = [
  { rowId: 'persisted-a', persistedState: 'persisted', description: '已保存行', quantity: 2, amountMinorUnits: 1250 },
  { rowId: 'draft-a', persistedState: 'draft', description: '草稿行', quantity: 1, amountMinorUnits: 300 },
];

describe('TASK-1007 EditableLineGrid', () => {
  it('keeps table actions controlled while adding, selecting, copying, deleting a draft, and undoing a persisted deletion', async () => {
    const user = userEvent.setup();
    render(<ControlledGrid />);

    expect(screen.getByRole('table', { name: '单据行' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /已保存行 操作/ })).toHaveAttribute('data-fixed-actions', 'true');

    await user.click(screen.getByRole('checkbox', { name: '选择已保存行' }));
    expect(screen.getByRole('checkbox', { name: '选择已保存行' })).toBeChecked();

    const persistedRow = screen.getByRole('row', { name: '已保存行 已保存' });
    await user.click(within(persistedRow).getByRole('button', { name: '复制已保存行' }));
    expect(screen.getByRole('row', { name: '已保存行 草稿' })).toBeInTheDocument();
    expect(screen.getByText('存在未保存的行变更')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '删除草稿行' }));
    expect(screen.queryByRole('row', { name: /草稿行/ })).not.toBeInTheDocument();

    await user.click(within(screen.getByRole('row', { name: '已保存行 已保存' })).getByRole('button', { name: '删除已保存行' }));
    expect(screen.getByRole('row', { name: /已保存行.*已标记删除/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '撤销删除已保存行' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '撤销删除已保存行' }));
    expect(screen.getByRole('row', { name: /已保存行.*已保存/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: '候选行' }), 'candidate-a');
    await user.click(screen.getByRole('button', { name: '添加候选行' }));
    expect(screen.getByRole('row', { name: /候选项 A/ })).toBeInTheDocument();
  });

  it('supports row entry, logical Tab movement, Escape cancellation, injected money formatting, and error-summary focus', async () => {
    const user = userEvent.setup();
    render(<ControlledGrid />);

    expect(screen.getByText('¥12.5')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /已保存行/ });
    act(() => row.focus());
    await user.keyboard('{Enter}');
    const description = screen.getByRole('textbox', { name: '已保存行 描述' });
    expect(description).toHaveFocus();

    await user.clear(description);
    await user.type(description, '已取消的编辑');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: '编辑已保存行的描述' })).toHaveFocus();
    expect(screen.getByText('已保存行')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    await user.clear(screen.getByRole('textbox', { name: '已保存行 描述' }));
    await user.type(screen.getByRole('textbox', { name: '已保存行 描述' }), '已更新行');
    await user.keyboard('{Tab}');
    expect(screen.getByRole('spinbutton', { name: '已更新行 数量' })).toHaveFocus();
    expect(screen.getByText('已更新行')).toBeInTheDocument();

    const errorAction = screen.getByRole('button', { name: '已更新行：数量必须大于零。' });
    act(() => errorAction.focus());
    await user.keyboard('{Enter}');
    expect(screen.getByRole('spinbutton', { name: '已更新行 数量' })).toHaveFocus();
  });

  it('focuses a stable explanation when a non-editable field error is activated from the keyboard summary', async () => {
    const user = userEvent.setup();
    render(<ErrorGrid errors={[{ id: 'amount-error', rowId: 'persisted-a', fieldId: 'amountMinorUnits', message: '金额由价格策略计算。' }]} />);

    const summary = screen.getByRole('button', { name: '已保存行：金额由价格策略计算。' });
    act(() => summary.focus());
    await user.keyboard('{Enter}');

    const target = screen.getByRole('note', { name: '已保存行 金额 当前不可编辑：字段未配置为可编辑。' });
    expect(target).toHaveFocus();
    expect(summary).toHaveAttribute('aria-controls', target.id);
  });

  it('focuses a stable explanation for a view-mode error instead of an unavailable edit control', async () => {
    const user = userEvent.setup();
    render(<ErrorGrid mode="view" errors={[{ id: 'view-error', rowId: 'persisted-a', fieldId: 'description', message: '查看模式仍需说明错误位置。' }]} />);

    const summary = screen.getByRole('button', { name: '已保存行：查看模式仍需说明错误位置。' });
    act(() => summary.focus());
    await user.keyboard('{Enter}');

    expect(screen.getByRole('note', { name: '已保存行 描述 当前不可编辑：当前为查看模式。' })).toHaveFocus();
  });

  it('focuses a stable explanation for an error on a marked-for-deletion row', async () => {
    const user = userEvent.setup();
    const deleted = { ...initialRows[0], rowId: 'deleted-a', persistedState: 'marked-for-deletion' as const, description: '待删除行' };
    render(<ErrorGrid rows={[deleted]} errors={[{ id: 'deleted-error', rowId: 'deleted-a', fieldId: 'description', message: '删除前仍需核对。' }]} />);

    const summary = screen.getByRole('button', { name: '待删除行：删除前仍需核对。' });
    act(() => summary.focus());
    await user.keyboard('{Enter}');

    expect(screen.getByRole('note', { name: '待删除行 描述 当前不可编辑：该行已标记删除。' })).toHaveFocus();
  });

  it('moves Tab from the final editable cell to the row action instead of swallowing focus', async () => {
    const user = userEvent.setup();
    render(<ControlledGrid />);

    const row = screen.getByRole('row', { name: '已保存行 已保存' });
    act(() => row.focus());
    await user.keyboard('{Enter}');
    await user.clear(screen.getByRole('textbox', { name: '已保存行 描述' }));
    await user.type(screen.getByRole('textbox', { name: '已保存行 描述' }), '末单元格行');
    await user.keyboard('{Tab}');
    expect(screen.getByRole('spinbutton', { name: '末单元格行 数量' })).toHaveFocus();

    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: '复制末单元格行' })).toHaveFocus();
  });
});

function ErrorGrid({ rows = initialRows, errors, mode = 'edit' }: {
  rows?: ExampleLine[];
  errors: Array<{ id: string; rowId: string; fieldId: string; message: string }>;
  mode?: 'create' | 'view' | 'edit';
}) {
  return <EditableLineGrid
    ariaLabel="错误行表"
    rows={rows}
    columns={columns}
    selection={new Set()}
    dirty={false}
    mode={mode}
    emptyLine={{ description: '', quantity: 0, amountMinorUnits: 0 }}
    errors={errors}
    summary={[]}
    onMutation={() => undefined}
  />;
}

function ControlledGrid() {
  const [state, setState] = useState<EditableLineState<ExampleLine>>(() => createEditableLineState(initialRows, new Set(['draft-a'])));
  const [nextId, setNextId] = useState(1);
  const dispatch = (mutation: LineMutation<ExampleLine>) => {
    const result = reduceEditableLines(state, mutation, () => `draft-${nextId}`);
    setState(result.state);
    if (result.outcome.kind === 'applied' && (mutation.type === 'append-empty' || mutation.type === 'append-candidate' || mutation.type === 'copy')) {
      setNextId((value) => value + 1);
    }
  };
  return <EditableLineGrid
    ariaLabel="单据行"
    rows={state.rows}
    columns={columns}
    selection={state.selection}
    dirty={state.dirty}
    mode="edit"
    emptyLine={{ description: '', quantity: 0, amountMinorUnits: 0 }}
    candidates={[{ id: 'candidate-a', label: '候选项 A', values: { description: '候选项 A', quantity: 4, amountMinorUnits: 500 } }]}
    errors={[{ id: 'line-quantity', rowId: 'persisted-a', fieldId: 'quantity', message: '数量必须大于零。' }]}
    summary={[{ id: 'total', label: '行金额合计', value: '¥15.5' }]}
    undoTokens={state.pendingDeletions}
    onMutation={dispatch}
  />;
}
