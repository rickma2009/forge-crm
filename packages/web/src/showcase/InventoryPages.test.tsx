import { businessListDefaultConfig } from '@forge-crm/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { EnterpriseGateway } from './gateway';
import { InboundOrderPage, InventoryBalancePage, ItemDetailPage, ItemDirectoryPage } from './InventoryPages';

const page = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
const api = {
  listViews: vi.fn(async (_systemCode: string, pageCode = 'item-directory') => ({ pageCode, selectedViewKey: 'system:default', views: [{ viewKey: 'system:default', viewName: '默认视图', baseViewId: 'base', config: businessListDefaultConfig(pageCode === 'inbound-order-directory' ? 'inbound-order-directory' : 'item-directory'), scope: 'SYSTEM', allowPersonalOverride: true }] })),
  selectListView: vi.fn(async () => undefined),
  createPersonalListView: vi.fn(async () => undefined),
  items: vi.fn(async () => ({ items: [{ id: '11111111-1111-4111-8111-111111111111', itemCode: 'P001', itemName: '控制板', itemType: 'PRODUCT', itemSource: 'PURCHASED', itemSourceName: '外购', itemLifecycle: 'SAMPLE', itemLifecycleName: '样品', majorCategoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', majorCategoryName: '原材料', middleCategoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', middleCategoryName: '电子类', minorCategoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', minorCategoryName: '电阻', model: 'CB-1', productLine: '控制板', baseUnit: '件', batchManaged: false, status: 'ACTIVE', remark: null, version: 1, createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z' }], pagination: page })),
  itemDetail: vi.fn(async () => ({ id: '11111111-1111-4111-8111-111111111111', itemCode: 'P001', itemName: '控制板', itemType: 'PRODUCT', itemSource: 'PURCHASED', itemSourceName: '外购', itemLifecycle: 'SAMPLE', itemLifecycleName: '样品', majorCategoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', majorCategoryName: '原材料', middleCategoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', middleCategoryName: '电子类', minorCategoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', minorCategoryName: '电阻', model: 'CB-1', productLine: '控制板', baseUnit: '件', batchManaged: false, status: 'ACTIVE', remark: null, version: 1, createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z' })),
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

  it('shows current dictionary labels in item detail and edits stable codes', async () => {
    const user = userEvent.setup();
    vi.mocked(api.dictionaries).mockResolvedValue([
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', dictCode: 'item_source', dictName: '物料来源', groupCode: 'inventory', parentId: null, description: null, sortNo: 1, status: 'ACTIVE', itemsEditable: true, version: 1, items: [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', itemCode: 'PURCHASED', itemValue: 'PURCHASED', itemName: '外购', colorKey: null, description: null, sortNo: 10, status: 'ACTIVE', version: 1 }] },
      { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', dictCode: 'item_lifecycle', dictName: '物料生命周期阶段', groupCode: 'inventory', parentId: null, description: null, sortNo: 2, status: 'ACTIVE', itemsEditable: true, version: 1, items: [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', itemCode: 'SAMPLE', itemValue: 'SAMPLE', itemName: '样品', colorKey: null, description: null, sortNo: 10, status: 'ACTIVE', version: 1 }] },
    ]);
    render(<ItemDetailPage systemCode="demo-portal" itemId="11111111-1111-4111-8111-111111111111" allowedActions={['update']} gateway={api} />);
    const source = await screen.findByLabelText('物料来源') as HTMLSelectElement;
    const lifecycle = screen.getByLabelText('物料生命周期阶段') as HTMLSelectElement;
    expect(source.value).toBe('PURCHASED');
    expect(source.selectedOptions[0]).toHaveTextContent('外购');
    expect(lifecycle.value).toBe('SAMPLE');
    expect(lifecycle.selectedOptions[0]).toHaveTextContent('样品');
    await user.click(screen.getByRole('button', { name: '编辑物料' }));
    expect(source).toBeEnabled();
    expect(lifecycle).toBeEnabled();
  });

  it('uses the shared back control and keeps the same read-only form in browse mode', async () => {
    const user = userEvent.setup();
    render(<ItemDetailPage systemCode="demo-portal" itemId="11111111-1111-4111-8111-111111111111" allowedActions={['update']} gateway={api} />);

    const back = await screen.findByRole('button', { name: '返回物料列表' });
    expect(back).toHaveClass('detail-back');
    expect(back).toHaveAttribute('title', '返回物料列表');
    expect(back).not.toHaveTextContent('←');

    const code = screen.getByLabelText('物料编码');
    const name = screen.getByLabelText('物料名称');
    const type = screen.getByLabelText('物料类型');
    const remark = screen.getByLabelText('备注');
    expect(code).toBeDisabled();
    expect(name).toBeDisabled();
    expect(type).toBeDisabled();
    expect(remark).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '编辑物料' }));
    expect(screen.getByLabelText('物料编码')).toBe(code);
    expect(screen.getByLabelText('物料编码')).toBeDisabled();
    expect(screen.getByLabelText('物料名称')).toBe(name);
    expect(screen.getByLabelText('物料名称')).toBeEnabled();
    expect(screen.getByLabelText('物料类型')).toBe(type);
    expect(screen.getByLabelText('物料类型')).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '取消编辑' }));
    expect(screen.getByLabelText('物料名称')).toBe(name);
    expect(screen.getByLabelText('物料名称')).toBeDisabled();
  });
  it('keeps inventory balances read-only', async () => {
    render(<InventoryBalancePage systemCode="demo-portal" allowedActions={['view']} gateway={api} />);
    expect(await screen.findByText('8.0000')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新增|修改|删除/ })).not.toBeInTheDocument();
  });


  it('renders an inbound list whose document number opens detail', async () => {
    render(<InboundOrderPage systemCode="demo-portal" allowedActions={['view']} gateway={api} />);
    expect(await screen.findByRole('link', { name: 'RK2026092400001' })).toHaveAttribute('href', '/#/showcase/inbound-orders/55555555-5555-4555-8555-555555555555');
    expect(screen.getByRole('group', { name: '列表视图选择与设置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改入库单 RK2026092400001' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除入库单 RK2026092400001' })).toBeDisabled();
  });

  it('enables draft row actions and disables them after audit', async () => {
    const inboundOrders = vi.mocked(api.inboundOrders);
    const original = inboundOrders.getMockImplementation()!;
    const first = (await inboundOrders('demo-portal', new URLSearchParams())).items[0];
    inboundOrders.mockImplementation(async () => ({ items: [first, { ...first, id: '77777777-7777-4777-8777-777777777777', orderNo: 'RK2026092400002', status: 'POSTED' }], pagination: { ...page, total: 2 } }));
    const command = vi.fn(async () => ({ ...first, status: 'VOIDED' as const }));
    const gateway = { ...api, commandInboundOrder: command } as EnterpriseGateway;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<InboundOrderPage systemCode="demo-portal" allowedActions={['view', 'update', 'void']} gateway={gateway} />);
    expect(await screen.findByRole('button', { name: '修改入库单 RK2026092400001' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '删除入库单 RK2026092400001' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '修改入库单 RK2026092400002' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除入库单 RK2026092400002' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '删除入库单 RK2026092400001' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('demo-portal', first.id, 'void', expect.objectContaining({ version: 1 })));
    confirm.mockRestore(); inboundOrders.mockImplementation(original);
  });

  it('submits the inbound order number filter from the shared query bar', async () => {
    const inboundOrders = vi.mocked(api.inboundOrders);
    inboundOrders.mockClear();
    render(<InboundOrderPage systemCode="demo-portal" allowedActions={['view']} gateway={api} />);
    await screen.findByRole('link', { name: 'RK2026092400001' });
    fireEvent.change(screen.getByPlaceholderText('入库单号'), { target: { value: 'RK20260924' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(inboundOrders).toHaveBeenCalledTimes(2));
    const params = inboundOrders.mock.calls.at(-1)?.[1] as URLSearchParams;
    expect(params.get('keyword')).toBe('RK20260924');
  });
});
