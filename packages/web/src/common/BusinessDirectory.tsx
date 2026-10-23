import { DeclarativeDataGrid } from './data-grid/DeclarativeDataGrid';
import { ListViewSelector } from './ListViewSelector';
import { RecordQueryBar } from './RecordQueryBar';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconRefresh, IconPlus, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { businessListObjects, type BusinessListObject, type ListViewConfig, type ResolvedListViews, type ResolvedListView } from '@forge-crm/contracts';

import './business-directory.css';

export interface ListViewGateway {
  listViews(systemCode: string, pageCode?: string): Promise<ResolvedListViews>;
  selectListView(systemCode: string, viewKey: string, pageCode?: string): Promise<void>;
  updatePersonalListView?(systemCode: string, id: string, input: { version: number; viewName: string; isDefault: boolean; config: ListViewConfig }, pageCode?: string): Promise<void>;
  createPersonalListView(systemCode: string, input: { baseViewId: string; viewName: string; isDefault: boolean; config: ListViewConfig }, pageCode?: string): Promise<void>;
}
export type DirectoryExtension = { config: ListViewConfig; query: { keyword: string; status: string }; revision: string; busy: boolean; canSave: boolean; saveConfig: (config: ListViewConfig) => Promise<void>; fallback: (message: string) => void };
type Props<T> = {
  extraToolbar?: (context: DirectoryExtension) => ReactNode;
  alternativeContent?: (context: DirectoryExtension) => ReactNode;
  objectCode: BusinessListObject; systemCode: string; gateway: ListViewGateway;
  loadRows: (system: string, query: URLSearchParams) => Promise<{ items: T[]; pagination: { total: number } }>;
  rowKey: (item: T) => string; render: (item: T, key: string) => ReactNode;
  onAdd?: () => void; addLabel?: string; addDisabledReason?: string; rowActions?: (item: T) => ReactNode;
  refreshToken?: number; fixedFilters?: Record<string, string>; statusOptions?: Record<string, string>; statusQueryKey?: string; statusLabel?: string;
  children?: ReactNode; keywordPlaceholder?: string;
};

