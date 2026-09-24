import { businessListDefaultConfig } from '@interaction-pattern-lab/contracts';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PricingEditor, QuotationDetailPage, QuotationListPage } from './QuotationPages';
import { quotationApi } from './quotation-api';
import type { QuotationRecord } from '@interaction-pattern-lab/contracts';

afterEach(() => vi.restoreAllMocks());
const fixture = { id: '00000000-0000-4000-8000-000000000001', quoteCode: 'Q20260923001', title: '测试报价', customerId: '00000000-0000-4000-8000-000000000002', customerName: '测试客户', contactId: null, contactName: null, opportunityId: null, quoteDate: '2026-09-23', validUntil: '2099-01-01', status: 'DRAFT', total: '5.00', terms: '', remark: '', version: 1, sourceQuoteId: null, lines: [{ id: '00000000-0000-4000-8000-000000000003', productId: '00000000-0000-4000-8000-000000000004', priceId: '00000000-0000-4000-8000-000000000005', productName: '测试产品', model: null, unit: '件', productCode: 'P1', quantity: '1', unitPrice: '5.00', suggestedPrice: '10.00', discount: '0', priceSource: 'STANDARD', lowerQty: null, upperQty: null, delivery: '', remark: '', amount: '5.00' }], ownerUserId: 'owner' } as QuotationRecord;
const gateway = () => ({ listViews: vi.fn(async () => ({ pageCode: 'quotation-directory', actionCode: 'view', selectedViewKey: 'system:default', views: [{ viewKey: 'system:default', scope: 'SYSTEM', viewName: '默认视图', allowPersonalOverride: true, config: businessListDefaultConfig('quotation-directory') }] })), customers: vi.fn().mockResolvedValue({ items: [] }), products: vi.fn().mockResolvedValue({ items: [] }), customerDetail: vi.fn().mockResolvedValue({ contacts: [] }) }) as never;

