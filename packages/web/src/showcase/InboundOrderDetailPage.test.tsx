import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { InboundOrder } from '@forge-crm/contracts';
import type { EnterpriseGateway } from './gateway';
import { InboundOrderPage } from './InventoryPages';
const entityId = '33333333-3333-4333-8333-333333333333', warehouseId = '44444444-4444-4444-8444-444444444444';
const order: InboundOrder = { id: '55555555-5555-4555-8555-555555555555', orderNo: 'RK2026092400001', documentDate: '2026-09-24', inboundType: 'FINISHED_GOODS', status: 'DRAFT', legalEntityId: entityId, legalEntityName: '部件法人', warehouseId, warehouseName: '成品仓', factoryCode: null, reasonCode: 'FINISHED_GOODS', currencyCode: 'CNY', remark: null, postedAt: null, reversedAt: null, version: 2, createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z', lines: [{ id: '66666666-6666-4666-8666-666666666666', lineNo: 10, itemCode: 'P001', itemName: '控制板', batchNo: null, originalQty: null, actualQty: '1.0000', baseUnit: '件', amount: '10.00', remark: null }] };
function setup({ status = 'DRAFT', actions = ['view', 'update', 'post'], update = vi.fn(async (_system, _id, input) => ({ ...order, ...input, version: 3, legalEntityName: '', warehouseName: '', lines: input.lines.map((line: object) => ({ ...order.lines[0], ...line })) })) } = {} as { status?: InboundOrder['status']; actions?: string[]; update?: ReturnType<typeof vi.fn> }) {
  const gateway = { inboundOrder: vi.fn(async () => ({ ...order, status })), updateInboundOrder: update, legalEntities: vi.fn(async () => ({ items: [{ id: entityId, entityName: '部件法人' }] })), warehouses: vi.fn(async () => ({ items: [{ id: warehouseId, legalEntityId: entityId, warehouseName: '成品仓' }] })), items: vi.fn(async () => ({ items: [{ id: 'p1', itemCode: 'P001', itemName: '控制板', baseUnit: '件' }, { id: 'p2', itemCode: 'P002', itemName: '电源', baseUnit: '件' }] })) } as unknown as EnterpriseGateway;
  const registerGuard = vi.fn(); render(<InboundOrderPage orderId={order.id} systemCode="demo-portal" allowedActions={actions} gateway={gateway} registerGuard={registerGuard} />); return { gateway, update, registerGuard };
}
const openEdit = async () => { fireEvent.click(await screen.findByRole('button', { name: '编辑' })); await screen.findByRole('button', { name: '保存' }); };
describe('入库单单页查看和编辑', () => {
  it('默认只读主表在上明细在下，无Tab/新增/操作列，返回复用客户箭头', async () => {
    setup(); await screen.findByRole('heading', { name: order.orderNo });
    expect(screen.queryByRole('tablist')).toBeNull(); expect(screen.getByLabelText('制单日期')).toBeDisabled(); expect(screen.getByLabelText('入库单号')).toHaveAttribute('readonly');
    expect(screen.getByRole('table', { name: '入库明细' })).toBeInTheDocument(); expect(screen.queryByRole('columnheader', { name: '操作' })).toBeNull(); expect(screen.queryByRole('button', { name: '添加行' })).toBeNull();
    expect(screen.getByRole('button', { name: '返回入库单列表' })).toHaveClass('detail-back');
  });
  it('编辑后解锁字段/明细、支持增删；保存带版本并恢复查看', async () => {
    const { update } = setup(); await openEdit();
    expect(screen.getByLabelText('制单日期')).toBeEnabled(); expect(screen.getByLabelText('币别')).toHaveAttribute('readonly'); expect(screen.queryByRole('button', { name: '审核过账' })).toBeNull();
    fireEvent.change(screen.getByLabelText('备注', { exact: true }), { target: { value: '已核对' } });
    fireEvent.change(screen.getByLabelText('第1行实际数量'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: '添加行' })); expect(screen.getByLabelText('第2行实际数量')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '删除第2行' })); fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await screen.findByText('入库单已保存'); expect(update).toHaveBeenCalledWith('demo-portal', order.id, expect.objectContaining({ version: 2, remark: '已核对', lines: [expect.objectContaining({ actualQty: '3' })] }));
    expect(screen.queryByRole('columnheader', { name: '操作' })).toBeNull(); expect(screen.getByLabelText('备注', { exact: true })).toBeDisabled(); expect(screen.getByRole('option', { name: '部件法人' })).toBeInTheDocument();
  });
  it('保存冲突保留输入和编辑状态，空明细不提交', async () => {
    const update = vi.fn().mockRejectedValue(new Error('入库单状态或版本已变化')); setup({ update }); await openEdit();
    fireEvent.change(screen.getByLabelText('备注', { exact: true }), { target: { value: '不能丢失' } }); fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('入库单状态或版本已变化'); expect(screen.getByLabelText('备注', { exact: true })).toHaveValue('不能丢失'); expect(screen.getByRole('button', { name: '添加行' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '删除第1行' })); fireEvent.click(screen.getByRole('button', { name: '保存' })); expect(screen.getByRole('alert')).toHaveTextContent('至少添加一行'); expect(update).toHaveBeenCalledTimes(1);
  });
  it.each([{ status: 'POSTED' as const }, { status: 'REVERSED' as const }, { status: 'VOIDED' as const }, { actions: ['view'] }])('状态或权限不允许时不出现编辑入口 %o', async (options) => {
    setup(options); await screen.findByRole('heading', { name: order.orderNo }); expect(screen.queryByRole('button', { name: '编辑' })).toBeNull(); expect(screen.queryByRole('columnheader', { name: '操作' })).toBeNull();
  });
  it('未保存离开保护和取消编辑保留或恢复数据', async () => {
    const { registerGuard } = setup(); await openEdit(); fireEvent.change(screen.getByLabelText('备注', { exact: true }), { target: { value: '草稿变更' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(registerGuard.mock.calls.at(-1)![0]()).toBe(false); expect(screen.getByLabelText('备注', { exact: true })).toHaveValue('草稿变更');
    fireEvent.click(screen.getByRole('button', { name: '取消编辑' })); expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: '取消编辑' })); await waitFor(() => expect(screen.queryByRole('button', { name: '保存' })).toBeNull()); expect(screen.getByLabelText('备注', { exact: true })).toHaveValue(''); confirm.mockRestore();
  });
});
