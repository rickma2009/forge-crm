import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { BomDetail, NavigationNode, NavigationResponse, SessionUser, StyleSceneDetail, StyleSceneList, StyleSceneTaxonomy } from '@forge-crm/contracts';
import { ShowcaseApp } from './ShowcaseApp';
import { bomApi } from './bom-api';
import { GatewayError, type NavigationGateway } from './gateway';
import { showcaseRegistry } from './registry/registry';
import { effectiveCapabilities, resolvePageAccess } from './domain/access';
import { projectVisibleNavigation } from './domain/navigation';
import type { ShowcaseNavigationNode, ShowcaseRoleId } from './registry/types';

class MemoryGateway implements NavigationGateway {
  role: ShowcaseRoleId | null = null;
  actionCalls: string[] = [];
  pageChecks: string[] = [];
  navigationCalls: string[] = [];
  failActions = false;
  failPageChecks = 0;
  failStyleScenes = false;
  extraManagementRoot = false;
  constructor(initialRole: ShowcaseRoleId | null = null) { this.role = initialRole; }
  async session(): Promise<SessionUser> { if (!this.role) throw new GatewayError(401, 'UNAUTHENTICATED', '请先登录'); return this.user(); }
  async login(input: { account: string; password: string }): Promise<SessionUser> {
    const account = input.account.trim().toLowerCase();
    if ((account !== 'admin' && account !== 'viewer') || !input.password) throw new GatewayError(401, 'UNAUTHENTICATED', '账号或密码错误');
    this.role = account;
    return this.user();
  }
  async logout(): Promise<void> { this.role = null; }
  async navigation(systemCode: string): Promise<NavigationResponse> {
    this.navigationCalls.push(systemCode);
    if (!this.role) throw new GatewayError(401, 'UNAUTHENTICATED', '请先登录');
    if (systemCode !== 'demo-portal') throw new GatewayError(403, 'FORBIDDEN', '无权访问');
    const visible = projectVisibleNavigation(this.role, showcaseRegistry);
    const items = visible.items.map((node) => this.node(node));
    if (this.extraManagementRoot) items.push({ menuCode: 'audit-root', label: '审计管理', nodeType: 'GROUP', routePath: null, iconKey: 'audit', sortNo: 20, children: [] });
    return { systemCode, items, permissionVersion: 'a'.repeat(64) };
  }
  async assertPage(systemCode: string, routePath: string): Promise<void> {
    this.pageChecks.push(routePath);
    if (this.failPageChecks > 0) { this.failPageChecks -= 1; throw new GatewayError(503, 'SERVICE_UNAVAILABLE', '权限服务暂时不可用'); }
    if (systemCode !== 'demo-portal' || !this.role) throw new GatewayError(403, 'FORBIDDEN', '无权访问');
    const access = resolvePageAccess(routePath, this.role, showcaseRegistry);
    if (access.kind === 'forbidden') throw new GatewayError(403, 'FORBIDDEN', '无权访问');
    if (access.kind === 'not-found') throw new GatewayError(404, 'NOT_FOUND', '页面不存在');
  }
  async performResourceAction(_systemCode: string, actionCode: 'manage' | 'export'): Promise<unknown> {
    this.actionCalls.push(actionCode);
    if (this.failActions) throw new GatewayError(503, 'SERVICE_UNAVAILABLE', '服务暂时不可用');
    return {};
  }
  async styleSceneTaxonomy(): Promise<StyleSceneTaxonomy> {
    return { types: [{ category: 'PAGE', count: 1, groups: [{ subCategory: '系统与任务入口类', count: 1 }] }] };
  }
  async styleScenes(): Promise<StyleSceneList> {
    if (this.failStyleScenes) throw new GatewayError(503, 'SERVICE_UNAVAILABLE', '场景目录服务暂时不可用');
    return { items: [{ id: '00000000-0000-4000-8000-000000000026', assetCode: 'TPL-02-01', category: '树形联动', subCategory: null, sceneName: '树状分类明细', description: '树与右侧网格', maturity: 'interaction-verified', status: 'DONE', pagePath: '/showcase/items', template: { availability: 'pending', suitableFor: [], regions: [], steps: [], config: [], components: [], tags: [], thumbnail: null, previewKind: null, demoPath: '/template-demos/workspace.html?template=TPL-02-01', applications: [{ name: '物料产品管理', path: '/showcase/items' }], referencePrompt: '参考树状分类明细', version: '2026-09-28', relatedTemplates: [] }, note: null, doneAt: null, sortNo: 10, version: 1 }], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };
  }
  async styleSceneDetail(): Promise<StyleSceneDetail> {
    return { id: '00000000-0000-4000-8000-000000000026', assetCode: 'EPM-PAGE-001', category: 'PAGE', subCategory: '系统与任务入口类', sceneName: '应用壳层', description: '导航、顶栏、内容区、账户区', maturity: 'interaction-verified', status: 'DONE', pagePath: null, note: null, doneAt: null, sortNo: 10, version: 1, definition: ['多模块企业系统'], definitionRef: null, artifacts: [], evidence: [], evidenceCards: [], nextEvidence: null };
  }
  async items() { return { items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } }; }
  async dictionaries() { return []; }
  private user(): SessionUser { return { account: this.role!, displayName: this.role === 'admin' ? '系统管理员' : '受限演示用户' }; }
  private node(node: ShowcaseNavigationNode): NavigationNode {
    const page = node.pageId ? showcaseRegistry.pages.find((candidate) => candidate.id === node.pageId) : undefined;
    const capabilities = effectiveCapabilities(this.role, showcaseRegistry);
    return { menuCode: node.id.replace(/^nav-/, ''), label: node.label, nodeType: page ? 'PAGE' : 'GROUP', routePath: page?.path ?? null, iconKey: node.iconKey, sortNo: 10, ...(page ? { allowedActions: [{ actionCode: 'view', label: '查看', actionType: 'VIEW', sortNo: 10 }, ...(page.operations ?? []).filter((operation) => capabilities.has(operation.capability)).map((operation, index) => ({ actionCode: operation.capability.split('.').at(-1)!, label: operation.label, actionType: 'CUSTOM', sortNo: 20 + index }))] } : {}), children: (node.children ?? []).map((child) => this.node(child)) };
  }
}

