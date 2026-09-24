import { SystemParametersPage } from './SystemParametersPage';
import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from 'react';
import {
  IconBell, IconBox, IconBraces, IconBriefcase, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconComponents, IconDatabase, IconFileDescription, IconFilter, IconForms, IconHistory, IconLayoutDashboard,
  IconLayoutSidebarRight, IconList, IconLoader, IconLogout, IconMail, IconMenu2, IconMessageCircle, IconPalette,
  IconPointer, IconRoute, IconSearch, IconSettings, IconShieldLock, IconSitemap, IconSparkles, IconSpacingVertical,
  IconTable, IconTemplate, IconTypography, IconUser, IconUsers, IconX,
} from '@tabler/icons-react';
import type { Customer, NavigationNode, NavigationResponse, Opportunity, Product, SessionUser } from '@forge-crm/contracts';
import { initialResourceState, reduceResourceAction } from './domain/resource';
import { parseRootRoute } from './domain/routes';
import { showcaseRegistry } from './registry/registry';
import type { ShowcaseNavigationNode, ShowcasePage } from './registry/types';
import { GatewayError, httpNavigationGateway, type EnterpriseGateway, type NavigationGateway } from './gateway';
import { CustomerDetailPage, CustomerDirectoryPage, DictionaryAdminPage, ListViewAdminPage, RoleManagementPage, StyleSceneListPage } from './EnterprisePages';
import { RouteTabs, useRouteTabs } from '../common/route-tabs';
import { applyTabAction, type TabAction } from '../common/route-tabs/model';
import type { CustomerMode, LeaveGuard } from './CustomerDetailPage';
import { AccessPermissionsPage, AccessUsersPage } from './AccessAdminPages';
import { OrganizationUnitsPage } from './OrganizationUnitsPage';
import { EmployeeDirectoryPage } from './EmployeeDirectoryPage';
import { ResourceMenuPage } from './ResourceMenuPage';
import { CompetitorDirectoryPage, OpportunityDetailPage, OpportunityDirectoryPage, OpportunityStageAdminPage, ProductDirectoryPage } from './OpportunityPages';
import { QuotationListPage, QuotationDetailPage } from './QuotationPages';
import { ProductDetailPage } from './ProductDetailPage';
import { InboundOrderPage, InventoryBalancePage, ItemDetailPage, ItemDirectoryPage, LegalEntityPage, WarehousePage } from './InventoryPages';

const systems = [{ code: 'demo-portal', label: 'CRM 工作台' }];

function currentShowcasePath() {
  const route = parseRootRoute(window.location.hash);
  return route.kind === 'showcase' ? route.path : '/showcase/customers';
}

const portalIcons = {
  portal: IconSparkles, overview: IconLayoutDashboard, foundation: IconPalette, palette: IconPalette, text: IconTypography,
  layout: IconSpacingVertical, icons: IconBox, components: IconComponents, action: IconPointer, form: IconForms,
  table: IconTable, feedback: IconMessageCircle, pages: IconTemplate, list: IconList, filter: IconFilter,
  detail: IconFileDescription, split: IconLayoutSidebarRight, workbench: IconBriefcase, interaction: IconRoute,
  state: IconLoader, scenario: IconSitemap, settings: IconSettings, user: IconUser, users: IconUsers, info: IconBraces, role: IconUsers,
  lock: IconShieldLock, menu: IconMenu2, log: IconHistory, resource: IconDatabase, data: IconBraces, search: IconSearch,
} as const;

function Icon({ name }: { name: string }) {
  const PortalIcon = portalIcons[name as keyof typeof portalIcons] ?? IconBox;
  return <PortalIcon className="showcase-icon" size={20} stroke={1.7} aria-hidden="true" />;
}