describe('quotation page behavior', () => {
  it('retains manual price when quantity changes and keeps a leave guard', async () => {
    vi.spyOn(quotationApi, 'detail').mockResolvedValue(fixture);
    vi.spyOn(quotationApi, 'prices').mockResolvedValue({ product: {} as never, current: null, history: [{ id: fixture.lines[0].priceId, productId: fixture.lines[0].productId, version: 1, standardPrice: '10.00', tiers: [], createdAt: '' }] });
    const register = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<QuotationDetailPage systemCode="demo-portal" id={fixture.id} gateway={gateway()} allowedActions={['edit']} registerGuard={register} />);
    await waitFor(() => expect(screen.getByLabelText('报价标题')).toHaveValue('测试报价'));
    fireEvent.click(screen.getByRole('button', { name: '编辑第1行' }));
    const dialog = screen.getByRole('dialog', { name: '编辑报价明细' });
    fireEvent.change(within(dialog).getByLabelText('数量'), { target: { value: '2' } });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '确认' })).toBeEnabled());
    expect(within(dialog).getByLabelText('成交单价')).toHaveValue('5.00');
    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('¥ 10.00')).toBeInTheDocument();
    expect(register.mock.calls.at(-1)?.[0]()).toBe(false);
  });
  it('reports PDF failure in the originating page and preserves the quotation', async () => {
    vi.spyOn(quotationApi, 'detail').mockResolvedValue({ ...fixture, status: 'ACCEPTED' });
    vi.spyOn(quotationApi, 'pdf').mockRejectedValue(new Error('PDF 生成失败，请重试'));
    render(<QuotationDetailPage systemCode="demo-portal" id={fixture.id} gateway={gateway()} allowedActions={['view', 'export']} />);
    fireEvent.click(await screen.findByRole('button', { name: '导出 PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('PDF 生成失败');
    expect(screen.getByLabelText('报价标题')).toHaveValue('测试报价');
  });
  it('keeps backend save errors and unsaved fields visible', async () => {
    vi.spyOn(quotationApi, 'detail').mockResolvedValue(fixture);
    vi.spyOn(quotationApi, 'save').mockRejectedValue(new Error('并发冲突，请重新加载'));
    render(<QuotationDetailPage systemCode="demo-portal" id={fixture.id} gateway={gateway()} allowedActions={['edit']} />);
    await waitFor(() => expect(screen.getByLabelText('报价标题')).toHaveValue('测试报价'));
    fireEvent.change(screen.getByLabelText('报价标题'), { target: { value: '我的未保存修改' } });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('并发冲突');
    expect(screen.getByLabelText('报价标题')).toHaveValue('我的未保存修改');
  });
  it('queries only keyword and status and reset preserves association scope', async () => {
    const list = vi.spyOn(quotationApi, 'list').mockResolvedValue({ items: [], pagination: { total: 0, totalPages: 0 } });
    render(<QuotationListPage systemCode="demo-portal" allowedActions={['view']} customerId="customer-scope" gateway={gateway()} />);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText('负责人')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('有效期至')).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('报价单搜索'), { target: { value: 'Q123' } });
    fireEvent.change(screen.getByLabelText('状态'), { target: { value: 'DRAFT' } });
    expect(list).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(list.mock.calls.at(-1)?.[1].get('keyword')).toBe('Q123'));
    expect(list.mock.calls.at(-1)?.[1].get('status')).toBe('DRAFT');
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    await waitFor(() => expect(list.mock.calls.at(-1)?.[1].has('keyword')).toBe(false));
    expect(list.mock.calls.at(-1)?.[1].has('status')).toBe(false);
    expect(list.mock.calls.at(-1)?.[1].get('customerId')).toBe('customer-scope');
  });
  it('discards cancelled row edits and keeps invalid input errors inside the dialog', async () => {
    vi.spyOn(quotationApi, 'detail').mockResolvedValue(fixture);
    render(<QuotationDetailPage systemCode="demo-portal" id={fixture.id} gateway={gateway()} allowedActions={['edit']} />);
    fireEvent.click(await screen.findByRole('button', { name: '编辑第1行' }));
    let dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('折扣 %'), { target: { value: '101' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));
    expect(within(dialog).getByRole('alert')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('折扣 %')).toHaveValue('101');
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.getByText('¥ 5.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑第1行' }));
    dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('折扣 %')).toHaveValue('0');
  });
  it('keeps quantity editable while pricing loads and prevents confirming stale pricing after failure', async () => {
    vi.spyOn(quotationApi, 'detail').mockResolvedValue(fixture);
    let rejectPrice!: (e: Error) => void;
    vi.spyOn(quotationApi, 'prices').mockImplementation(() => new Promise((_resolve, reject) => { rejectPrice = reject; }));
    render(<QuotationDetailPage systemCode="demo-portal" id={fixture.id} gateway={gateway()} allowedActions={['edit']} />);
    fireEvent.click(await screen.findByRole('button', { name: '编辑第1行' }));
    const dialog = screen.getByRole('dialog');
    const qty = within(dialog).getByLabelText('数量');
    fireEvent.change(qty, { target: { value: '2' } });
    expect(qty).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: '确认' })).toBeDisabled();
    rejectPrice(new Error('原价格版本暂时不可用'));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('原价格版本暂时不可用');
    fireEvent.change(within(dialog).getByLabelText('成交单价'), { target: { value: '8' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('原价格版本暂时不可用');
    expect(within(dialog).getByLabelText('数量')).toHaveValue('2');
    expect(screen.getByText('¥ 5.00')).toBeInTheDocument();
  });
  it('adds a product through the dialog and commits quantity price discount together', async () => {
    vi.spyOn(quotationApi, 'detail').mockResolvedValue({ ...fixture, lines: [] });
    const current = { id: fixture.lines[0].priceId, productId: fixture.lines[0].productId, version: 1, standardPrice: '10.00', tiers: [], createdAt: '' };
    vi.spyOn(quotationApi, 'prices').mockResolvedValue({ product: {} as never, current, history: [current] });
    const g = { customers: vi.fn().mockResolvedValue({ items: [] }), products: vi.fn().mockResolvedValue({ items: [{ id: fixture.lines[0].productId, productName: '测试产品', productCode: 'P1', status: 'ACTIVE', unit: '件', productLine: null }] }), customerDetail: vi.fn().mockResolvedValue({ contacts: [] }) };
    render(<QuotationDetailPage systemCode="demo-portal" id={fixture.id} gateway={g as never} allowedActions={['edit']} />);
    await waitFor(() => expect(screen.getByLabelText('报价标题')).toHaveValue('测试报价'));
    fireEvent.click(screen.getByRole('button', { name: '＋ 添加行' }));
    const dialog = screen.getByRole('dialog', { name: '添加报价明细' });
    fireEvent.change(within(dialog).getByLabelText('选择报价产品'), { target: { value: fixture.lines[0].productId } });
    await waitFor(() => expect(within(dialog).getByLabelText('成交单价')).toHaveValue('10.00'));
    fireEvent.change(within(dialog).getByLabelText('成交单价'), { target: { value: '8.00' } });
    fireEvent.change(within(dialog).getByLabelText('数量'), { target: { value: '3' } });
    fireEvent.change(within(dialog).getByLabelText('折扣 %'), { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('¥ 21.60')).toBeInTheDocument();
    expect(screen.getByLabelText('报价合计')).toHaveValue('21.60');
    expect(screen.getByRole('button', { name: '编辑第1行' })).toBeInTheDocument();
  });
});

