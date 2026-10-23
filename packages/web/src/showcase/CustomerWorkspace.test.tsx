import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Customer } from '@forge-crm/contracts';
import { ShowcaseApp } from './ShowcaseApp';
import { customerRelatedApi } from './customer-related-api';
import { GatewayError, httpNavigationGateway, type EnterpriseGateway } from './gateway';

const customer: Customer = { id: '00000000-0000-4000-8000-000000000002', customerCode: 'C2026090001', customerName: '客户甲有限公司', shortName: '客户甲', categoryValue: 'direct', address: '', statusValue: 'active', industryValue: null, levelValue: null, salesOwnerKey: null, salesOwnerName: null, remark: null, version: 1, createdAt: '2026-09-04T00:00:00.000Z', updatedAt: '2026-09-04T00:00:00.000Z' };
function workspaceGateway(): EnterpriseGateway {
  const view = { viewKey: 'system:default', viewName: '默认视图', scope: 'SYSTEM', config: { columns: [{ key: 'customerCode', visible: true }], filters: {}, pageSize: 20, sort: { field: 'updatedAt', direction: 'desc' } } };
  return {
    session: async () => ({ account: 'admin', displayName: '管理员' }),
    navigation: async (systemCode: string) => ({ systemCode, permissionVersion: '1', items: [{ menuCode: 'customer-directory', label: '客户列表', nodeType: 'PAGE', routePath: '/showcase/customers', iconKey: 'users', children: [], allowedActions: ['view', 'create', 'update'].map((actionCode) => ({ actionCode })) }] }),
    assertPage: async () => undefined,
    listViews: async () => ({ selectedViewKey: view.viewKey, views: [view] }),
    customers: async () => ({ items: [customer], pagination: { total: 1 } }),
    dictionaries: async () => [], salesOptions: async () => [],
    customerDetail: async () => ({ customer, contacts: [], addresses: [] }),
    updateCustomer: async () => { throw new GatewayError(409, 'CONFLICT', '记录已被其他用户修改'); },
  } as unknown as EnterpriseGateway;
}