export function ShowcaseApp({ gateway = httpNavigationGateway }: { gateway?: NavigationGateway }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [systemCode, setSystemCode] = useState('demo-portal');
  const [navigation, setNavigation] = useState<NavigationResponse | null>(null);
  const [phase, setPhase] = useState<'loading' | 'login' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [path, setPath] = useState(currentShowcasePath);

  const loadNavigation = async (nextSystem: string) => {
    setNavigation(null);
    setPhase('loading');
    try { setNavigation(await gateway.navigation(nextSystem)); setPhase('ready'); }
    catch (reason) { setError(messageFor(reason)); setPhase('error'); }
  };

  useEffect(() => {
    let active = true;
    gateway.session().then((session) => {
      if (!active) return;
      setUser(session);
      void loadNavigation(systemCode);
    }).catch((reason) => {
      if (!active) return;
      if (reason instanceof GatewayError && reason.status === 401) setPhase('login');
      else { setError(messageFor(reason)); setPhase('error'); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const update = () => setPath(currentShowcasePath());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const session = await gateway.login({ account, password });
      setUser(session);
      await loadNavigation(systemCode);
      if (path === '/showcase/login') navigate('/showcase/customers', setPath);
    } catch (reason) { setError(messageFor(reason)); setPhase('login'); }
  };

  const logout = async () => {
    try { await gateway.logout(); } catch { /* local state must still be cleared */ }
    setUser(null); setNavigation(null); setAccount(''); setPassword(''); setError(''); setPhase('login');
    navigate('/showcase/customers', setPath);
  };

  const switchSystem = async (next: string) => {
    setSystemCode(next); setError('');
    navigate('/showcase/customers', setPath);
    await loadNavigation(next);
  };

  if (phase === 'loading') return <StatePage code="LOADING" title="正在加载授权导航" detail="菜单返回前不会显示页面或历史权限数据。" />;
  if (!user || phase === 'login') return <IdentityGate account={account} password={password} systemCode={systemCode} error={error} onAccount={setAccount} onPassword={setPassword} onSystem={setSystemCode} onSubmit={login} />;
  if (phase === 'error' || !navigation) return <SystemFailure error={error} systemCode={systemCode} onSystem={(next) => void switchSystem(next)} onRetry={() => void loadNavigation(systemCode)} onExit={() => void logout()} />;
  return <PortalShell key={`${user.account}:${systemCode}:${navigation.permissionVersion}`} user={user} systemCode={systemCode} navigation={navigation} path={path} gateway={gateway} onSystem={(next) => void switchSystem(next)} onNavigate={(nextPath) => navigate(nextPath, setPath)} onExit={() => void logout()} />;
}

function messageFor(reason: unknown): string {
  if (reason instanceof GatewayError) {
    if (reason.status === 401) return '账号或密码错误，或登录已失效';
    if (reason.status === 403) return '当前账号无权访问所选系统';
    if (reason.status === 404) return '所选系统或页面不存在';
    return reason.message;
  }
  return '服务暂时不可用，请稍后重试';
}

function navigate(path: string, update: (path: string) => void) { update(path); window.location.hash = `#${path}`; }

function IdentityGate({ account, password, systemCode, error, onAccount, onPassword, onSystem, onSubmit }: { account: string; password: string; systemCode: string; error: string; onAccount: (value: string) => void; onPassword: (value: string) => void; onSystem: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  return <main className="showcase-login"><section className="showcase-login-card" aria-labelledby="showcase-login-title">
    <span className="showcase-login-mark"><Icon name="portal" /></span><p className="showcase-eyebrow">INTERACTION ASSET SHOWCASE</p>
    <h1 id="showcase-login-title">登录演示门户</h1><p>菜单和页面操作由数据库角色权限实时决定。</p>
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="showcase-system">目标系统</label><select id="showcase-system" aria-label="目标系统" value={systemCode} onChange={(event) => onSystem(event.target.value)}>{systems.map((system) => <option key={system.code} value={system.code}>{system.label}</option>)}</select>
      <label htmlFor="showcase-account">账号</label><input id="showcase-account" value={account} onChange={(event) => onAccount(event.target.value)} placeholder="admin 或 viewer" autoComplete="username" />
      <label htmlFor="showcase-password">密码</label><input id="showcase-password" type="password" value={password} onChange={(event) => onPassword(event.target.value)} autoComplete="current-password" />
      <small>演示账号必须通过角色成员关系获得权限，不存在账号特判。</small>{error && <div className="showcase-login-error" role="alert">{error}</div>}
      <button type="submit">登录并进入</button>
    </form>
  </section></main>;
}

function SystemFailure({ error, systemCode, onSystem, onRetry, onExit }: { error: string; systemCode: string; onSystem: (value: string) => void; onRetry: () => void; onExit: () => void }) {
  return <main className="showcase-login"><section className="showcase-login-card"><p className="showcase-eyebrow">FAIL CLOSED</p><h1>无法加载授权导航</h1><p role="alert">{error}</p>
    <label htmlFor="failed-system">目标系统</label><select id="failed-system" aria-label="目标系统" value={systemCode} onChange={(event) => onSystem(event.target.value)}>{systems.map((system) => <option key={system.code} value={system.code}>{system.label}</option>)}</select>
    <button type="button" onClick={onRetry}>重试</button><button type="button" onClick={onExit}>退出登录</button></section></main>;
}

function toNode(node: NavigationNode): ShowcaseNavigationNode {
  return { id: node.menuCode, label: node.label, iconKey: node.iconKey, routePath: node.routePath, allowedActions: node.allowedActions?.map((action) => action.actionCode), children: node.children.map(toNode) };
}

function PortalShell({ user, systemCode, navigation, path, gateway, onSystem: switchSystem, onNavigate: navigateTo, onExit: exit }: { user: SessionUser; systemCode: string; navigation: NavigationResponse; path: string; gateway: NavigationGateway; onSystem: (value: string) => void; onNavigate: (path: string) => void; onExit: () => void }) {
  const guards = useRef(new Map<string, LeaveGuard>());
  const previousPath = useRef(path);
  const [customerTitles, setCustomerTitles] = useState<Record<string, string>>({});
  const [customerModes, setCustomerModes] = useState<Record<string, { mode: CustomerMode; sequence: number }>>({});
  const [visitedCustomers, setVisitedCustomers] = useState<string[]>([]);
  const [listVisited, setListVisited] = useState(false);
  const [customerRevision, setCustomerRevision] = useState(0);
  const mayLeave = (target = path) => guards.current.get(target)?.() ?? true;
  const onNavigate = (next: string) => {
    if (next !== path && !mayLeave()) return;
    previousPath.current = next; navigateTo(next);
  };
  const onExit = () => { if (mayLeave()) exit(); };
  const onSystem = (next: string) => { if (mayLeave()) switchSystem(next); };
  useEffect(() => {
    if (previousPath.current === path) return;
    const old = previousPath.current;
    if (!(guards.current.get(old)?.() ?? true)) { navigateTo(old); return; }
    previousPath.current = path;
  }, [path, navigateTo]);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(['system']));
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [access, setAccess] = useState<'loading' | 'allowed' | 'forbidden' | 'not-found' | 'error'>('loading');
  const [accessAttempt, setAccessAttempt] = useState(0);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null);
  const [toolPanel, setToolPanel] = useState<'alerts' | 'messages' | 'user' | null>(null);
  const visibleNavigation = useMemo(() => navigation.items.map(toNode), [navigation]);
  const filteredNavigation = useMemo(() => filterMenuItems(visibleNavigation, query), [visibleNavigation, query]);
  const quotePage = showcaseRegistry.pages.find((page) => page.id === 'quotation-directory');
  const productPage = showcaseRegistry.pages.find((page) => page.id === 'product-directory');
  const inboundPage = showcaseRegistry.pages.find((page) => page.id === 'inbound-order-directory');
  const itemPage = showcaseRegistry.pages.find((page) => page.id === 'item-directory');
  const localPage = showcaseRegistry.pages.find((page) => page.path === path)
    ?? (path.startsWith('/showcase/quotations/') && quotePage ? { ...quotePage, path, title: '报价详情' } : undefined)
    ?? (path.startsWith('/showcase/products/') && productPage ? { ...productPage, path, title: '产品详情' } : undefined)
    ?? (path.startsWith('/showcase/inbound-orders/') && inboundPage ? { ...inboundPage, path, title: '入库单详情' } : undefined)
    ?? (path.startsWith('/showcase/items/') && itemPage ? { ...itemPage, path, title: '物料详情' } : undefined);
  const customerDetailMatch = path.match(/^\/showcase\/customers\/([\w-]+)$/);
  const opportunityDetailMatch = path.match(/^\/showcase\/opportunities\/([\w-]+)$/);
  const productDetailMatch = path.match(/^\/showcase\/products\/([\w-]+)$/);
  const inboundDetailMatch = path.match(/^\/showcase\/inbound-orders\/([\w-]+)$/);
  const itemDetailMatch = path.match(/^\/showcase\/items\/([\w-]+)$/);
  const pageAccessPath = customerDetailMatch ? '/showcase/customers'
    : opportunityDetailMatch ? '/showcase/opportunities'
    : productDetailMatch ? '/showcase/products'
    : inboundDetailMatch ? '/showcase/inbound-orders'
    : itemDetailMatch ? '/showcase/items'
    : path.startsWith('/showcase/quotations/') ? '/showcase/quotations'
    : path;
  const customerNode = findNodeByPath(visibleNavigation, '/showcase/customers');
  const opportunityNode = findNodeByPath(visibleNavigation, '/showcase/opportunities');
  const productNode = findNodeByPath(visibleNavigation, '/showcase/products');
  const inboundNode = findNodeByPath(visibleNavigation, '/showcase/inbound-orders');
  const itemNode = findNodeByPath(visibleNavigation, '/showcase/items');
  const activeNode = customerDetailMatch ? customerNode : opportunityDetailMatch ? opportunityNode : productDetailMatch ? productNode : inboundDetailMatch ? inboundNode : itemDetailMatch ? itemNode : findNodeByPath(visibleNavigation, path.startsWith('/showcase/quotations/') ? '/showcase/quotations' : path);
  const { tabs, execute, refreshKey } = useRouteTabs({
    home: { path: '/showcase/customers', title: '概览' },
    current: access === 'allowed' && authorizedPath === path && (localPage || customerDetailMatch || opportunityDetailMatch || productDetailMatch || inboundDetailMatch || itemDetailMatch)
      ? { path, title: localPage?.title ?? customerTitles[path] ?? (opportunityDetailMatch ? '商机详情' : productDetailMatch ? '产品详情' : '客户详情') } : null,
    activePath: path, onNavigate: navigateTo,
  });

  const onTabAction = (action: TabAction, targetPath: string) => {
    const next = applyTabAction(tabs, path, targetPath, action);
    const affected = tabs.filter((tab) => !next.tabs.some((item) => item.path === tab.path && item.refreshKey === tab.refreshKey)).map((tab) => tab.path);
    if (next.activePath !== path && !affected.includes(path)) affected.push(path);
    if (!affected.every((tabPath) => mayLeave(tabPath))) return;
    previousPath.current = next.activePath; execute(action, targetPath);
  };
  const openCustomer = (customer: Customer, mode: CustomerMode) => {
    if (!mayLeave()) return;
    const next = `/showcase/customers/${customer.id}`;
    setCustomerTitles((current) => ({ ...current, [next]: `客户 · ${customer.shortName}` }));
    setCustomerModes((current) => ({ ...current, [next]: { mode, sequence: (current[next]?.sequence ?? 0) + 1 } }));
    previousPath.current = next; navigateTo(next);
  };
  const openOpportunity = (opportunity: Opportunity) => {
    if (!mayLeave()) return;
    const next = `/showcase/opportunities/${opportunity.id}`;
    previousPath.current = next; navigateTo(next);
  };
  const openProduct = (product: Product) => {
    if (!mayLeave()) return;
    const next = `/showcase/products/${product.id}`;
    previousPath.current = next; navigateTo(next);
  };
  useEffect(() => {
    if (access !== 'allowed' || authorizedPath !== path) return;
    if (path === '/showcase/customers') setListVisited(true);
    if (customerDetailMatch) setVisitedCustomers((current) => current.includes(path) ? current : [...current, path]);
  }, [access, authorizedPath, path]);

  useEffect(() => {
    let active = true; setAccess('loading'); setAuthorizedPath(null);
    gateway.assertPage(systemCode, pageAccessPath).then(() => { if (active) { setAccess('allowed'); setAuthorizedPath(path); } }).catch((reason) => { if (active) setAccess(reason instanceof GatewayError && reason.status === 403 ? 'forbidden' : reason instanceof GatewayError && reason.status === 404 ? 'not-found' : 'error'); });
    return () => { active = false; };
  }, [gateway, pageAccessPath, path, systemCode, navigation.permissionVersion, accessAttempt]);

  useEffect(() => { if (activeNode?.parentId) setOpenGroups((current) => current.has(activeNode.parentId!) ? current : new Set(current).add(activeNode.parentId!)); }, [activeNode?.parentId]);
  useEffect(() => { if (!searchOpen) return; searchInputRef.current?.focus(); const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSearchOpen(false); searchTriggerRef.current?.focus(); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [searchOpen]);
  const toggleGroup = (id: string) => { if (collapsed) { setFlyoutGroup((current) => current === id ? null : id); return; } setOpenGroups((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };

  return <div className="showcase-shell" data-collapsed={collapsed}><aside className="showcase-rail" aria-label="演示门户导航">
    <div className="showcase-brand"><span className="showcase-brand-mark"><Icon name="portal" /></span><strong>交互资产演示门户</strong><button type="button" onClick={() => { setCollapsed((value) => !value); setFlyoutGroup(null); setSearchOpen(false); }} aria-label={collapsed ? '展开演示门户菜单' : '折叠演示门户菜单'}>{collapsed ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}</button></div>
    <div className="showcase-search">{collapsed ? <button ref={searchTriggerRef} type="button" aria-label="打开菜单搜索" aria-expanded={searchOpen} onClick={() => setSearchOpen((value) => !value)}><Icon name="search" /></button> : <><Icon name="search" /><input type="search" aria-label="搜索菜单" placeholder="搜索菜单..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="清空菜单搜索" onClick={() => setQuery('')}><IconX size={14} /></button>}</>}{collapsed && searchOpen && <div className="showcase-search-flyout"><input ref={searchInputRef} type="search" aria-label="搜索菜单" placeholder="搜索菜单..." value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" aria-label="关闭菜单搜索" onClick={() => { setSearchOpen(false); searchTriggerRef.current?.focus(); }}><IconX size={14} /></button></div>}</div>
    <nav className="showcase-primary-nav" aria-label="演示门户菜单">{filteredNavigation.map((node) => <MenuNode key={node.id} node={node} path={path} collapsed={collapsed} forceOpen={Boolean(query)} openGroups={openGroups} flyoutGroup={flyoutGroup} onToggle={toggleGroup} onNavigate={onNavigate} />)}{query && filteredNavigation.length === 0 && <EmptySearch onClear={() => setQuery('')} />}</nav>
  </aside><main className="showcase-main"><header className="showcase-topbar"><div className="showcase-product-context"><strong>{systems.find((item) => item.code === systemCode)?.label}</strong><span>企业应用工作区</span></div><div className="showcase-session-actions"><select aria-label="切换系统" value={systemCode} onChange={(event) => onSystem(event.target.value)}>{systems.map((system) => <option key={system.code} value={system.code}>{system.label}</option>)}</select><div className="toolbar-popover"><button type="button" aria-label="预警提醒" onClick={() => setToolPanel((value) => value === 'alerts' ? null : 'alerts')}><IconBell size={16} /><i>2</i></button>{toolPanel === 'alerts' && <ToolPanel title="预警提醒" lines={['2 个演示字典项近期有调整', '客户视图配置已启用角色基线']} />}</div><div className="toolbar-popover"><button type="button" aria-label="消息" onClick={() => setToolPanel((value) => value === 'messages' ? null : 'messages')}><IconMail size={16} /><i>3</i></button>{toolPanel === 'messages' && <ToolPanel title="消息中心" lines={['客户主数据演示已初始化', '个人视图可在客户列表保存', '本地数据库连接正常']} />}</div><button type="button" aria-label="退出登录" title="退出登录" onClick={onExit}><IconLogout size={16} /></button><div className="toolbar-popover"><button className="showcase-user-trigger" type="button" title={user.account} onClick={() => setToolPanel((value) => value === 'user' ? null : 'user')}><span>{user.account.slice(0, 1).toUpperCase()}</span><b>{user.account}</b><IconChevronDown size={14} /></button>{toolPanel === 'user' && <div className="showcase-tool-panel user-panel"><strong>{user.displayName}</strong><small>{user.account}</small><button onClick={onExit}>退出登录</button></div>}</div></div></header>
    <RouteTabs tabs={tabs} activePath={path} onNavigate={onNavigate} onAction={onTabAction} getHref={(tab) => { const url = new URL(window.location.href); url.hash = tab.path; return url.href; }} />
    <section className="showcase-content">{access === 'loading' && <StatePage code="LOADING" title="正在校验页面权限" detail="校验完成前不显示页面内容。" />}{access === 'forbidden' && <StatePage code="403" title="无权访问" detail="当前账号不能查看此页面。可从左侧选择已授权页面。" />}{access === 'not-found' && <StatePage code="404" title="页面未找到" detail="该地址未登记为演示页面。" />}{access === 'error' && <StatePage code="503" title="权限服务不可用" detail="请稍后重试；系统不会回退为显示全部。" retryLabel="重试页面权限" onRetry={() => setAccessAttempt((value) => value + 1)} />}{access === 'allowed' && authorizedPath === path && !customerDetailMatch && !opportunityDetailMatch && !productDetailMatch && !inboundDetailMatch && !itemDetailMatch && localPage && localPage.id !== 'customer-directory' && localPage.id !== 'opportunity-directory' && localPage.id !== 'product-directory' && <PageAdapter registerGuard={(guard) => { if (guard) guards.current.set(path, guard); else guards.current.delete(path); }} key={`${path}:${refreshKey}`}  page={localPage} user={user} systemCode={systemCode} allowedActions={activeNode?.node.allowedActions ?? []} gateway={gateway} />}{access === 'allowed' && !customerDetailMatch && !opportunityDetailMatch && !productDetailMatch && !inboundDetailMatch && !itemDetailMatch && !localPage && <StatePage code="CONFIG" title="页面适配器不可用" detail="授权菜单尚未登记对应的本地页面适配器。" />}
      {listVisited && customerNode && 'customers' in gateway && <div hidden={path !== '/showcase/customers' || access !== 'allowed' || authorizedPath !== path}>
        <CustomerDirectoryPage key={tabs.find((tab) => tab.path === '/showcase/customers')?.refreshKey ?? 0} systemCode={systemCode} allowedActions={customerNode.node.allowedActions ?? []} gateway={gateway as EnterpriseGateway} onOpenCustomer={openCustomer} refreshToken={customerRevision} />
      </div>}
      {tabs.filter((tab) => visitedCustomers.includes(tab.path) && /^\/showcase\/customers\/[\w-]+$/.test(tab.path)).map((tab) => <div key={tab.path} hidden={path !== tab.path || access !== 'allowed' || authorizedPath !== path}>
        <CustomerDetailPage key={tab.path + ':' + (tab.refreshKey ?? 0) + ':' + (customerModes[tab.path]?.sequence ?? 0)} systemCode={systemCode} customerId={tab.path.split('/').at(-1)!} allowedActions={customerNode?.node.allowedActions ?? []} gateway={gateway as EnterpriseGateway} initialMode={customerModes[tab.path]?.mode ?? 'view'} onBack={() => { previousPath.current = '/showcase/customers'; navigateTo('/showcase/customers'); }} onChanged={() => setCustomerRevision((value) => value + 1)} onIdentity={(customer) => setCustomerTitles((current) => current[tab.path] === '客户 · ' + customer.shortName ? current : ({ ...current, [tab.path]: '客户 · ' + customer.shortName }))} registerGuard={(guard) => { if (guard) guards.current.set(tab.path, guard); else guards.current.delete(tab.path); }} />
      </div>)}
      {path === '/showcase/opportunities' && access === 'allowed' && authorizedPath === path && opportunityNode && <OpportunityDirectoryPage key={`${path}:${refreshKey}`} systemCode={systemCode} allowedActions={opportunityNode.node.allowedActions ?? []} gateway={gateway as EnterpriseGateway} onOpen={openOpportunity} />}
      {opportunityDetailMatch && access === 'allowed' && authorizedPath === path && <OpportunityDetailPage key={`${path}:${refreshKey}`} systemCode={systemCode} opportunityId={opportunityDetailMatch[1]} allowedActions={opportunityNode?.node.allowedActions ?? []} gateway={gateway as EnterpriseGateway} />}
      {path === '/showcase/products' && access === 'allowed' && authorizedPath === path && productNode && <ProductDirectoryPage key={`${path}:${refreshKey}`} systemCode={systemCode} canManage={(productNode.node.allowedActions ?? []).includes('manage')} allowedActions={productNode.node.allowedActions ?? []} gateway={gateway as EnterpriseGateway} onOpen={openProduct} />}
      {productDetailMatch && access === 'allowed' && authorizedPath === path && <ProductDetailPage key={`${path}:${refreshKey}`} systemCode={systemCode} productId={productDetailMatch[1]} allowedActions={productNode?.node.allowedActions ?? []} gateway={gateway as EnterpriseGateway} onBack={() => onNavigate('/showcase/products')} />}
      {inboundDetailMatch && access === 'allowed' && authorizedPath === path && <InboundOrderPage registerGuard={(guard) => { if (guard) guards.current.set(path, guard); else guards.current.delete(path); }} key={`${path}:${refreshKey}`} systemCode={systemCode} orderId={inboundDetailMatch[1]} allowedActions={inboundNode?.node.allowedActions ?? []} gateway={gateway as EnterpriseGateway} />}
      {itemDetailMatch && access === 'allowed' && authorizedPath === path && <ItemDetailPage key={`${path}:${refreshKey}`} systemCode={systemCode} itemId={itemDetailMatch[1]} allowedActions={itemNode?.node.allowedActions ?? []} gateway={gateway as EnterpriseGateway} />}
    </section>
  </main></div>;
}

function MenuNode({ node, path, collapsed, forceOpen, openGroups, flyoutGroup, onToggle, onNavigate }: { node: ShowcaseNavigationNode; path: string; collapsed: boolean; forceOpen: boolean; openGroups: Set<string>; flyoutGroup: string | null; onToggle: (id: string) => void; onNavigate: (path: string) => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (node.routePath) return <button className="showcase-menu-item" type="button" aria-current={node.routePath === path ? 'page' : undefined} aria-label={collapsed ? node.label : undefined} title={collapsed ? node.label : undefined} onClick={() => onNavigate(node.routePath!)}><Icon name={node.iconKey} /><span>{node.label}</span></button>;
  const open = forceOpen || (collapsed ? flyoutGroup === node.id : openGroups.has(node.id));
  return <section className="showcase-menu-group" onBlur={(event) => { if (collapsed && open && !event.currentTarget.contains(event.relatedTarget)) { onToggle(node.id); triggerRef.current?.focus(); } }} onKeyDown={(event) => { if (collapsed && open && event.key === 'Escape') { event.preventDefault(); onToggle(node.id); triggerRef.current?.focus(); } }}><button ref={triggerRef} className="showcase-menu-item" type="button" aria-expanded={open} aria-label={collapsed ? node.label : undefined} title={collapsed ? node.label : undefined} onClick={() => onToggle(node.id)}><Icon name={node.iconKey} /><span>{node.label}</span><i aria-hidden="true"><IconChevronDown size={13} /></i></button>{open && <div className="showcase-menu-children" data-flyout={collapsed || undefined}><strong className="showcase-flyout-title">{node.label}</strong>{node.children?.map((child) => <MenuNode key={child.id} node={child} path={path} collapsed={false} forceOpen={forceOpen} openGroups={openGroups} flyoutGroup={flyoutGroup} onToggle={onToggle} onNavigate={onNavigate} />)}</div>}</section>;
}

function EmptySearch({ onClear }: { onClear: () => void }) { return <div className="showcase-empty-search"><strong>没有可见菜单匹配当前搜索</strong><button type="button" onClick={onClear}>清空搜索</button></div>; }
function filterMenuItems(nodes: ShowcaseNavigationNode[], rawQuery: string): ShowcaseNavigationNode[] { const query = rawQuery.trim().toLocaleLowerCase(); if (!query) return nodes; const result: ShowcaseNavigationNode[] = []; for (const node of nodes) { const children = filterMenuItems(node.children ?? [], query); if (node.label.toLocaleLowerCase().includes(query) || children.length) result.push({ ...node, children }); } return result; }
function findNodeByPath(nodes: ShowcaseNavigationNode[], path: string, parentId?: string): { node: ShowcaseNavigationNode; parentId?: string } | null { for (const node of nodes) { if (node.routePath === path) return { node, parentId }; const child = findNodeByPath(node.children ?? [], path, node.id); if (child) return child; } return null; }
function ToolPanel({ title, lines }: { title: string; lines: string[] }) { return <div className="showcase-tool-panel"><strong>{title}</strong>{lines.map((line) => <p key={line}>{line}</p>)}</div>; }

function PageAdapter({ page, user, systemCode, allowedActions, gateway, registerGuard }: { page: ShowcasePage; user: SessionUser; systemCode: string; allowedActions: string[]; gateway: NavigationGateway; registerGuard?: (guard: LeaveGuard | null) => void }) {
  if (page.rendererKey === 'resource-catalog') return <ResourceCatalogPage account={user.account} systemCode={systemCode} allowedActions={allowedActions} gateway={gateway} />;
  if (page.rendererKey === 'resource-menu') return <ResourceMenuPage systemCode={systemCode} canManage={allowedActions.includes('manage')} canExport={allowedActions.includes('export')} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'customer-directory') return <CustomerDirectoryPage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'dictionary-admin') return <DictionaryAdminPage systemCode={systemCode} canManage={allowedActions.includes('manage')} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'access-roles') return <RoleManagementPage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'style-scene-list') return <StyleSceneListPage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'list-view-admin') return <ListViewAdminPage systemCode={systemCode} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'access-users') return <AccessUsersPage systemCode={systemCode} canManage={allowedActions.includes('manage')} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'access-permissions') return <AccessPermissionsPage systemCode={systemCode} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'organization-units') return <OrganizationUnitsPage systemCode={systemCode} canManage={allowedActions.includes('manage')} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'employee-directory') return <EmployeeDirectoryPage systemCode={systemCode} canManage={allowedActions.includes('manage')} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'item-directory') return <ItemDirectoryPage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'inbound-order-directory') return <InboundOrderPage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'inventory-balance-directory') return <InventoryBalancePage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'legal-entity-admin') return <LegalEntityPage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'system-parameters') return <SystemParametersPage registerGuard={registerGuard} systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'warehouse-admin') return <WarehousePage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.id === 'quotation-directory') { const id = page.path.split('/')[3]?.split('?')[0]; return id ? <QuotationDetailPage registerGuard={registerGuard} key={id} systemCode={systemCode} id={id} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} /> : <QuotationListPage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />; }
  if (page.rendererKey === 'product-directory') return <ProductDirectoryPage systemCode={systemCode} canManage={allowedActions.includes('manage')} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'competitor-directory') return <CompetitorDirectoryPage systemCode={systemCode} canManage={allowedActions.includes('manage')} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'opportunity-stage-admin') return <OpportunityStageAdminPage systemCode={systemCode} canManage={allowedActions.includes('manage')} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'description') return <DescriptionPage page={page} />;
  return <StatePage code="CONFIG" title="页面适配器不可用" detail="本地 Registry 引用了未登记的页面适配器。" />;
}
function PageHeader({ eyebrow, title, summary }: { eyebrow: string; title: string; summary: string }) { return <header className="showcase-page-header"><p>{eyebrow}</p><h1>{title}</h1><span>{summary}</span></header>; }
function DescriptionPage({ page }: { page: ShowcasePage }) { return <div><PageHeader eyebrow="REGISTERED DESCRIPTION" title={page.title} summary={page.summary} /><section className="showcase-panel showcase-description"><span><Icon name={page.iconKey} /></span><h2>互动演示未接入</h2><p>此入口用于验证完整菜单、路由与权限边界；页面交互仍是候选说明。</p><small>来源证据：{page.sourceRefs.join('、')}</small></section></div>; }

