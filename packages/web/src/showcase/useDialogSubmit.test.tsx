import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DialogSubmitError, useDialogSubmit } from './useDialogSubmit';

function Harness({ operation }: { operation: () => Promise<void> }) {
  const { error, saving, submit } = useDialogSubmit();
  return <form role="dialog" onSubmit={e => { e.preventDefault(); void submit(operation); }}>
    <DialogSubmitError error={error} /><input aria-label="名称" defaultValue="保留输入" />
    <button disabled={saving}>保存</button>
  </form>;
}

describe('dialog submission boundary', () => {
  it('keeps input, focuses the error and permits retry without stale messages', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error('编码重复')).mockResolvedValue(undefined);
    render(<Harness operation={operation} />);
    fireEvent.submit(screen.getByRole('dialog'));
    expect(await screen.findByRole('alert')).toHaveTextContent('编码重复');
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText('名称')).toHaveValue('保留输入');
    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate saves even before React rerenders', async () => {
    let done!: () => void;
    const operation = vi.fn(() => new Promise<void>(resolve => { done = resolve; }));
    render(<Harness operation={operation} />);
    fireEvent.submit(screen.getByRole('dialog'));
    fireEvent.submit(screen.getByRole('dialog'));
    expect(operation).toHaveBeenCalledOnce();
    expect(screen.getByRole('button')).toBeDisabled();
    await act(async () => done());
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('does not leak an old editor error into a newly opened dialog', async () => {
    let reject!: (reason: Error) => void;
    const pending = () => new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise; });
    const view = render(<Harness key="first" operation={pending} />);
    fireEvent.submit(screen.getByRole('dialog'));
    view.rerender(<Harness key="second" operation={async () => undefined} />);
    await act(async () => reject(new Error('旧请求失败')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
