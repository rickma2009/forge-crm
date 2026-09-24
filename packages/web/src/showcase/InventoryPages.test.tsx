import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EnterpriseGateway } from './gateway';
import { InboundOrderPage, InventoryBalancePage, ItemDetailPage, ItemDirectoryPage } from './InventoryPages';

const page = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
const api = {
  items: vi.fn(async () => ({ items: [{ id: '11111111-1111-4111-8111-111111111111', itemCode: 'P001', itemName: '控制板', itemType: 'PRODUCT', majorCategoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', majorCategoryName: '原材料', middleCategoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', middleCategoryName: '电子类', minorCategoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', minorCategoryName: '电阻', model: 'CB-1', productLine: '控制板', baseUnit: '件', batchManaged: false, status: 'ACTIVE', remark: null, version: 1, createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z' }], pagination: page })),
  itemDetail: vi.fn(async () => ({ id: '11111111-1111-4111-8111-111111111111', itemCode: 'P001', itemName: '控制板', itemType: 'PRODUCT', majorCategoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', majorCategoryName: '原材料', middleCategoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', middleCategoryName: '电子类', minorCategoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', minorCategoryName: '电阻', model: 'CB-1', productLine: '控制板', baseUnit: '件', batchManaged: false, status: 'ACTIVE', remark: null, version: 1, createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z' })),
  dictionaries: vi.fn(async () => []),
  inventoryBalances: vi.fn(async () => ({ items: [{ id: '22222222-2222-4222-8222-222222222222', legalEntityId: '33333333-3333-4333-8333-333333333333', warehouseId: '44444444-4444-4444-8444-444444444444', itemCode: 'P001', itemName: '控制板', itemType: 'PRODUCT', batchNo: null, baseUnit: '件', quantity: '8.0000', amount: '800.00', currencyCode: 'CNY', version: 1, updatedAt: '2026-09-24T00:00:00.000Z' }], pagination: page })),
  inboundOrders: vi.fn(async () => ({ items: [{ id: '55555555-5555-4555-8555-555555555555', orderNo: 'RK2026092400001', documentDate: '2026-09-24', inboundType: 'FINISHED_GOODS', status: 'DRAFT', legalEntityId: '33333333-3333-4333-8333-333333333333', legalEntityName: '部件法人', warehouseId: '44444444-4444-4444-8444-444444444444', warehouseName: '成品仓', factoryCode: null, reasonCode: 'FINISHED_GOODS', currencyCode: 'CNY', remark: null, postedAt: null, reversedAt: null, version: 1, createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z', lines: [] }], pagination: page })),
} as unknown as EnterpriseGateway;

describe('inventory pages', () => {
  it('uses the item code as detail entry and has no view action', async () => {
    render(<ItemDirectoryPage systemCode="demo-portal" allowedActions={[]} gateway={api} />);
    expect(await screen.findByText('P001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /查看物项/ })).not.toBeInTheDocument();
  });

  it('opens item browsing and editing in a three-tab detail page', async () => {
    render(<ItemDetailPage systemCode="demo-portal" itemId="11111111-1111-4111-8111-111111111111" allowedActions={['update', 'price-view', 'attachment-view']} gateway={api} />);
    expect(await screen.findByRole('heading', { name: '控制板' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '物料基本信息' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '物料定价' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '附件' })).toBeInTheDocument();
    expect(screen.getByText('原材料')).toBeInTheDocument();
  });
  it('keeps inventory balances read-only', async () => {
    render(<InventoryBalancePage systemCode="demo-portal" allowedActions={['view']} gateway={api} />);
    expect(await screen.findByText('8.0000')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新增|修改|删除/ })).not.toBeInTheDocument();
  });


  it('renders an inbound list whose document number opens detail', async () => {
    render(<InboundOrderPage systemCode="demo-portal" allowedActions={['view']} gateway={api} />);
    expect(await screen.findByRole('link', { name: 'RK2026092400001' })).toHaveAttribute('href', '#/showcase/inbound-orders/55555555-5555-4555-8555-555555555555');
  });

  it('submits the inbound order number filter from the shared query bar', async () => {
    const inboundOrders = vi.mocked(api.inboundOrders);
    inboundOrders.mockClear();
    render(<InboundOrderPage systemCode="demo-portal" allowedActions={['view']} gateway={api} />);
    fireEvent.change(screen.getByPlaceholderText('入库单号'), { target: { value: 'RK20260924' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(inboundOrders).toHaveBeenCalledTimes(2));
    const params = inboundOrders.mock.calls.at(-1)?.[1] as URLSearchParams;
    expect(params.get('keyword')).toBe('RK20260924');
  });
});
