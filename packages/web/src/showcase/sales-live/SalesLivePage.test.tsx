import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesLivePage } from './SalesLivePage';

const api = vi.hoisted(() => ({ orders: vi.fn(), outbounds: vi.fn(), sources: vi.fn(), createOrder: vi.fn() }));
vi.mock('./api', () => ({ salesApi: api }));

const props = { systemCode: 'demo-portal', userId: '00000000-0000-4000-8000-000000000001', allowedActions: ['view', 'create', 'update'], onNavigate: vi.fn() };
const order = (index: number) => ({ id: `order-${index}`, orderNo: `SO-${index}`, customerName: `客户${index}`, orderDate: '2026-10-03', sourceType: 'MANUAL', sourceNo: null, amount: '100.00', netAmount: '100.00', status: 'DRAFT', fulfillmentStatus: 'NOT_SHIPPED' });

beforeEach(() => { vi.clearAllMocks(); props.onNavigate = vi.fn(); });

describe('真实销售工作区', () => {
  it('销售订单列表使用服务端分页并从工作区打开新增页', async () => {
    api.orders.mockImplementation(async (_code: string, query: URLSearchParams) => { const page = Number(query.get('page')); return { items: Array.from({ length: 20 }, (_, index) => order((page - 1) * 20 + index + 1)), pagination: { page, pageSize: 20, total: 100, totalPages: 5 } }; });
    render(<SalesLivePage {...props} path="/showcase/sales-orders" />);
    expect(await screen.findByText('共 100 条 · 第 1 / 5 页')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(await screen.findByText('共 100 条 · 第 2 / 5 页')).toBeInTheDocument();
    await waitFor(() => expect(api.orders.mock.calls.at(-1)?.[1].get('page')).toBe('2'));
    fireEvent.click(screen.getByRole('button', { name: '新增销售订单' }));
    expect(props.onNavigate).toHaveBeenCalledWith('/showcase/sales-orders/new');
  });

  it('按客户新建默认为单选，选择客户后创建真实草稿', async () => {
    const customer = { id: '00000000-0000-4000-8000-000000000002', customerCode: 'C001', customerName: '测试客户', shortName: '测试客户' };
    api.sources.mockResolvedValue([customer]);
    api.createOrder.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000003' });
    render(<SalesLivePage {...props} path="/showcase/sales-orders/new" />);
    expect(screen.getByRole('radio', { name: '按客户新建' })).toBeChecked();
    const selected = await screen.findByRole('radio', { name: `选择 ${customer.id}` });
    fireEvent.click(selected);
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledWith('demo-portal', expect.objectContaining({ sourceType: 'MANUAL', customerId: customer.id, lines: [] })));
    expect(props.onNavigate).toHaveBeenCalledWith('/showcase/sales-orders/00000000-0000-4000-8000-000000000003/edit');
  });
});