/** Object-specific rendering; shared query → toolbar/views → grid/paging behaviour. */
export function BusinessDirectory<T>(props: Props<T>) {
  return <Directory key={`${props.systemCode}:${props.objectCode}`} {...props} />;
}
function Directory<T>({ objectCode, systemCode, gateway, loadRows, rowKey, render, onAdd, addLabel, addDisabledReason, rowActions, refreshToken = 0, fixedFilters = {}, statusOptions, statusQueryKey = 'status', statusLabel = '状态', children, keywordPlaceholder, extraToolbar, alternativeContent }: Props<T>) {
  const object = businessListObjects[objectCode];
  const [resolved, setResolved] = useState<ResolvedListViews | null>(null);
  const [viewError, setViewError] = useState(''), [dataError, setDataError] = useState('');
  const [viewBusy, setViewBusy] = useState(false), [loading, setLoading] = useState(false), [settings, setSettings] = useState(false);
  const [form, setForm] = useState({ keyword: '', status: '' }), [query, setQuery] = useState(form);
  const [page, setPage] = useState(1), [tick, setTick] = useState(0);
  const [items, setItems] = useState<T[]>([]), [total, setTotal] = useState(0);
  const request = useRef(0);
  const selected = resolved?.views.find((view) => view.viewKey === resolved.selectedViewKey);
  const config = selected?.config;
  const scopeQuery = JSON.stringify(fixedFilters);
  const loadViews = useCallback(async () => {
    const version = ++request.current; setViewBusy(true); setViewError('');
    try {
      const next = await gateway.listViews(systemCode, objectCode);
      if (version === request.current) {
        if (next.pageCode !== objectCode || !next.views.some((view) => view.viewKey === next.selectedViewKey)) throw new Error('列表视图配置不匹配');
        setResolved(next); setPage(1);
      }
    } catch (error) { if (version === request.current) { setResolved(null); setViewError(message(error)); } }
    finally { if (version === request.current) setViewBusy(false); }
  }, [gateway, systemCode, objectCode]);
  useEffect(() => { void loadViews(); return () => { request.current++; }; }, [loadViews]);
  useEffect(() => {
    if (!config || (alternativeContent && config.viewMode === 'KANBAN')) { setItems([]); setTotal(0); return; }
    let alive = true; setLoading(true); setDataError('');
    const params = new URLSearchParams({ page: String(page), pageSize: String(config.pageSize) });
    if (query.keyword) params.set('keyword', query.keyword);
    if (query.status) params.set(statusQueryKey, query.status);
    // Context scope (e.g. opportunity quotes) cannot be removed by a personal view.
    for (const [key, value] of Object.entries(JSON.parse(scopeQuery) as Record<string, string>)) if (value) params.set(key, value);
    void loadRows(systemCode, params).then((result) => {
      if (!alive) return;
      const lastPage = Math.max(1, Math.ceil(result.pagination.total / config.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setItems(result.items); setTotal(result.pagination.total);
    }).catch((error) => { if (alive) { setItems([]); setTotal(0); setDataError(message(error)); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [config, systemCode, page, tick, refreshToken, query, scopeQuery, loadRows, statusQueryKey]);
  const changeView = async (key: string) => {
    if (viewBusy) return; setViewBusy(true); setViewError('');
    try { await gateway.selectListView(systemCode, key, objectCode); setResolved((current) => current ? { ...current, selectedViewKey: key, fallbackNotice: undefined } : current); setPage(1); }
    catch (error) { setViewError(message(error)); }
    finally { setViewBusy(false); }
  };
  const saveConfig = async (next: ListViewConfig) => {
    if (!selected?.allowPersonalOverride || viewBusy) return;
    setViewBusy(true); setViewError('');
    try {
      if (selected.scope === 'USER' && gateway.updatePersonalListView) await gateway.updatePersonalListView(systemCode, selected.id, { version: selected.version, viewName: selected.viewName, isDefault: selected.isDefault, config: next }, objectCode);
      else await gateway.createPersonalListView(systemCode, { baseViewId: selected.baseViewId, viewName: `${object.name} - 我的视图`, isDefault: true, config: next }, objectCode);
      await loadViews();
    } catch (error) { setViewError(message(error)); throw error; }
    finally { setViewBusy(false); }
  };
  const extension = config ? { config, query, revision: `${tick}:${refreshToken}`, busy: viewBusy, canSave: !!selected?.allowPersonalOverride, saveConfig,
    fallback: (notice: string) => { setViewError(notice); setResolved(current => current ? { ...current, views: current.views.map(view => view.viewKey === current.selectedViewKey ? { ...view, config: { ...view.config, viewMode: 'TABLE' } } : view) } : current); },
  } satisfies DirectoryExtension : null;
  const alternative = extension && alternativeContent?.(extension);
  const columns = config?.columns.filter((column) => column.visible) ?? [];
  return <div className="enterprise-page business-directory"><h1 className="sr-only">{object.name}列表</h1>
    <RecordQueryBar queryDisabled={!config || viewBusy} onQuery={() => { setQuery({ ...form, keyword: form.keyword.trim() }); setPage(1); setTick((value) => value + 1); }} onReset={() => { const empty = { keyword: '', status: '' }; setForm(empty); setQuery(empty); setPage(1); }}>
      <label className="keyword-field">{object.name}搜索<input value={form.keyword} placeholder={keywordPlaceholder ?? '编码 / 名称'} onChange={(event) => setForm({ ...form, keyword: event.target.value })} /></label>
      {statusOptions && <label>{statusLabel}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="">全部</option>{Object.entries(statusOptions).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>}
    </RecordQueryBar>
    {viewError && <div className="enterprise-alert" role="alert">{viewError}<button type="button" onClick={() => void loadViews()}>重试视图加载</button></div>}
    {dataError && <div className="enterprise-alert" role="alert">{dataError}<button type="button" onClick={() => setTick((value) => value + 1)}>重试</button></div>}
    {resolved?.fallbackNotice && <p role="status">{resolved.fallbackNotice}</p>}
    <section className="enterprise-card table-card"><div className="table-toolbar customer-list-toolbar">
      <div>{onAdd && <button type="button" className="is-primary" disabled={!!addDisabledReason} title={addDisabledReason} onClick={onAdd}><IconPlus size={16} />{addLabel ?? `新增${object.name}`}</button>}</div>
      <div className="view-controls">{extension && extraToolbar?.(extension)}<ListViewSelector value={resolved?.selectedViewKey ?? ''} options={resolved?.views.map((view) => ({ value: view.viewKey, label: `${view.scope === 'USER' ? '个人 · ' : '系统 · '}${view.viewName}` })) ?? []} disabled={viewBusy || !resolved} settingsDisabled={!selected?.allowPersonalOverride} emptyLabel={viewBusy ? '加载视图…' : '无可用视图'} onChange={(value) => void changeView(value)} onSettings={() => setSettings(true)} />
        {!alternative && <span className="record-count">共 <strong>{total}</strong> 条</span>}<button type="button" className="refresh-list" title="刷新" aria-label={`刷新${object.name}列表`} disabled={!config || loading} onClick={() => setTick((value) => value + 1)}><IconRefresh size={16} /></button>
      </div></div>
      {alternative || (config && <><div className="enterprise-table-wrap" aria-busy={loading}><DeclarativeDataGrid><thead><tr><th className="sequence-column">序号</th>{rowActions && <th className="operation-column">操作</th>}{columns.map((column) => <th key={column.key} style={{ width: column.width }}>{(object.fields as Record<string, string>)[column.key]}</th>)}</tr></thead>
        <tbody>{!loading && items.map((item, index) => <tr key={rowKey(item)}><td>{(page - 1) * config.pageSize + index + 1}</td>{rowActions && <td className="operation-column">{rowActions(item)}</td>}{columns.map((column) => <td key={column.key}>{render(item, column.key)}</td>)}</tr>)}
          {(loading || !items.length) && <tr><td className="empty-cell" colSpan={columns.length + 1 + (rowActions ? 1 : 0)}>{loading ? '正在加载…' : '暂无符合条件的记录'}</td></tr>}</tbody></DeclarativeDataGrid></div>
        <footer className="pagination"><span>第 {page} / {Math.max(1, Math.ceil(total / config.pageSize))} 页 · 每页 {config.pageSize} 条</span><button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={loading || page * config.pageSize >= total} onClick={() => setPage(page + 1)}>下一页</button></footer></>)}
    </section>
    {settings && selected && <BusinessViewSettings view={selected} objectCode={objectCode} onClose={() => setSettings(false)} onSave={async (viewName, nextConfig) => {
      await gateway.createPersonalListView(systemCode, { baseViewId: selected.baseViewId, viewName, isDefault: true, config: nextConfig }, objectCode);
      setSettings(false); await loadViews();
    }} />}{children}
  </div>;
}
function message(error: unknown) { return error instanceof Error ? error.message : '操作失败，请重试'; }

export function BusinessViewSettings({ view, objectCode, onClose, onSave }: { view: ResolvedListView; objectCode: BusinessListObject; onClose: () => void; onSave: (name: string, config: ListViewConfig) => Promise<void> }) {
  const object = businessListObjects[objectCode];
  const [name, setName] = useState(`${object.name} - 我的视图`), [config, setConfig] = useState(view.config);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dialog = useRef<HTMLFormElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.querySelector<HTMLInputElement>('input')?.focus(); return () => previous?.focus(); }, []);
  const move = (index: number, delta: number) => setConfig((current) => { const columns = [...current.columns]; [columns[index], columns[index + delta]] = [columns[index + delta], columns[index]]; return { ...current, columns }; });
  return <div className="enterprise-modal-backdrop"><form ref={dialog} className="enterprise-modal view-modal" role="dialog" aria-modal="true" aria-label="列与视图设置" onKeyDown={(event) => {
    if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') { const buttons = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)') ?? []); const first = buttons[0], last = buttons.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
  }} onSubmit={(event) => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); void onSave(name.trim(), { ...config, ...(config.kanban ? { kanban: { ...config.kanban, cardFields: config.kanban.cardFields.filter(key => config.columns.some(c => c.key === key && c.visible)) } } : {}) }).catch((reason) => setError(message(reason))).finally(() => setBusy(false)); }}>
    <header><div><h2>列与视图设置</h2><small>{object.name} · 保存后使用此个人视图，下次进入自动恢复</small></div><button type="button" aria-label="关闭视图设置" disabled={busy} onClick={onClose}>×</button></header>
    <div className="modal-body">{error && <p role="alert" className="enterprise-alert">{error}</p>}<fieldset disabled={busy}>
      <label>个人视图名称<input required maxLength={128} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>每页条数<select value={config.pageSize} onChange={(event) => setConfig({ ...config, pageSize: Number(event.target.value) as ListViewConfig['pageSize'] })}>{[10, 20, 50, 100].map((size) => <option value={size} key={size}>{size}</option>)}</select></label>
      {objectCode === 'opportunity-directory' && config.kanban && <fieldset><legend>看板卡片字段</legend>{(['opportunityName', 'customerName', 'expectedAmount', 'ownerName', 'confidence', 'expectedSignDate'] as const).filter(key => config.columns.some(c => c.key === key && c.visible)).map(key => <label key={key}><input type="checkbox" checked={config.kanban!.cardFields.includes(key)} onChange={e => setConfig({ ...config, kanban: { ...config.kanban!, cardFields: e.target.checked ? [...config.kanban!.cardFields, key] : config.kanban!.cardFields.filter(x => x !== key) } })} />{(object.fields as Record<string,string>)[key]}</label>)}</fieldset>}
      <p>调整列显示、顺序及宽度。记录标识保留用于查看详情；查询条件在列表上方设置，列表按更新时间倒序。</p>
      <div className="business-view-columns">{config.columns.map((column, index) => <div key={column.key}>
        <label><input type="checkbox" checked={column.visible} disabled={column.key === object.identity} onChange={(event) => setConfig({ ...config, columns: config.columns.map((item) => item.key === column.key ? { ...item, visible: event.target.checked } : item) })} />{(object.fields as Record<string, string>)[column.key]}</label>
        <input type="number" min={80} max={600} aria-label={`${(object.fields as Record<string, string>)[column.key]}列宽`} value={column.width} onChange={(event) => setConfig({ ...config, columns: config.columns.map((item) => item.key === column.key ? { ...item, width: Number(event.target.value) } : item) })} />
        <button type="button" aria-label={`上移${(object.fields as Record<string, string>)[column.key]}`} disabled={index === 0} onClick={() => move(index, -1)}><IconArrowUp size={16} /></button><button type="button" aria-label={`下移${(object.fields as Record<string, string>)[column.key]}`} disabled={index === config.columns.length - 1} onClick={() => move(index, 1)}><IconArrowDown size={16} /></button>
      </div>)}</div></fieldset></div>
    <footer><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="submit" className="is-primary" disabled={busy || !name.trim()} aria-busy={busy}>{busy ? '保存中…' : '保存并使用个人视图'}</button></footer>
  </form></div>;
}