describe('customer container workspace', () => {
  it('keeps different customers in separate container tabs', async () => {
    window.location.hash = '#/showcase/customers'; const user = userEvent.setup();
    const api = workspaceGateway();
    const other = { ...customer, id: '00000000-0000-4000-8000-000000000003', customerCode: 'C2026090002', shortName: '客户乙', customerName: '客户乙有限公司' };
    api.customers = async () => ({ items: [customer, other], pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 } });
    api.customerDetail = async (_system, id) => ({ customer: id === other.id ? other : customer, contacts: [], addresses: [] });
    render(<ShowcaseApp gateway={api} />);
    await screen.findByRole('grid', { name: '客户列表' });
    await user.click(await screen.findByRole('button', { name: 'C2026090001' }));
    await screen.findByRole('heading', { name: '客户甲' });
    const tabs = screen.getByRole('navigation', { name: '已打开页面' });
    await user.click(within(tabs).getByRole('button', { name: '客户管理' }));
    await user.click(await screen.findByRole('button', { name: 'C2026090002' }));
    expect(await screen.findByRole('heading', { name: '客户乙' })).toBeVisible();
    await user.click(within(tabs).getByRole('button', { name: '客户 · 客户甲' }));
    expect(await screen.findByRole('heading', { name: '客户甲' })).toBeVisible();
    expect(within(screen.getByRole('tabpanel')).getByLabelText('客户名称')).toHaveValue('客户甲有限公司');
    expect(within(tabs).getByRole('button', { name: '客户 · 客户乙' })).toBeInTheDocument();
  });
  it('opens view/edit in one customer tab and retains list query state', async () => {
    window.location.hash = '#/showcase/customers'; const user = userEvent.setup();
    render(<ShowcaseApp gateway={workspaceGateway()} />);
    await user.type(await screen.findByLabelText('客户搜索'), '甲');
    await user.click(await screen.findByRole('button', { name: 'C2026090001' }));
    expect(await screen.findByLabelText('客户名称')).toBeDisabled();
    const tabs = screen.getByRole('navigation', { name: '已打开页面' });
    expect(await within(tabs).findByRole('button', { name: '客户 · 客户甲' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(tabs).getByRole('button', { name: '客户管理' }));
    expect(await screen.findByLabelText('客户搜索')).toHaveValue('甲');
    await user.click(screen.getByRole('button', { name: '修改客户 C2026090001' }));
    await waitFor(() => expect(screen.getByLabelText('客户名称')).toBeEnabled());
    expect(within(tabs).getAllByRole('button', { name: '客户 · 客户甲' })).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('protects dirty edits from close and refresh, and keeps a conflict draft', async () => {
    window.location.hash = '#/showcase/customers'; const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      render(<ShowcaseApp gateway={workspaceGateway()} />);
      await user.click(await screen.findByRole('button', { name: '修改客户 C2026090001' }));
      const input = await screen.findByLabelText('客户简称');
      await user.clear(input); await user.type(input, '未保存简称');
      await user.click(screen.getByRole('button', { name: '关闭客户 · 客户甲' }));
      expect(input).toHaveValue('未保存简称');
      fireEvent.contextMenu(screen.getByRole('button', { name: '客户 · 客户甲' }));
      await user.click(screen.getByRole('menuitem', { name: '刷新当前' }));
      expect(input).toHaveValue('未保存简称');
      await user.click(screen.getByRole('button', { name: '保存客户' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('记录已被其他用户修改');
      expect(input).toHaveValue('未保存简称');
      confirm.mockReturnValue(true);
      await user.click(screen.getByRole('button', { name: '关闭客户 · 客户甲' }));
      expect(await screen.findByLabelText('客户搜索')).toBeVisible();
      expect(screen.queryByRole('button', { name: '客户 · 客户甲' })).not.toBeInTheDocument();
    } finally { confirm.mockRestore(); }
  });

  it('parses the actual customer update envelope and preserves the version payload', async () => {
    document.cookie = 'ipl_csrf=test-token';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ customer: { ...customer, version: 2 }, contacts: [], addresses: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const result = await httpNavigationGateway.updateCustomer('demo-portal', customer.id, { customerName: customer.customerName, shortName: customer.shortName, categoryValue: 'direct', statusValue: 'active', version: 1 });
      expect(result.version).toBe(2);
      expect(fetchMock).toHaveBeenCalledWith(`/api/systems/demo-portal/customers/${customer.id}`, expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('"version":1') }));
    } finally { vi.unstubAllGlobals(); document.cookie = 'ipl_csrf=; Max-Age=0'; }
  });
  it('guards related document navigation once and preserves cancelled customer edits', async () => {
    window.location.hash = '#/showcase/customers'; const user = userEvent.setup();
    const api = workspaceGateway(), baseNavigation = api.navigation;
    api.navigation = async code => { const value = await baseNavigation(code); return { ...value, items: [...value.items, { menuCode: 'sales-order-directory', label: '销售订单', nodeType: 'PAGE', routePath: '/showcase/sales-orders', iconKey: 'table', children: [], allowedActions: [{ actionCode: 'view', actionName: '查看', actionType: 'READ' }] }] } as Awaited<ReturnType<typeof baseNavigation>>; };
    const rows = vi.spyOn(customerRelatedApi, 'list').mockResolvedValue({ items: [{ id: customer.id, code: 'SO-GUARD', name: '', status: 'DRAFT', amount: '10.00', currency: 'CNY', date: null, owner: null, stage: null }], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      render(<ShowcaseApp gateway={api} />);
      await user.click(await screen.findByRole('button', { name: '修改客户 C2026090001' }));
      const input = await screen.findByLabelText('客户简称'); await user.clear(input); await user.type(input, '保留草稿');
      await user.click(screen.getByRole('tab', { name: '销售订单' }));
      await user.click(await screen.findByRole('link', { name: 'SO-GUARD' }));
      expect(confirm).toHaveBeenCalledTimes(1); expect(window.location.hash).toBe(`#/showcase/customers/${customer.id}`);
      await user.click(screen.getByRole('tab', { name: '客户基本信息' })); expect(screen.getByLabelText('客户简称')).toHaveValue('保留草稿');
    } finally { rows.mockRestore(); confirm.mockRestore(); }
  });

});
