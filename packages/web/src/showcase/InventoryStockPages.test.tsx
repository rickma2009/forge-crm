import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnterpriseGateway } from './gateway';
import { CurrentInventoryPage, InventoryTransactionPage } from './InventoryStockPages';

const mock = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('./gateway', () => ({ call: mock.call }));
const pagination = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
const balance = { id: '22222222-2222-4222-8222-222222222222', legalEntityId: '33333333-3333-4333-8333-333333333333', legalEntityName: '制造法人', warehouseId: '44444444-4444-4444-8444-444444444444', warehouseName: '成品仓', itemCode: 'P001', itemName: '控制板', itemType: 'PRODUCT', majorCategoryName: '电子', middleCategoryName: '板卡', minorCategoryName: '控制板', batchNo: 'B-001', baseUnit: '件', quantity: '8.0000', amount: '800.00', currencyCode: 'CNY', version: 1, updatedAt: '2026-10-03T00:00:00.000Z' };
const gateway = { legalEntities: vi.fn(async () => ({ items: [{ id: balance.legalEntityId, entityName: '制造法人' }], pagination })), warehouses: vi.fn(async () => ({ items: [{ id: balance.warehouseId, legalEntityId: balance.legalEntityId, warehouseName: '成品仓' }], pagination })), dictionaries: vi.fn(async () => []), inventoryBalances: vi.fn(async () => ({ items: [balance], pagination })) } as unknown as EnterpriseGateway;

beforeEach(() => { vi.clearAllMocks(); mock.call.mockImplementation(async (path: string) => ({ json: async () => path.includes('inventory-summary') ? { items: [{ itemCode: 'P001', itemName: '控制板', majorCategoryName: '电子', middleCategoryName: '板卡', minorCategoryName: '控制板', quantity: '8.0000', amount: '800.00', currencyCode: 'CNY' }], pagination } : { items: [{ id: 'txn-1', occurredAt: '2026-10-03T00:00:00.000Z', movementType: 'OUTBOUND', orderNo: 'XSCK001', sourceName: '销售出库', itemCode: 'P001', itemName: '控制板', batchNo: 'B-001', quantity: '-1.0000', amount: '-100.00', lineNo: 7 }], pagination } })); });

