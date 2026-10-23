import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecordQueryBar } from './RecordQueryBar';

describe('query bar state ownership', () => {
  it('does not query on draft edits; submit and reset use the owning page conditions', async () => {
    const request = vi.fn();
    function Host() {
      const [keyword, setKeyword] = useState('');
      return <RecordQueryBar onQuery={() => request(keyword)} onReset={() => { setKeyword(''); request(''); }}>
        <label>关键词<input value={keyword} onChange={event => setKeyword(event.target.value)} /></label>
      </RecordQueryBar>;
    }
    render(<Host />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('关键词'), '客户甲');
    expect(request).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(request.mock.calls).toEqual([['客户甲']]);
    await user.type(screen.getByLabelText('关键词'), '草稿');
    expect(request).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: '重置' }));
    expect(screen.getByLabelText('关键词')).toHaveValue('');
    expect(request.mock.calls).toEqual([['客户甲'], ['']]);
  });

  it('blocks submit events while query is disabled but leaves reset to the owner', () => {
    const query = vi.fn(), reset = vi.fn();
    const { rerender } = render(<RecordQueryBar onQuery={query} onReset={reset} queryDisabled><input aria-label="条件" /></RecordQueryBar>);
    expect(screen.getByRole('button', { name: '查询' })).toBeDisabled();
    // Direct form submission also must respect the flag, independently of button behavior.
    fireEvent.submit(screen.getByRole('form', { name: '查询条件' }));
    expect(query).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    expect(reset).toHaveBeenCalledOnce();
    rerender(<RecordQueryBar onQuery={query} onReset={reset}><input aria-label="条件" /></RecordQueryBar>);
    fireEvent.submit(screen.getByRole('form', { name: '查询条件' }));
    expect(query).toHaveBeenCalledOnce();
  });
});
