import { quotationApi } from './quotation-api';
import { businessListDefaultConfig, type BusinessListObject } from '@forge-crm/contracts';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EnterpriseGateway } from './gateway';
import { OpportunityDetailPage, OpportunityDirectoryPage, ProductDirectoryPage } from './OpportunityPages';

const opportunity = {
  id: '11111111-1111-4111-8111-111111111111', version: 1, createdAt: '2026-09-23T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z',
  opportunityCode: 'O2026090001', opportunityName: 'TV 项目', customerId: '22222222-2222-4222-8222-222222222222', customerName: '测试客户', contactId: null, contactName: null,
  ownerUserId: '33333333-3333-4333-8333-333333333333', ownerName: '管理员', source: null, templateId: '44444444-4444-4444-8444-444444444444', templateName: '公共',
  stageId: '55555555-5555-4555-8555-555555555555', stageName: '初始线索', stageProbability: 10, confidence: 30, confirmedDate: null, expectedSignDate: null,
  customerBudget: null, expectedAmount: 1000, partner: null, status: 'ACTIVE' as const, remark: null,
};

const product = {
  id: '66666666-6666-4666-8666-666666666666', version: 1,
  createdAt: '2026-09-23T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z',
  productCode: 'P001', productName: '控制板', model: 'M1', productLine: null,
  unit: 'PCS', status: 'ACTIVE' as const, remark: null,
};

const opportunityProduct = {
  id: '77777777-7777-4777-8777-777777777777', version: 1,
  createdAt: '2026-09-23T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z',
  opportunityId: opportunity.id, productId: product.id,
  productCode: product.productCode, productName: product.productName, model: product.model,
  quantity: 2, unitPrice: 100, expectedAmount: 200, requirement: '首批样机', sortNo: 0,
};