describe('库存页面', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each(['missing', 'changed'])('全部分页导出遇到 %s 时不生成部分文件', async outcome => {
    const createUrl = vi.fn((_blob: Blob) => 'blob:inventory');
    vi.stubGlobal('URL', class extends URL { static createObjectURL = createUrl; static revokeObjectURL = vi.fn(); });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      render(<CurrentInventoryPage systemCode="demo-portal" allowedActions={['view', 'export']} gateway={gateway} />);
      await screen.findByRole('button', { name: '查看 P001 库存明细' });
      mock.call.mockResolvedValueOnce({ json: async () => ({ items: [balance], pagination: { ...pagination, total: 2, totalPages: 2 } }) })
        .mockResolvedValueOnce({ json: async () => ({ items: outcome === 'missing' ? [] : [balance], pagination: { ...pagination, total: outcome === 'missing' ? 2 : 3, totalPages: 2 } }) });
      fireEvent.click(screen.getByRole('button', { name: '导出汇总' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(outcome === 'missing' ? '导出结果不完整' : '记录数量发生变化');
      expect(createUrl).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: '导出汇总' })).not.toBeDisabled();
    } finally { vi.unstubAllGlobals(); }
  });
  it('库存 CSV 与公共导出一致处理控制字符开头文本及引号换行', async () => {
    const createUrl = vi.fn((_blob: Blob) => 'blob:inventory');
    vi.stubGlobal('URL', class extends URL { static createObjectURL = createUrl; static revokeObjectURL = vi.fn(); });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      render(<CurrentInventoryPage systemCode="demo-portal" allowedActions={['view', 'export']} gateway={gateway} />);
      await screen.findByRole('button', { name: '查看 P001 库存明细' });
      mock.call.mockResolvedValue({ json: async () => ({ items: [{ ...balance, itemCode: '\t=1+1', itemName: '名称,"引号"\n下一行', minorCategoryName: '\r=2+2' }], pagination }) });
      fireEvent.click(screen.getByRole('button', { name: '导出汇总' }));
      await waitFor(() => expect(createUrl).toHaveBeenCalledOnce());
      const blob = createUrl.mock.calls[0][0] as Blob;
      let text = '';
      await act(async () => { text = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob); }); });
      expect(text).toContain('"\'\t=1+1"');
      expect(text).toContain('"\'\r=2+2"');
      expect(text).toContain('"名称,""引号""\n下一行"');
      expect(text).toContain('"8.0000","800.00","CNY"');
    } finally { vi.unstubAllGlobals(); }
  });
  describe.each([
    ['当前库存', CurrentInventoryPage],
    ['库存事务', InventoryTransactionPage],
  ])('%s 请求顺序', (_name, Component) => {
    it.each(['success', 'failure'])('旧请求晚到的 %s 不覆盖新结果或显示过期错误', async outcome => {
      type Response = { json: () => Promise<unknown> };
      let resolveOld!: (value: Response) => void, rejectOld!: (reason: Error) => void;
      const old = new Promise<Response>((resolve, reject) => { resolveOld = resolve; rejectOld = reject; });
      const response = (name: string): Response => ({ json: async () => ({ items: [{ ...balance, itemName: name, occurredAt: '2026-10-03T00:00:00.000Z', movementType: 'OUTBOUND', orderNo: 'XSCK001', sourceName: '销售出库', lineNo: 1 }], pagination }) });
      mock.call.mockImplementationOnce(() => old).mockResolvedValueOnce(response('新请求结果'));
      render(<Component systemCode="demo-portal" allowedActions={['view']} gateway={gateway} />);
      await waitFor(() => expect(mock.call).toHaveBeenCalledTimes(1));
      // Explicit retry while the initial request is still pending; filters stay identical.
      fireEvent.click(screen.getByRole('button', { name: '查询' }));
      expect(await screen.findByText('新请求结果')).toBeInTheDocument();
      await act(async () => {
        if (outcome === 'success') resolveOld(response('已过期旧结果'));
        else rejectOld(new Error('已过期旧错误'));
      });
      expect(screen.getByText('新请求结果')).toBeInTheDocument();
      expect(screen.queryByText('已过期旧结果')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(mock.call).toHaveBeenCalledTimes(2);
    });
  });
  it.each([
    ['当前库存', CurrentInventoryPage],
    ['库存事务', InventoryTransactionPage],
  ])('%s 在相同条件下再次查询和重置仍重新取数', async (_name, Component) => {
    render(<Component systemCode="demo-portal" allowedActions={['view']} gateway={gateway} />);
    await waitFor(() => expect(mock.call).toHaveBeenCalledTimes(1));
    const initialUrl = mock.call.mock.calls[0][0];
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(mock.call).toHaveBeenCalledTimes(2));
    expect(mock.call.mock.calls[1][0]).toBe(initialUrl);
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    await waitFor(() => expect(mock.call).toHaveBeenCalledTimes(3));
    expect(mock.call.mock.calls[2][0]).toBe(initialUrl);
  });
  it('导出按当前已应用筛选读取所有页，重新查询清空已选物料', async () => {
    const createUrl = vi.fn(() => 'blob:inventory');
    vi.stubGlobal('URL', class extends URL { static createObjectURL = createUrl; static revokeObjectURL = vi.fn(); });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      render(<CurrentInventoryPage systemCode="demo-portal" allowedActions={['view', 'export']} gateway={gateway} />);
      fireEvent.click(await screen.findByRole('button', { name: '查看 P001 库存明细' }));
      expect(await within(screen.getByRole('grid', { name: '物料库存明细' })).findByText('制造法人')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('物料名称'), { target: { value: '控制板' } });
      fireEvent.click(screen.getByRole('button', { name: '查询' }));
      await waitFor(() => expect(mock.call.mock.calls.at(-1)?.[0]).toContain('itemName='));
      expect(within(screen.getByRole('grid', { name: '物料库存明细' })).queryByText('制造法人')).toBeNull();
      mock.call.mockImplementation(async (path: string) => ({ json: async () => ({ items: [{ ...balance, itemCode: new URL(path, 'http://localhost').searchParams.get('page') === '1' ? 'P001' : 'P002' }], pagination: { ...pagination, total: 2, totalPages: 2 } }) }));
      fireEvent.click(screen.getByRole('button', { name: '导出汇总' }));
      await waitFor(() => expect(createUrl).toHaveBeenCalledOnce());
      const urls = mock.call.mock.calls.slice(-2).map(([url]) => new URL(url, 'http://localhost'));
      expect(urls.map((url) => url.searchParams.get('page'))).toEqual(['1', '2']);
      expect(urls.every((url) => url.searchParams.get('itemName') === '控制板')).toBe(true);
    } finally { vi.unstubAllGlobals(); }
  });
  it('物料汇总点击前明细为空，点击后按物料和币别联动', async () => {
    render(<CurrentInventoryPage systemCode="demo-portal" allowedActions={['view', 'export']} gateway={gateway} />);
    expect(await screen.findByRole('button', { name: '查看 P001 库存明细' })).toBeInTheDocument();
    expect(within(screen.getByRole('grid', { name: '物料库存明细' })).queryByText('制造法人')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '查看 P001 库存明细' }));
    expect(await within(screen.getByRole('grid', { name: '物料库存明细' })).findByText('制造法人')).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(gateway.inventoryBalances).mock.calls.at(-1)?.[1].get('itemCodeExact')).toBe('P001'));
    expect(vi.mocked(gateway.inventoryBalances).mock.calls.at(-1)?.[1].get('currencyCode')).toBe('CNY');
  });

  it('事务筛选保留类型、单号和期间，并在末列显示来源单据行号', async () => {
    render(<InventoryTransactionPage systemCode="demo-portal" allowedActions={['view']} gateway={gateway} />);
    expect(await screen.findByRole('grid', { name: '库存事务明细' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('事务类型'), { target: { value: 'OUTBOUND' } });
    fireEvent.change(screen.getByLabelText('单号'), { target: { value: 'XSCK' } });
    fireEvent.change(screen.getByLabelText('期间从'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(mock.call.mock.calls.at(-1)?.[0]).toContain('movementType=OUTBOUND'));
    expect(mock.call.mock.calls.at(-1)?.[0]).toContain('orderNo=XSCK');
    expect(mock.call.mock.calls.at(-1)?.[0]).toContain('from=2026-10-01');
    expect(screen.getByRole('columnheader', { name: '单据行号' })).toBeInTheDocument();
  });
});