async function login(role: ShowcaseRoleId, gateway = new MemoryGateway()) {
  const user = userEvent.setup();
  render(<ShowcaseApp gateway={gateway} />);
  await screen.findByRole('heading', { name: '登录演示门户' });
  await user.type(screen.getByRole('textbox', { name: '账号' }), role);
  await user.type(screen.getByLabelText('密码'), 'demo-password');
  await user.click(screen.getByRole('button', { name: '登录并进入' }));
  return { user, gateway };
}

describe('database-backed enterprise navigation showcase', () => {
  it('opens the mobile prototype in a new page while keeping CRM as the selected system', async () => {
    window.location.hash = '#/showcase/workbench';
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    try {
      const { user, gateway } = await login('admin');
      const selector = await screen.findByRole('combobox', { name: '切换系统' });
      expect(selector).toHaveValue('demo-portal');
      expect(within(selector).getByRole('option', { name: '移动端原型' })).toBeInTheDocument();
      const previousRoute = window.location.hash;
      await user.selectOptions(selector, 'mobile-prototype');
      expect(open).toHaveBeenCalledWith('http://127.0.0.1:5176/', '_blank', 'noopener,noreferrer');
      expect(selector).toHaveValue('demo-portal');
      expect(gateway.navigationCalls).toEqual(['demo-portal']);
      expect(window.location.hash).toBe(previousRoute);
    } finally { open.mockRestore(); }
  });

  it('opens sales-order creation as a workspace tab and checks its parent page permission', async () => {
    window.location.hash = '#/showcase/sales-orders';
    const { user, gateway } = await login('admin');
    await user.click(await screen.findByRole('button', { name: '新增销售订单' }));
    expect(window.location.hash).toBe('#/showcase/sales-orders/new');
    expect(await screen.findByRole('heading', { name: '新建销售订单' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: '已打开页面' })).getByRole('button', { name: '新建销售订单' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('dialog', { name: '新建销售订单' })).toBeNull();
    expect(gateway.pageChecks).toContain('/showcase/sales-orders');
  });

  it('pins the authorized Agent entry above the scrolling menu and opens its own workspace tab', async () => {
    window.location.hash = '#/showcase/workbench';
    const { user, gateway } = await login('admin');
    const rail = screen.getByRole('complementary', { name: '演示门户导航' });
    const shortcut = within(rail).getByRole('button', { name: 'Agent 工作台' });
    const search = within(rail).getByRole('searchbox', { name: '搜索菜单' });
    expect(shortcut.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByRole('navigation', { name: '演示门户菜单' })).queryByRole('button', { name: 'Agent 工作台' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '打开 Agent 工作台' }));
    expect(window.location.hash).toBe('#/showcase/agent');
    expect(await screen.findByRole('heading', { name: 'Agent 工作台' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: '已打开页面' })).getByRole('button', { name: 'Agent 工作台' })).toHaveAttribute('aria-current', 'page');
    expect(gateway.pageChecks).toContain('/showcase/agent');
  });

  it('does not show the Agent shortcut to an account without its page permission', async () => {
    window.location.hash = '#/showcase/workbench';
    await login('viewer');
    expect(screen.queryByRole('button', { name: '打开 Agent 工作台' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: '演示门户导航' })).queryByRole('button', { name: 'Agent 工作台' })).not.toBeInTheDocument();
  });

  it('navigates back to a background target when close-right removes the active page', async () => {
    window.location.hash = '#/showcase/system/resources';
    const admin = await login('admin');
    await screen.findByRole('button', { name: '维护资源' });
    const tabs = screen.getByRole('navigation', { name: '已打开页面' });
    await within(tabs).findByRole('button', { name: '资源目录' });
    const nav = screen.getByRole('navigation', { name: '演示门户菜单' });
    await admin.user.click(within(nav).getByRole('button', { name: '用户管理' }));
    await within(tabs).findByRole('button', { name: '用户管理' });
    fireEvent.contextMenu(within(tabs).getByRole('button', { name: '资源目录' }));
    await admin.user.click(screen.getByRole('menuitem', { name: '关闭右侧' }));
    expect(window.location.hash).toBe('#/showcase/system/resources');
    expect(within(tabs).getByRole('button', { name: '资源目录' })).toHaveAttribute('aria-current', 'page');
    expect(within(tabs).queryByRole('button', { name: '用户管理' })).not.toBeInTheDocument();
    await screen.findByRole('button', { name: '维护资源' });
  });

  it('refreshes page content while keeping the shell and closes back to the fixed home', async () => {
    window.location.hash = '#/showcase/system/resources';
    const admin = await login('admin');
    await admin.user.click(await screen.findByRole('button', { name: '维护资源' }));
    expect(await screen.findByRole('status')).toHaveTextContent('资源维护演示已完成');
    const tabs = screen.getByRole('navigation', { name: '已打开页面' });
    const target = await within(tabs).findByRole('button', { name: '资源目录' });
    fireEvent.contextMenu(target);
    await admin.user.click(screen.getByRole('menuitem', { name: '刷新当前' }));
    expect(screen.getByRole('status')).not.toHaveTextContent('资源维护演示已完成');
    expect(screen.getByRole('navigation', { name: '已打开页面' })).toBe(tabs);
    fireEvent.contextMenu(target);
    await admin.user.click(screen.getByRole('menuitem', { name: '关闭全部' }));
    expect(window.location.hash).toBe('#/showcase/workbench');
    expect(within(tabs).getByRole('button', { name: '我的工作台' })).toHaveAttribute('aria-current', 'page');
    expect(within(tabs).queryByRole('button', { name: '资源目录' })).not.toBeInTheDocument();
  });

  it('shows the interaction index inside the authenticated portal without page authorization', async () => {
    window.location.hash = '#/showcase/style-scenes';
    const gateway = new MemoryGateway();
    await login('viewer', gateway);
    expect(await screen.findByRole('heading', { name: '交互模板库' })).toBeInTheDocument();
    const portalMenu = screen.getByRole('navigation', { name: '演示门户菜单' });
    expect(portalMenu).toBeInTheDocument();
    expect(within(portalMenu).getByRole('button', { name: '交互模板库' })).toHaveAttribute('aria-current', 'page');
    expect(gateway.navigationCalls).toEqual(['demo-portal']);
    expect(gateway.pageChecks).not.toContain('/showcase/style-scenes');
    expect(screen.queryByRole('option', { name: '交互模板库' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '查看模板：树状分类明细' })).toBeInTheDocument();
  });

  it('opens template demonstrations and business examples in independent browser tabs', async () => {
    window.location.hash = '#/showcase/style-scenes';
    const admin = await login('admin');
    await admin.user.click(await screen.findByRole('button', { name: '查看模板：树状分类明细' }));
    expect(screen.getByRole('link', { name: '打开示例交互' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: '物料产品管理' })).toHaveAttribute('href', '/#/showcase/items');
    expect(window.location.hash).toBe('#/showcase/style-scenes');
    expect(within(screen.getByRole('navigation', { name: '已打开页面' })).getByRole('button', { name: '交互模板库' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a database error instead of a bundled interaction fallback', async () => {
    window.location.hash = '#/showcase/style-scenes';
    const gateway = new MemoryGateway();
    gateway.failStyleScenes = true;
    await login('viewer', gateway);
    expect(await screen.findByRole('alert')).toHaveTextContent('场景目录服务暂时不可用');
    expect(screen.queryByRole('button', { name: '查看模板：树状分类明细' })).not.toBeInTheDocument();
  });

  it('canonicalizes the retired interaction-index route to the catalog route', async () => {
    window.location.hash = '#/showcase/interaction-index';
    await login('viewer');
    expect(await screen.findByRole('button', { name: '查看模板：树状分类明细' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/showcase/style-scenes');
  });
  it('starts with system management collapsed', async () => {
    window.location.hash = '#/showcase/customers';
    await login('admin');
    const nav = await screen.findByRole('navigation', { name: '演示门户菜单' });
    expect(within(nav).getByRole('button', { name: '系统管理' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('loads one authorized navigation tree after account/password login', async () => {
    window.location.hash = '#/showcase/customers';
    await login('admin');
    expect(await screen.findByRole('navigation', { name: '演示门户菜单' })).toBeInTheDocument();
  });

  it('preserves every management root returned by the server', async () => {
    window.location.hash = '#/showcase/customers';
    const gateway = new MemoryGateway();
    gateway.extraManagementRoot = true;
    await login('admin', gateway);
    await screen.findByRole('navigation', { name: '演示门户菜单' });
    expect(screen.getByRole('button', { name: '审计管理' })).toBeInTheDocument();
  });

  it('offers a retry when page authorization is temporarily unavailable', async () => {
    window.location.hash = '#/showcase/customers';
    const gateway = new MemoryGateway();
    gateway.failPageChecks = 1;
    await login('admin', gateway);
    await screen.findByRole('button', { name: '重试页面权限' });
  });

  it('does not expose viewer-restricted management pages through route or search', async () => {
    window.location.hash = '#/showcase/system/users';
    await login('viewer');
    expect(await screen.findByRole('heading', { name: '无权访问' })).toBeInTheDocument();
    expect(screen.queryByText('用户管理')).not.toBeInTheDocument();
  });

  it('uses allowedActions for buttons and still calls the server gateway for an admin action', async () => {
    window.location.hash = '#/showcase/system/resources';
    const admin = await login('admin');
    const maintain = await screen.findByRole('button', { name: '维护资源' });
    await admin.user.click(maintain);
    expect(admin.gateway.actionCalls).toEqual(['manage']);
    expect(await screen.findByRole('status')).toHaveTextContent('资源维护演示已完成');
  });

  it('disables resource actions omitted from the viewer authorization response', async () => {
    window.location.hash = '#/showcase/system/resources';
    await login('viewer');
    expect(await screen.findByRole('button', { name: '维护资源' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '导出清单' })).toBeDisabled();
  });

  it('shows recoverable feedback when a protected operation fails closed', async () => {
    window.location.hash = '#/showcase/system/resources';
    const gateway = new MemoryGateway();
    gateway.failActions = true;
    const admin = await login('admin', gateway);
    await admin.user.click(await screen.findByRole('button', { name: '维护资源' }));
    expect(await screen.findByRole('status')).toHaveTextContent('资源维护演示失败，请重试或重置');
  });

  it('clears the authorized tree on logout', async () => {
    window.location.hash = '#/showcase/customers';
    const { user } = await login('admin');
    await screen.findByRole('navigation', { name: '演示门户菜单' });
    await user.click(screen.getByRole('button', { name: '退出登录' }));
    expect(await screen.findByRole('heading', { name: '登录演示门户' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '演示门户菜单' })).not.toBeInTheDocument();
  });

  it('restores a valid server session without an account-side shortcut', async () => {
    window.location.hash = '#/showcase/customers';
    render(<ShowcaseApp gateway={new MemoryGateway('admin')} />);
    expect(await screen.findByRole('button', { name: '退出登录' })).toBeInTheDocument();
  });

  it('renders a BOM detail as its own workspace page without the BOM list above it', async () => {
    const bomId = '11111111-1111-4111-8111-111111111111';
    const detail: BomDetail = { id: bomId, itemId: '22222222-2222-4222-8222-222222222222', itemCode: 'TEST-P-SCREEN-004', itemName: '演示会议大屏', itemType: 'PRODUCT', bomCode: 'BOM-TEST-P-SCREEN-004', revision: 1, status: 'PUBLISHED', isCurrent: true, baseQuantity: '1.0000', baseUnit: '台', lineCount: 0, rowVersion: 2, updatedAt: '2026-10-01T00:00:00.000Z', lines: [] };
    const detailSpy = vi.spyOn(bomApi, 'detail').mockResolvedValue(detail);
    try {
      window.location.hash = `#/showcase/boms/${bomId}`;
      const gateway = new MemoryGateway('admin');
      render(<ShowcaseApp gateway={gateway} />);
      expect(await screen.findByRole('heading', { name: '演示会议大屏' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('BOM编码 / 产品编码 / 名称')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '返回BOM列表' })).toBeInTheDocument();
      expect(gateway.pageChecks).toContain('/showcase/boms');
    } finally {
      detailSpy.mockRestore();
    }
  });

  it('authorizes an item detail through the registered item directory and renders its tabs', async () => {
    const itemId = '11111111-1111-4111-8111-111111111111';
    window.location.hash = `#/showcase/items/${itemId}`;
    const gateway = new MemoryGateway();
    Object.assign(gateway, {
      itemDetail: async () => ({ id: itemId, itemCode: 'P001', itemName: '控制板', itemType: 'PRODUCT', majorCategoryId: null, majorCategoryName: null, middleCategoryId: null, middleCategoryName: null, minorCategoryId: null, minorCategoryName: null, model: 'CB-1', productLine: null, baseUnit: '件', batchManaged: false, status: 'ACTIVE', remark: null, version: 1, createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z' }),
      dictionaries: async () => [],
    });

    await login('admin', gateway);

    expect(await screen.findByRole('heading', { name: '控制板' })).toBeInTheDocument();
    expect(gateway.pageChecks.at(-1)).toBe('/showcase/items');
    expect(screen.getByRole('tab', { name: '物料基本信息' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '物料定价' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '附件' })).toBeInTheDocument();
  });
});

describe('approval center shell integration',()=>{
 it('opens approval preview beside home, reuses route tabs and preserves leave guard',async()=>{
  window.location.hash='#/showcase/style-scenes';
  const {user,gateway}=await login('admin');
  await user.click(await screen.findByRole('button',{name:'审批中心'}));
  const pages=screen.getByRole('navigation',{name:'已打开页面'});
  expect(await within(pages).findByRole('button',{name:'审批中心'})).toHaveAttribute('aria-current','page');
  const frame=screen.getByTitle('审批中心原型预览') as HTMLIFrameElement;
  const send=(data:object)=>fireEvent(window,new MessageEvent('message',{origin:'http://127.0.0.1:5174',source:frame.contentWindow,data:{channel:'forge-approval-preview',version:1,...data}}));
  send({type:'state',route:'todo',title:'审批中心',count:9,dirty:true});
  expect(screen.getByLabelText('模拟待办数量')).toHaveTextContent('9');
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
  await user.click(screen.getByLabelText('我的工作台'));
  expect(window.location.hash).toBe('#/showcase/approval-center');expect(confirm).toHaveBeenCalled();
  send({type:'state',route:'todo',title:'审批中心',count:9,dirty:false});
  send({type:'navigate',route:'instance/00000000-0000-4000-8000-000000000001'});
  await within(pages).findAllByRole('button',{name:'审批中心'});
  expect(window.location.hash).toContain('/approval-center/instance/');
  expect(gateway.pageChecks.some(p=>p.includes('approval-center'))).toBe(false);
  confirm.mockRestore();
 });
});
