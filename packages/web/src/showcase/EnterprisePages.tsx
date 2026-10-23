import { DeclarativeDataGrid } from '../common/data-grid/DeclarativeDataGrid';
import { BusinessDataGrid, type GridColumn } from '../common/data-grid/LazyBusinessDataGrid';
import { loadAllGridRows } from '../common/data-grid/grid-export';
import { TreeWorkspace } from '../common/TreeWorkspace';
import { ListViewSelector } from '../common/ListViewSelector';
import { type TreeNodeAction } from '../common/useTreeNodeMenu';
import { RowActionButton } from '../common/RowActionButton';
import { FavoriteToggle } from './Favorites';
import { RecordQueryBar } from '../common/RecordQueryBar';
import React, { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type ExcelJS from 'exceljs';
import type { Customer, CustomerWrite, Dictionary, DictionaryImportRow, DictionaryItem, DictionaryValueWrite, ListViewConfig, ResolvedListView, SalesOption } from '@forge-crm/contracts';
import { GatewayError, type EnterpriseGateway } from './gateway';

const FIELD_LABELS: Record<string, string> = {
  customerCode: '客户编码', customerName: '客户名称', shortName: '客户简称', categoryValue: '客户类别',
  address: '客户地址', statusValue: '当前状态', industryValue: '所属行业', levelValue: '客户等级',
  salesOwnerName: '负责销售', remark: '备注', updatedAt: '更新时间',
};

function notice(error: unknown) { return error instanceof GatewayError ? error.message : '操作失败，请稍后重试'; }

export function CustomerDirectoryPage({ systemCode, allowedActions, gateway, onOpenCustomer, refreshToken = 0 }: { systemCode: string; allowedActions: string[]; gateway: EnterpriseGateway; onOpenCustomer?: (customer: Customer, mode: 'view' | 'edit') => void; refreshToken?: number }) {
  const openCustomer = (customer: Customer, mode: 'view' | 'edit') => { if (onOpenCustomer) onOpenCustomer(customer, mode); else window.location.hash = '#/showcase/customers/' + customer.id; };
  const [views, setViews] = useState<ResolvedListView[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SalesOption[]>([]);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [queryExpanded, setQueryExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewNotice, setViewNotice] = useState('');
  const [editor, setEditor] = useState<Customer | 'new' | null>(null);
  const selected = views.find((view) => view.viewKey === selectedKey);
  const config = selected?.config;

  const loadSetup = async () => {
    setError('');
    try {
      const [resolved, dicts, salesOptions] = await Promise.all([gateway.listViews(systemCode), gateway.dictionaries(systemCode), gateway.salesOptions(systemCode)]);
      setViewNotice(resolved.fallbackNotice ?? ''); setViews(resolved.views); setSelectedKey(resolved.selectedViewKey); setDictionaries(dicts); setSales(salesOptions);
      const selectedView = resolved.views.find((view) => view.viewKey === resolved.selectedViewKey);
      const defaults = Object.fromEntries(Object.entries(selectedView?.config.filters ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? '' : value]));
      setFilters(defaults); setAppliedFilters(defaults);
    } catch (reason) { setViews([]); setSelectedKey(''); setCustomers([]); setTotal(0); setError(notice(reason)); }
  };
  useEffect(() => { void loadSetup(); }, [systemCode]);
  const gridQueryKey = JSON.stringify({ pageSize: config?.pageSize, sort: config?.sort, filters: {} });
  useEffect(() => {
    if (!config) return;
    let active = true; setLoading(true);
    const query = new URLSearchParams({ page: String(page), pageSize: String(config.pageSize), orderBy: config.sort.field, order: config.sort.direction });
    if (appliedKeyword.trim()) query.set('keyword', appliedKeyword.trim());
    for (const [key, value] of Object.entries(appliedFilters)) if (value) query.set(key, value);
    query.set('columnFilters', JSON.stringify({}));
    gateway.customers(systemCode, query).then((result) => { if (active) { const lastPage = Math.max(1, Math.ceil(result.pagination.total / config.pageSize)); if (page > lastPage) { setPage(lastPage); return; } setCustomers(result.items); setTotal(result.pagination.total); } }).catch((reason) => { if (active) { setCustomers([]); setTotal(0); setError(notice(reason)); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [systemCode, gridQueryKey, appliedKeyword, appliedFilters, page, refreshVersion, refreshToken]);

  const dictionary = (code: string) => dictionaries.find((item) => item.dictCode === code)?.items ?? [];
  const valueName = (code: string, value: string | null) => dictionary(code).find((item) => item.itemValue === value)?.itemName ?? value ?? '—';
  const changeGridConfig = (next: ListViewConfig) => {
    if (!config || next.pageSize !== config.pageSize || JSON.stringify(next.sort) !== JSON.stringify(config.sort) || JSON.stringify(next.columnFilters) !== JSON.stringify(config.columnFilters)) setPage(1);
    setViews((current) => current.map((view) => view.viewKey === selectedKey ? { ...view, config: next } : view));
  };
  const dictFields: Record<string, string> = { categoryValue: 'customer_category', statusValue: 'customer_status', industryValue: 'customer_industry', levelValue: 'customer_level' };
  const gridColumns: GridColumn<Customer>[] = Object.keys(FIELD_LABELS).map((key) => ({
    key, label: FIELD_LABELS[key], required: key === 'customerCode', filterType: key === 'updatedAt' ? 'date' : 'text',
    options: dictFields[key] ? dictionary(dictFields[key]).map((item) => ({ value: item.itemValue, label: item.itemName })) : undefined,
    value: (customer) => dictFields[key] ? valueName(dictFields[key], customer[key as keyof Customer] as string | null) : String(customer[key as keyof Customer] ?? ''),
    render: (customer) => key === 'customerCode' ? <button className="customer-code-link" type="button" onClick={() => openCustomer(customer, 'view')}>{customer.customerCode}</button> : renderCustomerValue(customer, key, valueName),
  }));
  const exportAll = () => {
    const params = new URLSearchParams({ orderBy: config!.sort.field, order: config!.sort.direction, columnFilters: JSON.stringify({}) });
    if (appliedKeyword.trim()) params.set('keyword', appliedKeyword.trim());
    for (const [key, value] of Object.entries(appliedFilters)) if (value) params.set(key, value);
    return loadAllGridRows((query) => gateway.customers(systemCode, query), params);
  };
  const queryColumns = config?.columns.filter((column) => column.queryVisible && !['customerCode', 'customerName', 'shortName'].includes(column.key)) ?? [];
  const primaryQueryColumns = queryColumns.filter((column) => !column.queryCollapsed).slice(0, 2);
  const collapsedQueryColumns = queryColumns.filter((column) => !primaryQueryColumns.some((item) => item.key === column.key));
  const changeView = async (key: string) => {
    try {
      await gateway.selectListView(systemCode, key);
      setSelectedKey(key); setPage(1); setViewNotice('');
      const next = views.find((view) => view.viewKey === key);
      const defaults = Object.fromEntries(Object.entries(next?.config.filters ?? {}).map(([field, value]) => [field, Array.isArray(value) ? value[0] ?? '' : value]));
      setKeyword(''); setAppliedKeyword(''); setFilters(defaults); setAppliedFilters(defaults); setQueryExpanded(false);
    } catch (reason) { setError(notice(reason)); }
  };
  const renderFilter = (column: ListViewConfig['columns'][number]) => {
    const filterKey = column.key === 'salesOwnerName' ? 'salesOwnerKey' : column.key;
    return <FilterField key={column.key} field={column.key} value={filters[filterKey] ?? ''} options={column.key === 'salesOwnerName' ? sales.map((item) => ({ value: item.key, label: item.name })) : dictionary(column.key === 'categoryValue' ? 'customer_category' : column.key === 'statusValue' ? 'customer_status' : column.key === 'industryValue' ? 'customer_industry' : 'customer_level').map((item) => ({ value: item.itemValue, label: item.itemName }))} onChange={(value) => setFilters((current) => ({ ...current, [filterKey]: value }))} />;
  };
  const search = () => { setAppliedKeyword(keyword); setAppliedFilters(filters); setPage(1); };
  const reset = () => { setKeyword(''); setFilters({}); setAppliedKeyword(''); setAppliedFilters({}); setPage(1); };

  return <div className="enterprise-page customer-directory"><h1 className="sr-only">客户列表</h1>
    <RecordQueryBar onQuery={search} onReset={reset} expanded={queryExpanded} moreCount={collapsedQueryColumns.length} onToggleMore={collapsedQueryColumns.length ? () => setQueryExpanded((value) => !value) : undefined}>
      <label>客户搜索<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="客户编码 / 名称 / 简称" /></label>{primaryQueryColumns.map(renderFilter)}{queryExpanded && collapsedQueryColumns.map(renderFilter)}
    </RecordQueryBar>
    {error && <div className="enterprise-alert" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    {viewNotice && <p role="status">{viewNotice}</p>}<section className="enterprise-card table-card"><div className="table-toolbar customer-list-toolbar"><button className="is-primary" type="button" disabled={!allowedActions.includes('create')} title={!allowedActions.includes('create') ? '当前角色无新增权限' : undefined} onClick={() => setEditor('new')}>＋ 新增</button><div className="view-controls"><ListViewSelector value={selectedKey} options={views.map((view) => ({ value: view.viewKey, label: `${view.scope === 'USER' ? '个人 · ' : ''}${view.viewName}` }))} settingsDisabled={!selected?.allowPersonalOverride} onChange={(value) => void changeView(value)} onSettings={() => setSettingsOpen(true)} /><span className="record-count">共 <strong>{total}</strong> 条</span><button className="refresh-list" type="button" aria-label="刷新客户列表" title="刷新" onClick={() => setRefreshVersion((value) => value + 1)}><ActionIcon name="reset" /></button></div></div>{config && <BusinessDataGrid enableQuerySettings name="客户列表" columns={gridColumns} config={config} onConfigChange={changeGridConfig} rows={customers} rowKey={(customer) => customer.id} total={total} page={page} onPageChange={setPage} loading={loading} rowActions={(customer) => <>{allowedActions.includes('update') && <RowActionButton label="修改" aria-label={`修改客户 ${customer.customerCode}`} onClick={() => openCustomer(customer, 'edit')} />}<FavoriteToggle targetType="CUSTOMER" targetId={customer.id} label={customer.customerCode} /></>} exportAll={exportAll} viewName={selected?.viewName} settingsOpen={settingsOpen} onSettingsClose={() => setSettingsOpen(false)} onSaveView={selected?.allowPersonalOverride ? async (name, nextConfig) => { await gateway.createPersonalListView(systemCode, { baseViewId: selected.baseViewId, viewName: name, isDefault: true, config: nextConfig }); await loadSetup(); setPage(1); } : undefined} />}</section>

    {editor && <CustomerEditor customer={editor} canEdit={editor === 'new' ? allowedActions.includes('create') : allowedActions.includes('update')} dictionaries={dictionaries} sales={sales} onClose={() => setEditor(null)} onSave={async (input) => { try { const saved = editor === 'new' ? await gateway.createCustomer(systemCode, input) : await gateway.updateCustomer(systemCode, editor.id, { ...input, version: editor.version }); setEditor(null); setPage(1); setRefreshVersion((value) => value + 1); openCustomer(saved, 'view'); } catch (reason) { setError(notice(reason)); } }} />}
  </div>;
}

export function ActionIcon({ name }: { name: 'search' | 'reset' | 'settings' | 'grid' | 'view' | 'edit' }) {
  const paths = { search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>, reset: <><path d="M4 11a8 8 0 1 1 2 5.3" /><path d="M4 5v6h6" /></>, settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7L10.5 2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7L0 10.5v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2.3h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7z" transform="translate(2 0) scale(.82)" /></>, grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>, view: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>, edit: <><path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Z" /><path d="m13.8 7 3.2 3.2" /></> };
  return <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function FilterField({ field, value, options, onChange }: { field: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) { return <label>{FIELD_LABELS[field] ?? field}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="">全部</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>; }
function renderCustomerValue(customer: Customer, key: string, valueName: (code: string, value: string | null) => string) {
  if (key === 'categoryValue') return valueName('customer_category', customer.categoryValue);
  if (key === 'statusValue') return <span className={`status-pill is-${customer.statusValue}`}>{valueName('customer_status', customer.statusValue)}</span>;
  if (key === 'industryValue') return valueName('customer_industry', customer.industryValue);
  if (key === 'levelValue') return valueName('customer_level', customer.levelValue);
  if (key === 'updatedAt') return new Date(customer.updatedAt).toLocaleString('zh-CN', { hour12: false });
  return String(customer[key as keyof Customer] ?? '—');
}

function CustomerEditor({ customer, canEdit, dictionaries, sales, onClose, onSave }: { customer: Customer | 'new'; canEdit: boolean; dictionaries: Dictionary[]; sales: SalesOption[]; onClose: () => void; onSave: (input: CustomerWrite) => Promise<void> }) {
  const dict = (code: string) => dictionaries.find((item) => item.dictCode === code)?.items ?? [];
  const initial: CustomerWrite = customer === 'new' ? { customerName: '', shortName: '', categoryValue: dict('customer_category')[0]?.itemValue ?? '', address: '', statusValue: dict('customer_status')[0]?.itemValue ?? '', industryValue: '', levelValue: '', salesOwnerKey: '', remark: '' } : { customerName: customer.customerName, shortName: customer.shortName, categoryValue: customer.categoryValue, address: customer.address ?? '', statusValue: customer.statusValue, industryValue: customer.industryValue ?? '', levelValue: customer.levelValue ?? '', salesOwnerKey: customer.salesOwnerKey ?? '', remark: customer.remark ?? '' };
  const [form, setForm] = useState(initial); const [saving, setSaving] = useState(false);
  const set = (key: keyof CustomerWrite, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!canEdit) return; setSaving(true); void onSave(form).finally(() => setSaving(false)); };
  return <div className="enterprise-modal-backdrop"><form className="enterprise-modal" role="dialog" aria-modal="true" aria-label="新增客户" onSubmit={submit}><header><div><span>{customer === 'new' ? 'CREATE CUSTOMER' : 'CUSTOMER DETAIL'}</span><h2>{customer === 'new' ? '新增客户' : customer.customerName}</h2></div><button type="button" onClick={onClose}>×</button></header><div className="modal-body form-grid">{customer !== 'new' && <label>客户编码<input value={customer.customerCode} disabled /></label>}<label>客户名称<input required disabled={!canEdit} value={form.customerName} onChange={(e) => set('customerName', e.target.value)} /></label><label>客户简称<input required disabled={!canEdit} value={form.shortName} onChange={(e) => set('shortName', e.target.value)} /></label><Select label="客户类别" value={form.categoryValue} disabled={!canEdit} options={dict('customer_category').map((item) => [item.itemValue, item.itemName])} onChange={(value) => set('categoryValue', value)} /><Select label="当前状态" value={form.statusValue} disabled={!canEdit} options={dict('customer_status').map((item) => [item.itemValue, item.itemName])} onChange={(value) => set('statusValue', value)} /><Select label="所属行业" value={form.industryValue ?? ''} disabled={!canEdit} empty options={dict('customer_industry').map((item) => [item.itemValue, item.itemName])} onChange={(value) => set('industryValue', value)} /><Select label="客户等级" value={form.levelValue ?? ''} disabled={!canEdit} empty options={dict('customer_level').map((item) => [item.itemValue, item.itemName])} onChange={(value) => set('levelValue', value)} /><Select label="负责销售（临时选项源）" value={form.salesOwnerKey ?? ''} disabled={!canEdit} empty options={sales.map((item) => [item.key, item.name])} onChange={(value) => set('salesOwnerKey', value)} /><label className="span-2">客户地址<input disabled={!canEdit} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></label><label className="span-2">备注<textarea disabled={!canEdit} rows={3} value={form.remark ?? ''} onChange={(e) => set('remark', e.target.value)} /></label></div><footer><button type="button" onClick={onClose}>关闭</button>{canEdit && <button className="is-primary" disabled={saving} type="submit">{saving ? '保存中…' : '保存'}</button>}</footer></form></div>;
}
function Select({ label, value, options, empty, disabled, onChange }: { label: string; value: string; options: [string, string][]; empty?: boolean; disabled?: boolean; onChange: (value: string) => void }) { return <label>{label}<select required={!empty} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{empty && <option value="">未选择</option>}{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>; }

export function DictionaryAdminPage({ systemCode, canManage, gateway }: { systemCode: string; canManage: boolean; gateway: EnterpriseGateway }) {
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [items, setItems] = useState<Dictionary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [editor, setEditor] = useState<DictionaryItem | 'new' | null>(null);
  const [typeEditor, setTypeEditor] = useState<Dictionary | 'new' | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState('');
  const load = () => gateway.dictionaries(systemCode, canManage).then((result) => {
    setItems(result);
    setSelectedId((current) => result.some((item) => item.id === current) ? current : result[0]?.id ?? '');
  }).catch((reason) => setError(notice(reason)));
  useEffect(() => { void load(); }, [systemCode, canManage]);
  const selected = items.find((item) => item.id === selectedId);
  const canMaintainSelected = Boolean(canManage && selected?.status === 'ACTIVE' && selected.itemsEditable);
  const toggle = async (item: DictionaryItem) => {
    try {
      await gateway.updateDictionaryItem(systemCode, item.id, { version: item.version, status: item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      await load();
    } catch (reason) { setError(notice(reason)); }
  };
  const toggleDictionary = async (dictionary: Dictionary) => {
    try {
      await gateway.updateDictionary(systemCode, dictionary.id, { version: dictionary.version, status: dictionary.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      await load();
    } catch (reason) { setError(notice(reason)); }
  };
  const nodeActions = (dictionary: Dictionary): TreeNodeAction[] => !canManage ? [] : [
    { key: 'create', label: '新建字典类别', run: () => { setNewParentId(dictionary.parentId); setTypeEditor('new'); } },
    { key: 'child', label: '新增子节点', run: () => { setNewParentId(dictionary.id); setTypeEditor('new'); } },
    { key: 'edit', label: '编辑', run: () => setTypeEditor(dictionary) },
    { key: 'status', label: dictionary.status === 'ACTIVE' ? '停用' : '启用', run: () => void toggleDictionary(dictionary) },
  ];
  return <div className="enterprise-page dictionary-page"><h1 className="sr-only">数据字典</h1>{error && <div className="enterprise-alert" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}<TreeWorkspace title="数据字典" selectLabel={(n) => `选择字典 ${n.label}`} nodes={[...items].sort((a, b) => a.sortNo - b.sortNo || a.dictCode.localeCompare(b.dictCode)).map((d) => ({ id: d.id, parentId: d.parentId, label: d.dictName, searchText: `${d.dictCode} ${d.description ?? ''}` }))} selectedId={selectedId} onSelect={setSelectedId} onRefresh={() => void load()} onCreate={canManage ? () => { setNewParentId(null); setTypeEditor('new'); } : undefined} createLabel="新增字典" actions={(n) => nodeActions(items.find((i) => i.id === n.id)!)}><section className="enterprise-card dictionary-detail">{selected ? <><header className="dictionary-detail-head"><div className="dictionary-detail-title"><span className="dictionary-detail-icon">D</span><div><h2>{selected.dictName}</h2><p><span className={`status-pill ${selected.status === 'ACTIVE' ? '' : 'is-inactive'}`}>● {selected.status === 'ACTIVE' ? '已启用' : '已停用'}</span><span className="dictionary-mode">{selected.itemsEditable ? '可维护字典值' : '初始化固定值'}</span></p></div></div><div className="dictionary-detail-actions">{canManage && <button type="button" onClick={() => setTypeEditor(selected)}>编辑字典类别</button>}{canManage && <button type="button" onClick={() => void toggleDictionary(selected)}>{selected.status === 'ACTIVE' ? '停用字典类别' : '启用字典类别'}</button>}<button type="button" onClick={() => void load()}>刷新</button><button type="button" onClick={() => void exportDictionaryValues(selected).catch((reason) => setError(reason instanceof Error ? reason.message : 'Excel 导出失败'))}>Excel 导出</button>{canManage && <button type="button" disabled={!canMaintainSelected} title={!canMaintainSelected ? '停用或固定字典不能导入' : undefined} onClick={() => setImportOpen(true)}>Excel 导入</button>}{canManage && <button className="is-primary" type="button" disabled={!canMaintainSelected} title={!canMaintainSelected ? '停用或固定字典不能新增' : undefined} onClick={() => setEditor('new')}>＋ 新增字典值</button>}</div></header><dl className="dictionary-meta"><div><dt>数据字典 ID</dt><dd><code>{selected.dictCode}</code></dd></div><div><dt>父级</dt><dd>{items.find((item) => item.id === selected.parentId)?.dictName ?? '—'}</dd></div><div><dt>显示序号</dt><dd>{selected.sortNo}</dd></div><div><dt>当前状态</dt><dd>{selected.status === 'ACTIVE' ? '启用' : '停用'}</dd></div><div className="span-2"><dt>数据字典描述</dt><dd>{selected.description || '—'}</dd></div></dl><div className="dictionary-values-head"><h3>数据字典值 <span>{selected.items.length}</span></h3><small>字典类别由初始化维护，每一级字典均可按自身维护属性设置值。</small></div><div className="enterprise-table-wrap"><DeclarativeDataGrid><thead><tr><th>数据字典值</th><th>数据字典值描述</th><th>当前状态</th><th>显示序号</th>{canMaintainSelected && <th>操作</th>}</tr></thead><tbody>{selected.items.map((item) => <tr key={item.id}><td><code>{item.itemValue}</code></td><td>{item.itemName}</td><td><span className={`status-pill ${item.status === 'ACTIVE' ? '' : 'is-inactive'}`}>{item.status === 'ACTIVE' ? '启用' : '停用'}</span></td><td>{item.sortNo}</td>{canMaintainSelected && <td className="dictionary-row-actions"><RowActionButton type="button" onClick={() => setEditor(item)} label="编辑" /><RowActionButton type="button" onClick={() => void toggle(item)} label={item.status === 'ACTIVE' ? '停用' : '启用'} /></td>}</tr>)}{selected.items.length === 0 && <tr><td className="empty-cell" colSpan={canMaintainSelected ? 5 : 4}>{selected.itemsEditable ? '暂无字典值，可新增或导入' : '该字典值由初始化固定维护'}</td></tr>}</tbody></DeclarativeDataGrid></div><footer className="dictionary-table-footer">共 <strong>{selected.items.length}</strong> 条</footer></> : <div className="dictionary-empty-detail">请从左侧选择数据字典</div>}</section></TreeWorkspace>{typeEditor && <DictionaryTypeModal initialParentId={newParentId} dictionaries={items} editing={typeEditor} onClose={() => setTypeEditor(null)} onSave={async (input) => { try { if (typeEditor === 'new') await gateway.createDictionary(systemCode, input); else await gateway.updateDictionary(systemCode, typeEditor.id, input); setTypeEditor(null); await load(); } catch (reason) { setError(notice(reason)); } }} />}{selected && editor && <DictionaryValueModal dictionary={selected} item={editor} onClose={() => setEditor(null)} onSave={async (input) => { try { if (editor === 'new') await gateway.createDictionaryItem(systemCode, { dictionaryId: selected.id, ...input }); else await gateway.updateDictionaryItem(systemCode, editor.id, { ...input, version: editor.version }); setEditor(null); await load(); } catch (reason) { setError(notice(reason)); } }} />}{selected && importOpen && <DictionaryExcelImportModal dictionary={selected} onClose={() => setImportOpen(false)} onImport={async (rows) => { const result = await gateway.importDictionaryItems(systemCode, selected.id, rows); await load(); return result; }} />}</div>;
}

async function exportDictionaryValues(dictionary: Dictionary): Promise<void> {
  const { default: ExcelJS } = await import('exceljs'); const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('数据字典值');
  sheet.addRow(['数据字典值', '数据字典值描述', '当前状态', '显示序号']);
  dictionary.items.forEach((item) => sheet.addRow([item.itemValue, item.itemName, item.status === 'ACTIVE' ? '启用' : '停用', item.sortNo]));
  sheet.columns = [{ width: 24 }, { width: 28 }, { width: 14 }, { width: 14 }];
  sheet.getRow(1).font = { bold: true };
  const data = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${dictionary.dictName}-${dictionary.dictCode}-字典值.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DictionaryValueModal({ dictionary, item, onClose, onSave }: { dictionary: Dictionary; item: DictionaryItem | 'new'; onClose: () => void; onSave: (input: DictionaryValueWrite) => Promise<void> }) {
  const [itemValue, setItemValue] = useState(item === 'new' ? '' : item.itemValue); const [itemName, setItemName] = useState(item === 'new' ? '' : item.itemName); const [sortNo, setSortNo] = useState(item === 'new' ? (dictionary.items.at(-1)?.sortNo ?? 0) + 10 : item.sortNo); const [status, setStatus] = useState<'ACTIVE' | 'DISABLED'>(item === 'new' ? 'ACTIVE' : item.status); const [saving, setSaving] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); setSaving(true); void onSave({ itemValue: itemValue.trim(), itemName: itemName.trim(), sortNo, status }).finally(() => setSaving(false)); };
  return <div className="enterprise-modal-backdrop"><form className="enterprise-modal dictionary-value-modal" role="dialog" aria-modal="true" aria-labelledby="dictionary-value-title" onSubmit={submit}><header><div><span>{dictionary.dictCode}</span><h2 id="dictionary-value-title">{item === 'new' ? '新增字典值' : '编辑字典值'}</h2><small>所属数据字典：{dictionary.dictName}</small></div><button type="button" aria-label="关闭" onClick={onClose}>×</button></header><div className="modal-body form-grid"><label>数据字典值<input autoFocus required maxLength={128} value={itemValue} onChange={(event) => setItemValue(event.target.value)} /></label><label>显示序号<input required min={0} max={9999} type="number" value={sortNo} onChange={(event) => setSortNo(Number(event.target.value))} /></label><label className="span-2">数据字典值描述<input required maxLength={128} value={itemName} onChange={(event) => setItemName(event.target.value)} /></label><label>当前状态<select value={status} onChange={(event) => setStatus(event.target.value as 'ACTIVE' | 'DISABLED')}><option value="ACTIVE">启用</option><option value="DISABLED">停用</option></select></label></div><footer><button type="button" onClick={onClose}>取消</button><button className="is-primary" disabled={saving} type="submit">{saving ? '保存中…' : '确认保存'}</button></footer></form></div>;
}

function excelText(value: ExcelJS.CellValue): string { if (value === null || value === undefined) return ''; if (typeof value === 'object') { if ('text' in value) return String(value.text); if ('result' in value) return String(value.result ?? ''); if ('richText' in value) return value.richText.map((part) => part.text).join(''); } return String(value); }

function DictionaryTypeModal({ dictionaries, editing, initialParentId, onClose, onSave }: { initialParentId?: string | null; dictionaries: Dictionary[]; editing: Dictionary | 'new'; onClose: () => void; onSave: (input: Record<string, unknown>) => Promise<void> }) {
  const isEdit = editing !== 'new';
  const [dictCode, setDictCode] = useState(isEdit ? editing.dictCode : '');
  const [dictName, setDictName] = useState(isEdit ? editing.dictName : '');
  const [parentId, setParentId] = useState(isEdit ? editing.parentId ?? '' : initialParentId ?? '');
  const [groupCode, setGroupCode] = useState(isEdit ? editing.groupCode ?? '' : '');
  const [sortNo, setSortNo] = useState(isEdit ? editing.sortNo : (dictionaries.at(-1)?.sortNo ?? 0) + 10);
  const [status, setStatus] = useState<'ACTIVE' | 'DISABLED'>(isEdit ? editing.status : 'ACTIVE');
  const [itemsEditable, setItemsEditable] = useState(isEdit ? editing.itemsEditable : true);
  const [description, setDescription] = useState(isEdit ? editing.description ?? '' : '');
  const [saving, setSaving] = useState(false);
  const title = isEdit ? '编辑字典类别' : '新建字典类别';

  const descendants = useMemo(() => {
    if (!isEdit) return new Set<string>();
    const byParent = new Map<string, string[]>();
    for (const item of dictionaries) { const list = byParent.get(item.parentId ?? '') ?? []; list.push(item.id); byParent.set(item.parentId ?? '', list); }
    const set = new Set<string>([editing.id]); const queue = [editing.id];
    while (queue.length) { const current = queue.shift()!; for (const child of byParent.get(current) ?? []) { if (!set.has(child)) { set.add(child); queue.push(child); } } }
    return set;
  }, [dictionaries, editing, isEdit]);
  const parentOptions = dictionaries.filter((item) => !descendants.has(item.id));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!dictName.trim()) return;
    if (!isEdit && !/^[a-z][a-z0-9_]*$/.test(dictCode)) return;
    setSaving(true);
    const payload: Record<string, unknown> = { dictName: dictName.trim(), parentId: parentId || null, groupCode: groupCode.trim() || null, sortNo, status, itemsEditable, description: description.trim() || null };
    if (isEdit) payload.version = editing.version; else payload.dictCode = dictCode.trim();
    void onSave(payload).finally(() => setSaving(false));
  };

  return <div className="enterprise-modal-backdrop"><form className="enterprise-modal dictionary-type-modal" role="dialog" aria-modal="true" aria-labelledby="dictionary-type-title" onSubmit={submit}><header><div><span>{isEdit ? editing.dictCode : 'NEW DICTIONARY'}</span><h2 id="dictionary-type-title">{title}</h2><small>{isEdit ? `编辑「${editing.dictName}」` : '在根节点或指定父级下新建字典类别'}</small></div><button type="button" aria-label="关闭" onClick={onClose}>×</button></header><div className="modal-body form-grid"><label>字典编码<input autoFocus required={!isEdit} disabled={isEdit} value={dictCode} onChange={(event) => setDictCode(event.target.value)} placeholder="小写字母开头，字母数字下划线，如 order_status" /></label><label>字典名称<input required maxLength={128} value={dictName} onChange={(event) => setDictName(event.target.value)} /></label><label>父级类别<select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">（根节点）</option>{parentOptions.map((item) => <option key={item.id} value={item.id}>{item.dictName}</option>)}</select></label><label>分组编码<input maxLength={64} value={groupCode} onChange={(event) => setGroupCode(event.target.value)} placeholder="可选" /></label><label>显示序号<input required min={0} max={9999} type="number" value={sortNo} onChange={(event) => setSortNo(Number(event.target.value))} /></label><label>当前状态<select value={status} onChange={(event) => setStatus(event.target.value as 'ACTIVE' | 'DISABLED')}><option value="ACTIVE">启用</option><option value="DISABLED">停用</option></select></label><label className="checkbox-line"><input type="checkbox" checked={itemsEditable} onChange={(event) => setItemsEditable(event.target.checked)} />允许在 UI 维护字典值（关闭后为初始化固定值）</label><label className="span-2">描述<textarea rows={3} maxLength={512} value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><footer><button type="button" onClick={onClose}>取消</button><button className="is-primary" disabled={saving} type="submit">{saving ? '保存中…' : '确认保存'}</button></footer></form></div>;
}

function DictionaryExcelImportModal({ dictionary, onClose, onImport }: { dictionary: Dictionary; onClose: () => void; onImport: (rows: DictionaryImportRow[]) => Promise<{ imported: number }> }) {
  const fileRef = useRef<HTMLInputElement>(null); const [fileName, setFileName] = useState(''); const [rows, setRows] = useState<DictionaryImportRow[]>([]); const [errors, setErrors] = useState<string[]>([]); const [reading, setReading] = useState(false); const [saving, setSaving] = useState(false); const [result, setResult] = useState('');
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; setReading(true); setErrors([]); setRows([]); setResult(''); setFileName(file.name); try { const { default: ExcelJS } = await import('exceljs'); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer()); const sheet = workbook.worksheets[0]; if (!sheet) throw new Error('工作簿没有工作表'); const headers = new Map<string, number>(); sheet.getRow(1).eachCell((cell, column) => headers.set(excelText(cell.value).trim(), column)); const required = ['数据字典值', '数据字典值描述', '当前状态', '显示序号']; const missing = required.filter((name) => !headers.has(name)); if (missing.length) throw new Error(`缺少列：${missing.join('、')}`); const nextRows: DictionaryImportRow[] = []; const nextErrors: string[] = []; sheet.eachRow((row, rowNumber) => { if (rowNumber === 1) return; const value = excelText(row.getCell(headers.get('数据字典值')!).value).trim(); const name = excelText(row.getCell(headers.get('数据字典值描述')!).value).trim(); const statusText = excelText(row.getCell(headers.get('当前状态')!).value).trim(); const sortText = excelText(row.getCell(headers.get('显示序号')!).value).trim(); if (!value && !name && !statusText && !sortText) return; const status = ['启用', 'ACTIVE', '1'].includes(statusText.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : statusText) ? 'ACTIVE' : ['停用', 'DISABLED', '0'].includes(statusText.toUpperCase() === 'DISABLED' ? 'DISABLED' : statusText) ? 'DISABLED' : null; const sortNo = Number(sortText); if (!value) nextErrors.push(`第 ${rowNumber} 行：数据字典值不能为空`); if (!name) nextErrors.push(`第 ${rowNumber} 行：数据字典值描述不能为空`); if (!status) nextErrors.push(`第 ${rowNumber} 行：当前状态应为启用或停用`); if (!Number.isInteger(sortNo) || sortNo < 0 || sortNo > 9999) nextErrors.push(`第 ${rowNumber} 行：显示序号应为 0-9999 的整数`); if (value && name && status && Number.isInteger(sortNo) && sortNo >= 0 && sortNo <= 9999) nextRows.push({ rowNumber, itemValue: value, itemName: name, status, sortNo }); }); if (!nextRows.length && !nextErrors.length) nextErrors.push('Excel 中没有可导入的数据行'); setRows(nextRows); setErrors(nextErrors); } catch (reason) { setErrors([reason instanceof Error ? reason.message : 'Excel 读取失败']); } finally { setReading(false); } };
  const downloadTemplate = async () => { const { default: ExcelJS } = await import('exceljs'); const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('数据字典值'); sheet.addRow(['数据字典值', '数据字典值描述', '当前状态', '显示序号']); sheet.addRow(['example', '示例值', '启用', 10]); sheet.columns = [{ width: 24 }, { width: 28 }, { width: 14 }, { width: 14 }]; const data = await workbook.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${dictionary.dictCode}-字典值导入模板.xlsx`; anchor.click(); URL.revokeObjectURL(url); };
  const submit = async () => { if (!rows.length || errors.length) return; setSaving(true); try { const imported = await onImport(rows); setResult(`已成功导入 ${imported.imported} 条字典值`); setRows([]); } catch (reason) { setErrors([notice(reason)]); } finally { setSaving(false); } };
  return <div className="enterprise-modal-backdrop"><section className="enterprise-modal dictionary-import-modal" role="dialog" aria-modal="true" aria-labelledby="dictionary-import-title"><header><div><span>{dictionary.dictCode}</span><h2 id="dictionary-import-title">Excel 导入字典值</h2><small>导入采用整批校验；任一行失败均不会写入。</small></div><button type="button" aria-label="关闭" onClick={onClose}>×</button></header><div className="modal-body"><div className="dictionary-import-actions"><input ref={fileRef} hidden type="file" accept=".xlsx,.xls" onChange={(event) => void readFile(event)} /><button type="button" onClick={() => fileRef.current?.click()}>{reading ? '读取中…' : '选择 Excel'}</button><button type="button" onClick={() => void downloadTemplate()}>下载模板</button><span>{fileName || '尚未选择文件'}</span></div>{errors.length > 0 && <div className="dictionary-import-errors"><strong>请修正后重新选择文件</strong>{errors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}</div>}{result && <div className="dictionary-import-success">{result}</div>}{rows.length > 0 && <><p className="dictionary-import-preview">预览前 5 行，共 {rows.length} 条有效数据</p><div className="enterprise-table-wrap"><DeclarativeDataGrid><thead><tr><th>行号</th><th>数据字典值</th><th>描述</th><th>状态</th><th>序号</th></tr></thead><tbody>{rows.slice(0, 5).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.itemValue}</td><td>{row.itemName}</td><td>{row.status === 'ACTIVE' ? '启用' : '停用'}</td><td>{row.sortNo}</td></tr>)}</tbody></DeclarativeDataGrid></div></>}</div><footer><button type="button" onClick={onClose}>关闭</button><button className="is-primary" type="button" disabled={!rows.length || Boolean(errors.length) || saving} onClick={() => void submit()}>{saving ? '导入中…' : `确认导入${rows.length ? `（${rows.length}）` : ''}`}</button></footer></section></div>;
}

export function ListViewAdminPage({ systemCode, gateway }: { systemCode: string; gateway: EnterpriseGateway }) {
  const [views, setViews] = useState<ResolvedListView[]>([]); const [error, setError] = useState('');
  useEffect(() => { gateway.listViews(systemCode).then((result) => setViews(result.views)).catch((reason) => setError(notice(reason))); }, [systemCode]);
  return <div className="enterprise-page"><header className="enterprise-title"><div><span>系统管理 / 页面配置</span><h1>列表视图</h1></div><span className="evidence-badge">角色基线 + 个人派生</span></header>{error && <div className="enterprise-alert">{error}</div>}<section className="enterprise-card view-admin"><div className="table-toolbar"><div><strong>客户列表 · view</strong><small>系统视图按角色分配，个人视图只能从可用基线派生。</small></div></div>{views.map((view) => <article key={view.viewKey}><div><span className={`scope-badge is-${view.scope.toLowerCase()}`}>{view.scope === 'SYSTEM' ? '系统视图' : '个人视图'}</span><strong>{view.viewName}</strong><small>{view.config.columns.filter((item) => item.visible).length} 个显示字段 · 每页 {view.config.pageSize} 条</small></div><div>{view.isDefault && <b>默认</b>}<span>{view.allowPersonalOverride ? '允许个人配置' : '锁定配置'}</span></div></article>)}</section></div>;
}


export { CustomerDetailPage } from './CustomerDetailPage';

export { RoleManagementPage } from './RoleWorkspace';