function gateway(): EnterpriseGateway {
  return {
    listViews: vi.fn(async (_system, pageCode: BusinessListObject) => ({ pageCode, actionCode: 'view', selectedViewKey: 'system:default', views: [{ viewKey: 'system:default', scope: 'SYSTEM', viewName: '默认视图', allowPersonalOverride: true, config: businessListDefaultConfig(pageCode) }] })),
    navigation: vi.fn().mockResolvedValue({ systemCode: 'demo-portal', items: [], permissionVersion: 'a'.repeat(64) }),
    products: vi.fn().mockResolvedValue({ items: [product], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
    competitors: vi.fn().mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
    opportunities: vi.fn().mockResolvedValue({ items: [opportunity], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
    opportunityDetail: vi.fn().mockResolvedValue({ opportunity: { ...opportunity, products: [opportunityProduct] }, followUps: [], analyses: [] }),
    updateOpportunity: vi.fn().mockResolvedValue({ ...opportunity, products: [opportunityProduct] }),
    opportunityTemplates: vi.fn().mockResolvedValue([]), opportunityUsers: vi.fn().mockResolvedValue([]),
    customers: vi.fn().mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } }),
  } as unknown as EnterpriseGateway;
}

describe('opportunity pages', () => {
  it('renders product directory actions', async () => {
    render(<ProductDirectoryPage systemCode="demo-portal" canManage gateway={gateway()} />);
    expect(await screen.findByRole('link', { name: 'P001' })).toHaveAttribute('href', '#/showcase/products/' + product.id);
    expect(screen.getByRole('button', { name: /新增产品/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看产品 P001' })).not.toBeInTheDocument();
    const edit = screen.getByRole('button', { name: '修改产品 P001' });
    expect(edit).toHaveTextContent(''); expect(edit.querySelector('svg')).toBeInTheDocument();
  });

  it('renders opportunity list with customer-style search actions', async () => {
    render(<OpportunityDirectoryPage systemCode="demo-portal" allowedActions={['create']} gateway={gateway()} onOpen={() => undefined} />);
    expect(await screen.findByText('TV 项目')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查询' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新增商机/ })).toBeInTheDocument();
  });

  it('renders the three required detail tabs', async () => {
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={[]} gateway={gateway()} />);
    expect(await screen.findByText('商机编码：O2026090001')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '商机信息' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '跟进记录' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '商机分析记录' })).toBeInTheDocument();
  });

  it('offers direct product add, edit and delete actions to an authorized user', async () => {
    const api = gateway();
    const user = userEvent.setup();
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={['update']} gateway={api} />);
    expect(await screen.findByRole('button', { name: '新增商品' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改商品 P001' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除商品 P001' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新增商品' }));
    expect(screen.getByRole('heading', { name: '新增商品' })).toBeInTheDocument();
    await user.clear(screen.getByRole('spinbutton', { name: '数量' }));
    await user.type(screen.getByRole('spinbutton', { name: '数量' }), '3');
    await user.clear(screen.getByRole('spinbutton', { name: '单价' }));
    await user.type(screen.getByRole('spinbutton', { name: '单价' }), '88');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(api.updateOpportunity).toHaveBeenCalledWith('demo-portal', opportunity.id, expect.objectContaining({
      version: 1,
      products: expect.arrayContaining([expect.objectContaining({ productId: product.id, quantity: 3, unitPrice: 88 })]),
    })));
  });

  it('does not expose product mutations without update permission', async () => {
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={[]} gateway={gateway()} />);
    await screen.findByText('控制板');
    expect(screen.queryByRole('button', { name: '新增商品' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '修改商品 P001' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除商品 P001' })).not.toBeInTheDocument();
  });
});

describe('opportunity quotation entry', () => {
  const withCreate = (g: EnterpriseGateway) => { vi.mocked(g.navigation).mockResolvedValue({ items: [{ menuCode: 'quotation-directory', allowedActions: [{ actionCode: 'create' }], children: [] }] } as never); return g; };
  it('offers a locked quotation dialog independently of opportunity update permission', async () => {
    const g = withCreate(gateway());
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={[]} gateway={g} />);
    fireEvent.click(await screen.findByRole('button', { name: '新增报价单' }));
    const dialog = within(screen.getByRole('dialog', { name: '新增报价单' }));
    await waitFor(() => expect(dialog.getByLabelText('关联商机')).toHaveValue('O2026090001 · TV 项目'));
    expect(dialog.getByRole('radio', { name: '关联商机报价' })).toBeDisabled();
    expect(dialog.getByLabelText('关联商机')).toHaveAttribute('readonly');
    expect(dialog.getByLabelText('客户名称')).toHaveValue('测试客户');
    expect(g.opportunities).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('hides the entry without quote create permission', async () => {
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={['update']} gateway={gateway()} />);
    await screen.findByText('控制板');
    expect(screen.queryByRole('button', { name: '新增报价单' })).not.toBeInTheDocument();
  });
  it('disables creation for inactive opportunities and explains why', async () => {
    const g = withCreate(gateway());
    vi.mocked(g.opportunityDetail).mockResolvedValue({ opportunity: { ...opportunity, status: 'DISABLED', products: [] }, followUps: [], analyses: [] });
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={[]} gateway={g} />);
    const button = await screen.findByRole('button', { name: '新增报价单' });
    expect(button).toBeDisabled(); expect(button).toHaveAttribute('title', '商机已停用，不能新增报价单');
  });
});


afterEach(() => vi.restoreAllMocks());
describe('latest quotation shortcut', () => {
  const viewGateway = () => {
    const g = gateway();
    vi.mocked(g.navigation).mockResolvedValue({ items: [{ menuCode: 'quotation-directory', allowedActions: [{ actionCode: 'view' }, { actionCode: 'create' }], children: [] }] } as never);
    return g;
  };
  it('removes the quote tab, keeps create and opens the latest result refreshed at click time', async () => {
    const list = vi.spyOn(quotationApi, 'list').mockResolvedValueOnce({ items: [{ id: 'q1' }], pagination: { total: 1, totalPages: 1 } } as never).mockResolvedValueOnce({ items: [{ id: 'q2' }], pagination: { total: 2, totalPages: 2 } } as never);
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={[]} gateway={viewGateway()} />);
    const button = await screen.findByRole('button', { name: '报价单详情' });
    expect(screen.queryByRole('tab', { name: '报价单' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增报价单' })).toBeEnabled();
    expect(list.mock.calls[0][1].get('opportunityId')).toBe(opportunity.id);
    expect(list.mock.calls[0][1].get('sortBy')).toBe('createdAt');
    expect(list.mock.calls[0][1].get('pageSize')).toBe('1');
    fireEvent.click(button);
    await waitFor(() => expect(window.location.hash).toBe('#/showcase/quotations/q2'));
  });
  it('hides the shortcut when no quote exists without removing create', async () => {
    const list = vi.spyOn(quotationApi, 'list').mockResolvedValue({ items: [], pagination: { total: 0, totalPages: 0 } });
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={[]} gateway={viewGateway()} />);
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '报价单详情' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增报价单' })).toBeEnabled();
  });
  it('does not request quotations without view permission', async () => {
    const list = vi.spyOn(quotationApi, 'list');
    render(<OpportunityDetailPage systemCode="demo-portal" opportunityId={opportunity.id} allowedActions={[]} gateway={gateway()} />);
    await screen.findByText('控制板');
    expect(list).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '报价单详情' })).not.toBeInTheDocument();
  });
});