describe('sales pricing editor', () => {
  it('keeps a failed save inside the dialog and preserves entered price', async () => {
    vi.spyOn(quotationApi, 'prices').mockResolvedValue({ product: {} as never, current: null, history: [] });
    vi.spyOn(quotationApi, 'priceSave').mockRejectedValue(new Error('价格已被修改'));
    render(<PricingEditor systemCode="demo-portal" productId="p" canManage onClose={() => {}} />);
    const input = await screen.findByLabelText('标准含税价（CNY）');
    fireEvent.change(input, { target: { value: '12.50' } });
    fireEvent.click(screen.getByRole('button', { name: '保存定价' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('价格已被修改'));
    expect(input).toHaveValue('12.50');
    expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('alert'));
    vi.restoreAllMocks();
  });
});

describe('quotation creation and immutable summary', () => {
  it('shows the document number, immutable customer, opportunity link and discounted total', async () => {
    vi.spyOn(quotationApi, 'detail').mockResolvedValue({ ...fixture, createdAt: '2026-09-24T02:00:00.000Z', creatorName: '张三', ownerName: '李四', opportunityId: 'opp', opportunity: { id: 'opp', opportunityName: '设备采购', version: 1, expectedAmount: null, amountSource: '人工维护' } });
    render(<QuotationDetailPage systemCode="demo-portal" id={fixture.id} gateway={gateway()} allowedActions={['edit']} />);
    expect(await screen.findByRole('heading', { name: fixture.quoteCode })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '设备采购' })).toHaveAttribute('href', '#/showcase/opportunities/opp');
    expect(screen.getByText('客户名称：测试客户')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '客户' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('报价方式')).not.toBeInTheDocument();
    expect(screen.getByLabelText('报价合计')).toHaveValue('5.00');
    expect(screen.getByLabelText('报价人')).toHaveValue('李四');
  });
  it('retains opportunity and user names after a draft save response without display metadata', async () => {
    vi.spyOn(quotationApi, 'detail').mockResolvedValue({ ...fixture, ownerName: '张三', opportunityId: fixture.id, opportunity: { id: fixture.id, opportunityName: '采购商机', version: 1, expectedAmount: null, amountSource: '人工维护' } });
    vi.spyOn(quotationApi, 'save').mockResolvedValue({ ...fixture, opportunityId: fixture.id, version: 2 });
    render(<QuotationDetailPage systemCode="demo-portal" id={fixture.id} gateway={gateway()} allowedActions={['edit']} />);
    await screen.findByRole('link', { name: '采购商机' });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await screen.findByText('报价已保存');
    expect(screen.getByRole('link', { name: '采购商机' })).toBeInTheDocument();
    expect(screen.getByLabelText('报价人')).toHaveValue('张三');
  });
  it('defaults to opportunity selection, switches to searchable customers, and creates before navigating', async () => {
    const create = vi.spyOn(quotationApi, 'create').mockResolvedValue(fixture);
    const g = { ...gateway() as object, opportunities: vi.fn().mockResolvedValue({ items: [], pagination: { totalPages: 1 } }), customers: vi.fn().mockResolvedValue({ items: [{ id: fixture.customerId, customerCode: 'C1', customerName: '测试客户' }], pagination: { totalPages: 1 } }) };
    window.location.hash = '#/showcase/quotations/new';
    render(<QuotationDetailPage systemCode="demo-portal" id="new" gateway={g as never} allowedActions={['create']} />);
    expect(screen.getByRole('dialog', { name: '新增报价单' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '关联商机报价' })).toBeChecked();
    await waitFor(() => expect(g.opportunities).toHaveBeenCalled());
    expect(g.opportunities.mock.calls[0][1].get('status')).toBe('ACTIVE');
    fireEvent.click(screen.getByRole('radio', { name: '独立报价' }));
    fireEvent.change(screen.getByRole('combobox', { name: '选择客户' }), { target: { value: '测试' } });
    await waitFor(() => expect(g.customers).toHaveBeenCalled());
    expect(g.customers.mock.calls.at(-1)![1].get('keyword')).toBe('测试');
    await waitFor(() => expect(document.querySelector('option[value="C1 · 测试客户"]')).not.toBeNull());
    fireEvent.change(screen.getByRole('combobox', { name: '选择客户' }), { target: { value: 'C1 · 测试客户' } });
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][1]).toEqual({ mode: 'INDEPENDENT', customerId: fixture.customerId, requestKey: expect.any(String) });
    await waitFor(() => expect(window.location.hash).toBe(`#/showcase/quotations/${fixture.id}`));
  });
  it('keeps failed creation in the modal and reuses its request key on retry', async () => {
    const create = vi.spyOn(quotationApi, 'create').mockRejectedValue(new Error('产品没有有效定价'));
    const g = { ...gateway() as object, opportunities: vi.fn().mockResolvedValue({ items: [{ id: fixture.id, opportunityName: '设备采购', opportunityCode: 'O1', version: 1, status: 'ACTIVE' }], pagination: { totalPages: 1 } }) };
    window.location.hash = '#/showcase/quotations/new';
    render(<QuotationDetailPage systemCode="demo-portal" id="new" gateway={g as never} allowedActions={['create']} />);
    await waitFor(() => expect(document.querySelector('option[value="O1 · 设备采购"]')).not.toBeNull());
    fireEvent.change(screen.getByRole('combobox', { name: '选择商机' }), { target: { value: 'O1 · 设备采购' } });
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    const alert = await screen.findByRole('alert');
    expect(screen.getByRole('dialog')).toContainElement(alert);
    expect(screen.getByRole('combobox', { name: '选择商机' })).toHaveValue('O1 · 设备采购');
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][1]).toEqual(create.mock.calls[0][1]);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(window.location.hash).toBe('#/showcase/quotations');
  });
});