function ResourceCatalogPage({ account, systemCode, allowedActions, gateway }: { account: string; systemCode: string; allowedActions: string[]; gateway: NavigationGateway }) {
  const [state, dispatch] = useReducer(reduceResourceAction, initialResourceState);
  const [busy, setBusy] = useState(false);
  const canManage = allowedActions.includes('manage'); const canExport = allowedActions.includes('export');
  const execute = async (action: 'manage' | 'export') => {
    setBusy(true);
    try {
      await gateway.performResourceAction(systemCode, action);
      dispatch({ type: action === 'manage' ? 'maintain' : 'export', permitted: true });
    } catch {
      dispatch({ type: action === 'manage' ? 'maintain' : 'export', permitted: true, fail: true });
    } finally {
      setBusy(false);
    }
  };
  return <div><PageHeader eyebrow="INTERACTIVE SLICE" title="资源目录" summary="操作按钮来自授权响应，具体请求仍由服务端重新鉴权。" /><section className="showcase-panel"><div className="showcase-panel-toolbar"><div><h2>登记资源</h2><p>{!canManage ? `${account} 仅可查看；维护与导出需要相应角色权限。` : `已完成 ${state.exportCount} 次导出演示。`}</p></div><div><button type="button" disabled={!canManage || busy} title={!canManage ? '缺少资源维护权限' : undefined} onClick={() => void execute('manage')}>维护资源</button><button type="button" disabled={!canExport || busy} title={!canExport ? '缺少资源导出权限' : undefined} onClick={() => void execute('export')}>导出清单</button><button type="button" onClick={() => dispatch({ type: 'reset' })}>重置数据</button></div></div><div className="showcase-table-wrap"><table><thead><tr><th>资源编号</th><th>资源名称</th><th>分类</th><th>状态</th></tr></thead><tbody>{state.items.map((item) => <tr key={item.id}><td><code>{item.id}</code></td><td>{item.name}</td><td>{item.category}</td><td><span className="showcase-state-badge">{item.status}</span></td></tr>)}</tbody></table></div><p className="showcase-feedback" role="status" aria-live="polite">{state.feedback}</p></section></div>;
}
function StatePage({ code, title, detail, retryLabel, onRetry }: { code: string; title: string; detail: string; retryLabel?: string; onRetry?: () => void }) { return <div className="showcase-state-page"><span>{code}</span><h1>{title}</h1><p>{detail}</p>{retryLabel && onRetry && <button type="button" onClick={onRetry}>{retryLabel}</button>}</div>; }
