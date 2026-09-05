import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ValidationSummary } from '../validation-summary/ValidationSummary';
import { SchemaForm, errorTargetId } from './SchemaForm';
import { resolveHiddenErrors } from './rules';
import type { FieldError, FieldSchema } from './types';

interface DocumentValues {
  title: string;
  owner: string;
  approvalCode: string;
  paymentType: string;
}

const groups = [
  { id: 'general', label: '基本信息' },
  { id: 'approval', label: '审批信息' },
];

const fields: FieldSchema<DocumentValues>[] = [
  { id: 'title', kind: 'text', label: '单据标题', groupId: 'general', requiredWhen: { type: 'always', value: true }, helpText: '用于在工作台中识别单据。' },
  { id: 'owner', kind: 'text', label: '负责人', groupId: 'general', disabledReason: '创建后由审批流分配负责人。' },
  { id: 'paymentType', kind: 'select', label: '付款方式', groupId: 'approval', options: [{ value: 'prepaid', label: '预付' }, { value: 'credit', label: '赊销' }] },
  { id: 'approvalCode', kind: 'text', label: '审批编号', groupId: 'approval', visibleWhen: { type: 'field-equals', fieldId: 'paymentType', value: 'credit' } },
];

const editableValues: DocumentValues = { title: '九月采购单', owner: '陈思远', paymentType: 'credit', approvalCode: '' };

describe('TASK-1005 SchemaForm rendering', () => {
  it('renders declared groups with required labels, help, disabled reason, and linked inline errors', () => {
    const errors: FieldError<DocumentValues>[] = [{ id: 'ERR-title', fieldId: 'title', message: '请填写单据标题。' }];

    render(<SchemaForm groups={groups} schema={fields} values={editableValues} errors={errors} mode="create" onChange={() => undefined} />);

    expect(screen.getByRole('group', { name: '基本信息' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '审批信息' })).toBeInTheDocument();
    expect(screen.getByText('单据标题')).toBeInTheDocument();
    expect(screen.getByText('必填')).toBeInTheDocument();
    expect(screen.getByText('用于在工作台中识别单据。')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('请填写单据标题。');

    const title = screen.getByRole('textbox', { name: /单据标题/ });
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAttribute('aria-describedby', expect.stringContaining('schema-form-help-title'));
    expect(title).toHaveAttribute('aria-describedby', expect.stringContaining('schema-form-error-ERR-title'));

    const owner = screen.getByRole('textbox', { name: '负责人' });
    expect(owner).toBeDisabled();
    expect(screen.getByText('创建后由审批流分配负责人。')).toBeInTheDocument();
    expect(owner).toHaveAttribute('aria-describedby', expect.stringContaining('schema-form-disabled-owner'));
  });

  it('keeps view values focusable and selectable while controlled edits emit the next value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<SchemaForm groups={groups} schema={fields} values={editableValues} errors={[]} mode="view" onChange={onChange} />);

    const readonlyTitle = screen.getByRole('textbox', { name: /单据标题/ }) as HTMLInputElement;
    expect(readonlyTitle).toHaveAttribute('readonly');
    expect(readonlyTitle).not.toBeDisabled();
    await user.click(readonlyTitle);
    readonlyTitle.setSelectionRange(0, readonlyTitle.value.length);
    expect(readonlyTitle.selectionStart).toBe(0);
    expect(readonlyTitle.selectionEnd).toBe('九月采购单'.length);
    expect(onChange).not.toHaveBeenCalled();

    rerender(<ControlledSchemaForm onChange={onChange} />);
    const editableTitle = screen.getByRole('textbox', { name: /单据标题/ });
    await user.clear(editableTitle);
    await user.type(editableTitle, '十月采购单');

    expect(editableTitle).toHaveValue('十月采购单');
    expect(onChange).toHaveBeenLastCalledWith(
      { ...editableValues, title: '十月采购单' },
      { fieldId: 'title', value: '十月采购单' },
    );
  });

  it('activates the hidden-field reveal control from the error summary without dropping the error', async () => {
    const user = userEvent.setup();
    const errors: FieldError<DocumentValues>[] = [{ id: 'ERR-approval', fieldId: 'approvalCode', message: '请填写审批编号。' }];
    const values = { ...editableValues, paymentType: 'prepaid' };
    const resolution = resolveHiddenErrors(errors, fields, values, 'create', 'reveal');
    const onRevealError = vi.fn();

    render(<>
      <ValidationSummary errors={errors.map((error) => ({ error, targetId: errorTargetId(error, resolution) }))} />
      <SchemaForm groups={groups} schema={fields} values={values} errors={errors} mode="create" onChange={() => undefined} hiddenErrorResolution={resolution} onRevealError={onRevealError} />
    </>);

    const summaryAction = screen.getByRole('button', { name: '请填写审批编号。' });
    await user.click(summaryAction);

    const reveal = screen.getByRole('button', { name: '显示审批编号字段以修复错误' });
    expect(reveal).toHaveFocus();
    expect(onRevealError).toHaveBeenCalledWith(errors[0]);
    expect(screen.getByRole('alert')).toHaveTextContent('请填写审批编号。');
  });

  it('exposes a clear action for hidden errors when the supplied policy requires clear', async () => {
    const user = userEvent.setup();
    const errors: FieldError<DocumentValues>[] = [{ id: 'ERR-approval', fieldId: 'approvalCode', message: '请填写审批编号。' }];
    const values = { ...editableValues, paymentType: 'prepaid' };
    const resolution = resolveHiddenErrors(errors, fields, values, 'create', 'clear');
    const onClearHiddenErrors = vi.fn();

    render(<SchemaForm groups={groups} schema={fields} values={values} errors={errors} mode="create" onChange={() => undefined} hiddenErrorResolution={resolution} onClearHiddenErrors={onClearHiddenErrors} />);

    await user.click(screen.getByRole('button', { name: '清除审批编号的隐藏错误' }));
    expect(onClearHiddenErrors).toHaveBeenCalledWith(['ERR-approval']);
    expect(screen.getByRole('alert')).toHaveTextContent('请填写审批编号。');
  });
});

function ControlledSchemaForm({ onChange }: { onChange: ReturnType<typeof vi.fn> }) {
  const [values, setValues] = useState(editableValues);
  return <SchemaForm groups={groups} schema={fields} values={values} errors={[]} mode="create" onChange={(nextValues, change) => {
    setValues(nextValues);
    onChange(nextValues, change);
  }} />;
}
