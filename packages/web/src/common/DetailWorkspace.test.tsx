import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DetailWorkspace, DetailHeader, DetailTabs, DetailPanel, DetailSection } from './DetailWorkspace';

describe('detail workspace accessibility', () => {
  it('supports keyboard tab navigation with matching panel and one tab stop', () => {
    function Fixture() {
      const [active, setActive] = useState('info');
      return <DetailWorkspace><DetailTabs id="record" label="详情分区" active={active} onChange={setActive} tabs={[{ id: 'info', label: '信息' }, { id: 'lines', label: '明细' }]} /><DetailPanel id="record" active={active}>{active}</DetailPanel></DetailWorkspace>;
    }
    render(<Fixture />);
    screen.getByRole('tab', { name: '信息' }).focus();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    const lines = screen.getByRole('tab', { name: '明细' });
    expect(lines).toHaveFocus(); expect(lines).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', lines.getAttribute('aria-controls'));
    expect(screen.getByRole('tab', { name: '信息' })).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(lines, { key: 'Home' });
    expect(screen.getByRole('tab', { name: '信息' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
    expect(lines).toHaveFocus();
  });
  it('keeps the explicit back callback and labeled summary with empty fallback', () => {
    const back = vi.fn();
    render(<DetailWorkspace><DetailHeader title="Q001" backLabel="返回报价列表" onBack={back} fields={[{ label: '客户', value: null }]} /><DetailSection title="报价产品明细">暂无明细</DetailSection></DetailWorkspace>);
    expect(screen.getByRole('heading', { name: 'Q001', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('客户：—')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回报价列表' }));
    expect(back).toHaveBeenCalledOnce();
    expect(screen.getByRole('region', { name: '报价产品明细' })).toBeInTheDocument();
  });
});
