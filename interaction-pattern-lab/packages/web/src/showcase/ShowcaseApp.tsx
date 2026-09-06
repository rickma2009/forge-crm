import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from 'react';
import {
  IconBell, IconBox, IconBraces, IconBriefcase, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconComponents, IconDatabase, IconFileDescription, IconFilter, IconForms, IconHistory, IconLayoutDashboard,
  IconLayoutSidebarRight, IconList, IconLoader, IconLogout, IconMail, IconMenu2, IconMessageCircle, IconPalette,
  IconPointer, IconRoute, IconSearch, IconSettings, IconShieldLock, IconSitemap, IconSparkles, IconSpacingVertical,
  IconTable, IconTemplate, IconTypography, IconUser, IconUsers, IconX,
} from '@tabler/icons-react';
import type { NavigationNode, NavigationResponse, SessionUser } from '@interaction-pattern-lab/contracts';
import { initialResourceState, reduceResourceAction } from './domain/resource';
import { parseRootRoute } from './domain/routes';
import { showcaseRegistry } from './registry/registry';
import type { ShowcaseNavigationNode, ShowcasePage } from './registry/types';
import { GatewayError, httpNavigationGateway, type EnterpriseGateway, type NavigationGateway } from './gateway';
import { CustomerDirectoryPage, DictionaryAdminPage, ListViewAdminPage } from './EnterprisePages';
import { SalesOrderScenario } from '../ui-assets/scenarios/sales-order/SalesOrderScenario';
import { BomScenario } from '../ui-assets/scenarios/bom/BomScenario';
import { EnterpriseWorkbenchPrototype } from './EnterpriseWorkbenchPrototype';
import { OverviewPage } from './OverviewPage';
import { FoundationSpecimen } from '../ui-assets/foundation/FoundationSpecimen';
import { isFoundationRouteId } from '../ui-assets/foundation/foundation-manifest';

const systems = [{ code: 'demo-portal', label: '演示门户' }, { code: 'secondary-demo', label: '隔离演示系统' }];

function currentShowcasePath() {
  const route = parseRootRoute(window.location.hash);
  return route.kind === 'showcase' ? route.path : '/showcase/overview';
}

const portalIcons = {
  portal: IconSparkles, overview: IconLayoutDashboard, foundation: IconPalette, palette: IconPalette, text: IconTypography,
  layout: IconSpacingVertical, icons: IconBox, components: IconComponents, action: IconPointer, form: IconForms,
  table: IconTable, feedback: IconMessageCircle, pages: IconTemplate, list: IconList, filter: IconFilter,
  detail: IconFileDescription, split: IconLayoutSidebarRight, workbench: IconBriefcase, interaction: IconRoute,
  state: IconLoader, scenario: IconSitemap, settings: IconSettings, user: IconUser, role: IconUsers,
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
      if (path === '/showcase/login') navigate('/showcase/overview', setPath);
    } catch (reason) { setError(messageFor(reason)); setPhase('login'); }
  };

  const logout = async () => {
    try { await gateway.logout(); } catch { /* local state must still be cleared */ }
    setUser(null); setNavigation(null); setAccount(''); setPassword(''); setError(''); setPhase('login');
    navigate('/showcase/overview', setPath);
  };

  const switchSystem = async (next: string) => {
    setSystemCode(next); setError('');
    navigate('/showcase/overview', setPath);
    await loadNavigation(next);
  };

  if (phase === 'loading') return <StatePage code="LOADING" title="正在加载授权导航" detail="菜单返回前不会显示页面或历史权限数据。" />;
  if (!user || phase === 'login') return <IdentityGate account={account} password={password} systemCode={systemCode} error={error} onAccount={setAccount} onPassword={setPassword} onSystem={setSystemCode} onSubmit={login} />;
  if (phase === 'error' || !navigation) return <SystemFailure error={error} systemCode={systemCode} onSystem={(next) => void switchSystem(next)} onRetry={() => void loadNavigation(systemCode)} onExit={() => void logout()} />;
  return <PortalShell user={user} systemCode={systemCode} navigation={navigation} path={path} gateway={gateway} onSystem={(next) => void switchSystem(next)} onNavigate={(nextPath) => navigate(nextPath, setPath)} onExit={() => void logout()} />;
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
    </form><a href={`${window.location.pathname}${window.location.search}`}>返回交互模式目录</a>
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

