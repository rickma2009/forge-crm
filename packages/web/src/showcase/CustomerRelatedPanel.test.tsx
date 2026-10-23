import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CustomerOverviewPanel, CustomerRelatedPanel } from './CustomerRelatedPanel';
import { customerRelatedApi } from './customer-related-api';
import type { CustomerRelatedPage } from '@forge-crm/contracts';
vi.mock('./customer-related-api', () => ({ customerRelatedApi: { list: vi.fn(), overview: vi.fn() } }));
const response = (code: string, page = 1): CustomerRelatedPage => ({ items: [{ id: '00000000-0000-4000-8000-000000000001', code, name: '项目', status: 'DRAFT', amount: '123.00', currency: 'CNY', date: '2026-10-03', owner: '张三', stage: null }], pagination: { page, pageSize: 20, total: 21, totalPages: 2 } });
beforeEach(() => vi.resetAllMocks());
describe('customer related panels', () => {
  it('paginates and opens the existing record route', async () => {
    vi.mocked(customerRelatedApi.list).mockImplementation(async (_c, _id, _k, page) => response(`SO-${page}`, page));
    const onOpen = vi.fn(), user = userEvent.setup();
    render(<CustomerRelatedPanel systemCode="demo" customerId="a" kind="sales-orders" onOpen={onOpen} />);
    await user.click(await screen.findByRole('link', { name: 'SO-1' }));
    expect(onOpen).toHaveBeenCalledWith('/showcase/sales-orders/00000000-0000-4000-8000-000000000001');
    await user.click(screen.getByRole('button', { name: /下一页/ }));
    expect(await screen.findByRole('link', { name: 'SO-2' })).toBeVisible();
    expect(customerRelatedApi.list).toHaveBeenLastCalledWith('demo', 'a', 'sales-orders', 2, 20);
  });
  it('clears stale rows on failure and retries the current query', async () => {
    vi.mocked(customerRelatedApi.list).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response('Q-1'));
    const user = userEvent.setup(); render(<CustomerRelatedPanel systemCode="demo" customerId="a" kind="quotations" />);
    await screen.findByRole('alert'); expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByRole('link', { name: 'Q-1' })).toHaveAttribute('href', '#/showcase/quotations/00000000-0000-4000-8000-000000000001');
  });
  it('ignores an older customer response that finishes last', async () => {
    let resolve!: (value: CustomerRelatedPage) => void;
    vi.mocked(customerRelatedApi.list).mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce(response('NEW'));
    const view = render(<CustomerRelatedPanel systemCode="demo" customerId="old" kind="opportunities" />);
    view.rerender(<CustomerRelatedPanel systemCode="demo" customerId="new" kind="opportunities" />);
    await screen.findByRole('link', { name: 'NEW' });
    await act(async () => { resolve(response('OLD')); });
    expect(screen.queryByRole('link', { name: 'OLD' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'NEW' })).toBeVisible();
  });
  it('shows only authorized counts and does not turn a failed count into zero', async () => {
    vi.mocked(customerRelatedApi.overview).mockResolvedValue({ items: [{ kind: 'quotations', count: 7, error: false }, { kind: 'sales-orders', count: null, error: true }] });
    const onSelect = vi.fn(), user = userEvent.setup();
    render(<CustomerOverviewPanel systemCode="demo" customerId="a" onSelect={onSelect} />);
    await user.click(await screen.findByRole('button', { name: '7 条' })); expect(onSelect).toHaveBeenCalledWith('quotations');
    expect(screen.queryByText('商机', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('加载失败，请刷新概览')).toBeVisible();
    await waitFor(() => expect(customerRelatedApi.overview).toHaveBeenCalledTimes(1));
  });
});
