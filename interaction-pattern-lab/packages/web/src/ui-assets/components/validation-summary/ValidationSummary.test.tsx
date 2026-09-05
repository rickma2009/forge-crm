import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ValidationSummary } from './ValidationSummary';

describe('TASK-1005 ValidationSummary navigation', () => {
  it('announces the error count and moves keyboard activation to a visible actionable field', async () => {
    const user = userEvent.setup();
    render(<>
      <ValidationSummary errors={[{ error: { id: 'ERR-title', fieldId: 'title', message: '请填写单据标题。' }, targetId: 'field-title' }]} />
      <input id="field-title" aria-label="单据标题" />
    </>);

    expect(screen.getByRole('region', { name: '校验摘要' })).toHaveTextContent('发现 1 个错误');
    const errorAction = screen.getByRole('button', { name: '请填写单据标题。' });
    errorAction.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('textbox', { name: '单据标题' })).toHaveFocus();
    expect(errorAction).toHaveAttribute('aria-controls', 'field-title');
  });

  it('activates a hidden-field reveal target after moving focus to it', async () => {
    const user = userEvent.setup();
    const reveal = vi.fn();
    render(<>
      <ValidationSummary errors={[{ error: { id: 'ERR-approval', fieldId: 'approvalCode', message: '请填写审批编号。' }, targetId: 'reveal-approval' }]} />
      <button id="reveal-approval" type="button" onClick={reveal}>显示审批编号字段以修复错误</button>
    </>);

    await user.click(screen.getByRole('button', { name: '请填写审批编号。' }));

    expect(screen.getByRole('button', { name: '显示审批编号字段以修复错误' })).toHaveFocus();
    expect(reveal).toHaveBeenCalledOnce();
  });
});
