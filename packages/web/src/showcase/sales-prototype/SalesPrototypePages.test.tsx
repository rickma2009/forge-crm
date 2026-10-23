import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SalesPrototypePage } from './SalesPrototypePages';
import { availableBatch, fulfillment, readSales, remainingQuantity, saveSales, validateOutbound } from './model';

beforeEach(() => sessionStorage.removeItem('forge-crm:sales-prototype:v1'));
const actions = ['view', 'create'];

describe('销售管理原型', () => {
  it('新增按钮打开工作区路由，不再弹出对话框', () => {
    const onNavigate = vi.fn();
    render(<SalesPrototypePage path="/showcase/sales-orders" onNavigate={onNavigate} allowedActions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: '新增销售订单' }));
    expect(onNavigate).toHaveBeenCalledWith('/showcase/sales-orders/new');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('销售订单列表按筛选结果分页，查询后回到第一页', async () => {
    const state = readSales();
    saveSales({ ...state, orders: [...state.orders, ...Array.from({ length: 21 }, (_, index) => ({ ...state.orders[1], id: `extra-order-${index}`, no: `SO202610${String(index + 3).padStart(4, '0')}` }))] });
    render(<SalesPrototypePage path="/showcase/sales-orders" onNavigate={vi.fn()} allowedActions={actions} />);
    expect(await screen.findByRole('grid', { name: '销售订单列表' })).toBeInTheDocument();
    expect(screen.getByText('共 23 条 · 第 1 / 2 页')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.getByText('共 23 条 · 第 2 / 2 页')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('销售订单搜索'), { target: { value: 'SO2026100001' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    expect(screen.getByText('共 1 条 · 第 1 / 1 页')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();
  });

  it('销售出货列表有公共分页栏，可调整每页条数', async () => {
    const state = readSales();
    saveSales({ ...state, outbounds: Array.from({ length: 23 }, (_, index) => ({ id: `outbound-${index}`, no: `DO202610${String(index + 1).padStart(4, '0')}`, orderId: state.orders[0].id, status: 'DRAFT' as const, date: '2026-10-02', warehouse: '成品仓 A', shipper: '周然', remark: '', lines: [] })) });
    render(<SalesPrototypePage path="/showcase/sales-outbounds" onNavigate={vi.fn()} allowedActions={actions} />);
    expect(await screen.findByRole('grid', { name: '销售出货列表' })).toBeInTheDocument();
    expect(screen.getByText('共 23 条 · 第 1 / 2 页')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: '每页条数' }), { target: { value: '10' } });
    fireEvent.blur(screen.getByRole('spinbutton', { name: '每页条数' }));
    expect(screen.getByText('共 23 条 · 第 1 / 3 页')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '末页' }));
    expect(screen.getByText('共 23 条 · 第 3 / 3 页')).toBeInTheDocument();
  });

  it('默认按客户新建，按客户名称查询、单选后进入编辑详情', async () => {
    const onNavigate = vi.fn();
    const { rerender } = render(<SalesPrototypePage path="/showcase/sales-orders/new" onNavigate={onNavigate} allowedActions={actions} />);
    expect(screen.getByRole('radiogroup', { name: '订单来源' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '按客户新建' })).toBeChecked();
    expect(screen.queryByRole('tablist', { name: '销售订单来源' })).toBeNull();
    expect(await screen.findByRole('grid', { name: '客户列表' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('客户名称'), { target: { value: '云杉' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    expect(screen.getByRole('row', { name: /云杉科技服务有限公司/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /星海智能制造有限公司/ })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '选择客户 云杉科技服务有限公司' }));
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    const created = readSales().orders.at(-1)!;
    expect(created).toMatchObject({ source: 'MANUAL', customer: '云杉科技服务有限公司', lines: [] });
    expect(onNavigate).toHaveBeenCalledWith(`/showcase/sales-orders/${created.id}/edit`);
    rerender(<SalesPrototypePage path={`/showcase/sales-orders/${created.id}/edit`} onNavigate={onNavigate} allowedActions={actions} />);
    expect(screen.getByRole('button', { name: '添加行' })).toBeInTheDocument();
    expect(screen.getByLabelText('客户名称')).toBeEnabled();
  });

  it('商机来源按名称查询并带入产品，切换来源清空旧选择', async () => {
    const onNavigate = vi.fn();
    render(<SalesPrototypePage path="/showcase/sales-orders/new" onNavigate={onNavigate} allowedActions={actions} />);
    fireEvent.click((await screen.findAllByRole('radio', { name: /选择客户/ }))[0]);
    fireEvent.click(screen.getByRole('radio', { name: '引入商机' }));
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('商机名称'), { target: { value: '云杉' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByRole('grid', { name: '商机列表' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '商机阶段' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '选择商机 O2026090002' }));
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    const created = readSales().orders.at(-1)!;
    expect(created).toMatchObject({ source: 'OPPORTUNITY', sourceNo: 'O2026090002', customer: '云杉科技服务有限公司' });
    expect(created.lines).toHaveLength(2);
  });

  it('报价单页按客户或报价说明查询，生成草稿并锁定来源客户', async () => {
    const onNavigate = vi.fn();
    const { rerender } = render(<SalesPrototypePage path="/showcase/sales-orders/new" onNavigate={onNavigate} allowedActions={actions} />);
    fireEvent.click(screen.getByRole('radio', { name: '引入报价单' }));
    expect(screen.queryByText('Q2026090008')).toBeNull();
    fireEvent.change(screen.getByLabelText('客户或报价说明'), { target: { value: '海岳' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByRole('grid', { name: '报价单列表' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '选择报价单 Q2026090009' }));
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    const created = readSales().orders.at(-1)!;
    expect(created).toMatchObject({ source: 'QUOTATION', sourceNo: 'Q2026090009', customer: '海岳电子有限公司', status: 'DRAFT' });
    expect(created.lines).toHaveLength(2);
    expect(onNavigate).toHaveBeenCalledWith(`/showcase/sales-orders/${created.id}/edit`);
    rerender(<SalesPrototypePage path={`/showcase/sales-orders/${created.id}/edit`} onNavigate={onNavigate} allowedActions={actions} />);
    expect(screen.getByLabelText('客户名称')).toBeDisabled();
    expect(await screen.findByLabelText('第1行数量')).toBeEnabled();
  });

  it('从已审核订单分批出库，审核后更新进度，冲销后恢复数量和库存', () => {
    const state = readSales(); const order = state.orders[0]; const line = order.lines[0];
    expect(fulfillment(state, order)).toBe('未出货');
    const batch = 'CB-2609-A';
    const outbound = { id: 'test-outbound', no: 'DO2026100001', orderId: order.id, status: 'APPROVED' as const, date: '2026-10-02', warehouse: '成品仓 A', shipper: '周然', remark: '', lines: [{ id: 'ship-line', orderLineId: line.id, productCode: line.productCode, productName: line.productName, batch, quantity: 15, unitCost: 186 }] };
    saveSales({ ...state, outbounds: [outbound] });
    expect(remainingQuantity(readSales(), order, line)).toBe(line.quantity - 15);
    expect(fulfillment(readSales(), order)).toBe('部分出货');
    expect(availableBatch(readSales(), line.productCode, batch)).toBe(105);
    saveSales({ ...state, outbounds: [{ ...outbound, status: 'REVERSED' }] });
    expect(remainingQuantity(readSales(), order, line)).toBe(line.quantity);
    expect(availableBatch(readSales(), line.productCode, batch)).toBe(120);
  });

  it('销售退回仅展示待开发占位，不创建真实业务记录', () => {
    render(<SalesPrototypePage path="/showcase/sales-returns" onNavigate={vi.fn()} allowedActions={['view']} />);
    expect(screen.getByRole('heading', { name: '销售退回' })).toBeInTheDocument();
    expect(screen.getByText(/将在下一阶段开发/)).toBeInTheDocument();
  });

  it('拆批时按仓库和合计数量校验，不允许重复行透支库存或订单', () => {
    const state = readSales(); const order = state.orders[0]; const line = order.lines[0];
    const document = { id: 'split', no: 'DO2026100001', orderId: order.id, status: 'DRAFT' as const, date: '2026-10-02', warehouse: '成品仓 A', shipper: '周然', remark: '', lines: [
      { id: 'one', orderLineId: line.id, productCode: line.productCode, productName: line.productName, batch: 'CB-2609-A', quantity: 50, unitCost: 186 },
      { id: 'two', orderLineId: line.id, productCode: line.productCode, productName: line.productName, batch: 'CB-2609-A', quantity: 40, unitCost: 186 },
    ] };
    expect(validateOutbound(state, order, document)).toContain('订单剩余数量');
    document.lines[1].quantity = 20;
    expect(validateOutbound(state, order, document)).toBe('');
    document.lines[1].batch = 'CB-2609-B';
    expect(validateOutbound(state, order, document)).toContain('出货仓库');
  });
});