function PortalShell({ user, systemCode, navigation, path, gateway, onSystem, onNavigate, onExit }: { user: SessionUser; systemCode: string; navigation: NavigationResponse; path: string; gateway: NavigationGateway; onSystem: (value: string) => void; onNavigate: (path: string) => void; onExit: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(['system']));
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [access, setAccess] = useState<'loading' | 'allowed' | 'forbidden' | 'not-found' | 'error'>('loading');
  const [accessAttempt, setAccessAttempt] = useState(0);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [tabs, setTabs] = useState<{ path: string; title: string }[]>([{ path: '/showcase/overview', title: '概览' }]);
  const [toolPanel, setToolPanel] = useState<'alerts' | 'messages' | 'user' | null>(null);
  const visibleNavigation = useMemo(() => navigation.items.map(toNode), [navigation]);
  const filteredNavigation = useMemo(() => filterMenuItems(visibleNavigation, query), [visibleNavigation, query]);
  const localPage = showcaseRegistry.pages.find((page) => page.path === path);
  const activeNode = findNodeByPath(visibleNavigation, path);

  useEffect(() => {
    let active = true; setAccess('loading');
    gateway.assertPage(systemCode, path).then(() => { if (active) setAccess('allowed'); }).catch((reason) => { if (active) setAccess(reason instanceof GatewayError && reason.status === 403 ? 'forbidden' : reason instanceof GatewayError && reason.status === 404 ? 'not-found' : 'error'); });
    return () => { active = false; };
  }, [gateway, path, systemCode, navigation.permissionVersion, accessAttempt]);

  useEffect(() => { if (activeNode?.parentId) setOpenGroups((current) => current.has(activeNode.parentId!) ? current : new Set(current).add(activeNode.parentId!)); }, [activeNode?.parentId]);
  useEffect(() => { if (localPage && access === 'allowed') setTabs((current) => current.some((tab) => tab.path === path) ? current : [...current, { path, title: localPage.title }]); }, [path, localPage?.id, access]);
  useEffect(() => { if (!searchOpen) return; searchInputRef.current?.focus(); const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSearchOpen(false); searchTriggerRef.current?.focus(); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [searchOpen]);
  const toggleGroup = (id: string) => { if (collapsed) { setFlyoutGroup((current) => current === id ? null : id); return; } setOpenGroups((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };

  return <div className="showcase-shell" data-collapsed={collapsed}><aside className="showcase-rail" aria-label="演示门户导航">
    <div className="showcase-brand"><span className="showcase-brand-mark"><Icon name="portal" /></span><strong>交互资产演示门户</strong><button type="button" onClick={() => { setCollapsed((value) => !value); setFlyoutGroup(null); setSearchOpen(false); }} aria-label={collapsed ? '展开演示门户菜单' : '折叠演示门户菜单'}>{collapsed ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}</button></div>
    <div className="showcase-search">{collapsed ? <button ref={searchTriggerRef} type="button" aria-label="打开菜单搜索" aria-expanded={searchOpen} onClick={() => setSearchOpen((value) => !value)}><Icon name="search" /></button> : <><Icon name="search" /><input type="search" aria-label="搜索菜单" placeholder="搜索菜单..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="清空菜单搜索" onClick={() => setQuery('')}><IconX size={14} /></button>}</>}{collapsed && searchOpen && <div className="showcase-search-flyout"><input ref={searchInputRef} type="search" aria-label="搜索菜单" placeholder="搜索菜单..." value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" aria-label="关闭菜单搜索" onClick={() => { setSearchOpen(false); searchTriggerRef.current?.focus(); }}><IconX size={14} /></button></div>}</div>
    <nav className="showcase-primary-nav" aria-label="演示门户菜单">{filteredNavigation.map((node) => <MenuNode key={node.id} node={node} path={path} collapsed={collapsed} forceOpen={Boolean(query)} openGroups={openGroups} flyoutGroup={flyoutGroup} onToggle={toggleGroup} onNavigate={onNavigate} />)}{query && filteredNavigation.length === 0 && <EmptySearch onClear={() => setQuery('')} />}</nav>
  </aside><main className="showcase-main"><header className="showcase-topbar"><div className="showcase-product-context"><strong>{systems.find((item) => item.code === systemCode)?.label}</strong><span>企业应用工作区</span></div><div className="showcase-session-actions"><select aria-label="切换系统" value={systemCode} onChange={(event) => onSystem(event.target.value)}>{systems.map((system) => <option key={system.code} value={system.code}>{system.label}</option>)}</select><div className="toolbar-popover"><button type="button" aria-label="预警提醒" onClick={() => setToolPanel((value) => value === 'alerts' ? null : 'alerts')}><IconBell size={16} /><i>2</i></button>{toolPanel === 'alerts' && <ToolPanel title="预警提醒" lines={['2 个演示字典项近期有调整', '客户视图配置已启用角色基线']} />}</div><div className="toolbar-popover"><button type="button" aria-label="消息" onClick={() => setToolPanel((value) => value === 'messages' ? null : 'messages')}><IconMail size={16} /><i>3</i></button>{toolPanel === 'messages' && <ToolPanel title="消息中心" lines={['客户主数据演示已初始化', '个人视图可在客户列表保存', '本地数据库连接正常']} />}</div><button type="button" aria-label="退出登录" title="退出登录" onClick={onExit}><IconLogout size={16} /></button><div className="toolbar-popover"><button className="showcase-user-trigger" type="button" title={user.account} onClick={() => setToolPanel((value) => value === 'user' ? null : 'user')}><span>{user.account.slice(0, 1).toUpperCase()}</span><b>{user.account}</b><IconChevronDown size={14} /></button>{toolPanel === 'user' && <div className="showcase-tool-panel user-panel"><strong>{user.displayName}</strong><small>{user.account}</small><button onClick={onExit}>退出登录</button><a href={`${window.location.pathname}${window.location.search}`}>返回模式目录</a></div>}</div></div></header>
    <nav className="showcase-route-tabs" aria-label="已打开页面">{tabs.map((tab) => <button key={tab.path} aria-current={tab.path === path ? 'page' : undefined} onClick={() => onNavigate(tab.path)}><span>{tab.title}</span>{tabs.length > 1 && <i onClick={(event) => { event.stopPropagation(); const next = tabs.filter((item) => item.path !== tab.path); setTabs(next); if (tab.path === path) onNavigate(next.at(-1)?.path ?? '/showcase/overview'); }}><IconX size={13} /></i>}</button>)}</nav>
    <section className="showcase-content">{access === 'loading' && <StatePage code="LOADING" title="正在校验页面权限" detail="校验完成前不显示页面内容。" />}{access === 'forbidden' && <StatePage code="403" title="无权访问" detail="当前账号不能查看此页面。可从左侧选择已授权页面。" />}{access === 'not-found' && <StatePage code="404" title="页面未找到" detail="该地址未登记为演示页面。" />}{access === 'error' && <StatePage code="503" title="权限服务不可用" detail="请稍后重试；系统不会回退为显示全部。" retryLabel="重试页面权限" onRetry={() => setAccessAttempt((value) => value + 1)} />}{access === 'allowed' && localPage && <PageAdapter page={localPage} user={user} systemCode={systemCode} allowedActions={activeNode?.node.allowedActions ?? []} gateway={gateway} />}{access === 'allowed' && !localPage && <StatePage code="CONFIG" title="页面适配器不可用" detail="授权菜单尚未登记对应的本地页面适配器。" />}</section>
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

function PageAdapter({ page, user, systemCode, allowedActions, gateway }: { page: ShowcasePage; user: SessionUser; systemCode: string; allowedActions: string[]; gateway: NavigationGateway }) {
  if (page.rendererKey === 'overview') return <OverviewPage user={user} />;
  if (isFoundationRouteId(page.id)) return <FoundationSpecimen routeId={page.id} />;
  if (page.rendererKey === 'resource-catalog') return <ResourceCatalogPage account={user.account} systemCode={systemCode} allowedActions={allowedActions} gateway={gateway} />;
  if (page.rendererKey === 'customer-directory') return <CustomerDirectoryPage systemCode={systemCode} allowedActions={allowedActions} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'dictionary-admin') return <DictionaryAdminPage systemCode={systemCode} canManage={allowedActions.includes('manage')} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'list-view-admin') return <ListViewAdminPage systemCode={systemCode} gateway={gateway as EnterpriseGateway} />;
  if (page.rendererKey === 'sales-order-prototype') return <SalesOrderScenario />;
  if (page.rendererKey === 'bom-scenario') return <BomScenario />;
  if (page.rendererKey === 'personal-workbench') return <EnterpriseWorkbenchPrototype variant="personal" />;
  if (page.rendererKey === 'master-detail-workbench') return <EnterpriseWorkbenchPrototype variant="master-detail" />;
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
