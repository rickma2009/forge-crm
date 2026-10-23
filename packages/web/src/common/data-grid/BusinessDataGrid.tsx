import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type HTMLAttributes } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type IHeaderParams, type ICellRendererParams, type ColumnMovedEvent, type ColumnResizedEvent, type ProcessRowParams } from 'ag-grid-community';
import type { ListViewConfig } from '@forge-crm/contracts';
import { gridExport } from './grid-export';
import './business-data-grid.css';

ModuleRegistry.registerModules([AllCommunityModule]);
const theme = themeQuartz.withParams({ fontFamily: 'inherit', fontSize: 13, rowHeight: 32, headerHeight: 40, accentColor: '#3465ff', borderColor: '#e1e6ef', headerBackgroundColor: '#f7f9fb', columnBorder: true, rowBorder: true, wrapperBorder: false, wrapperBorderRadius: 0 });
export type GridColumn<T> = { key: string; label: string; value: (row: T) => string | number | boolean | null | undefined; render?: (row: T) => ReactNode; options?: { value: string; label: string }[]; filterType?: 'text' | 'date'; sortable?: boolean; filterable?: boolean; required?: boolean; identity?: boolean; headerRender?: () => ReactNode; minWidth?: number; wrapText?: boolean; autoHeight?: boolean };
export type GridPaginationMode = 'paged' | 'all';
type Props<T> = {
  name: string; columns: GridColumn<T>[]; config: ListViewConfig; onConfigChange: (config: ListViewConfig) => void;
  rows: T[]; rowKey: (row: T) => string; total: number; page: number; onPageChange: (page: number) => void; loading?: boolean;
  rowActions?: (row: T) => ReactNode; exportAll: () => Promise<T[]>;
  onSaveView?: (name: string, config: ListViewConfig) => Promise<void>; viewName?: string;
  maxPageSize?: number; showSequence?: boolean; showPagination?: boolean; autoHeight?: boolean; emptyMessage?: string; rowAttributes?: (row: T) => HTMLAttributes<HTMLDivElement>;
  /** All-mode must load the complete authorized, filtered result, never just the current server page. */
  paginationMode?: GridPaginationMode; loadAllRows?: () => Promise<T[]>;
  showColumnSettings?: boolean; enableColumnFilters?: boolean; enableColumnSorting?: boolean; enableExport?: boolean;
  enableQuerySettings?: boolean; settingsOpen?: boolean; onSettingsClose?: () => void;
};
const GridContext = createContext<{ config: ListViewConfig; onConfigChange: Props<unknown>['onConfigChange']; enableColumnFilters: boolean; enableColumnSorting: boolean; renderCell: (row: unknown, key: string) => ReactNode } | null>(null);
export type GridProps<T> = Props<T>;
function Header({ field }: IHeaderParams & { field: GridColumn<unknown> }) {
  const { config, onConfigChange, enableColumnFilters, enableColumnSorting } = useContext(GridContext)!;
  const sorted = config.sort.field === field.key;
  if (field.headerRender) return <div className="bdg-header">{field.headerRender()}</div>;
  return <div className="bdg-header">{enableColumnSorting && field.sortable !== false ? <button type="button" className="bdg-sort" aria-label={`${field.label}排序`} title="点击切换升序、降序" onClick={() => onConfigChange({ ...config, sort: { field: field.key, direction: sorted && config.sort.direction === 'asc' ? 'desc' : 'asc' } })}>{field.label}<span aria-hidden="true">{sorted ? config.sort.direction === 'asc' ? ' ↑' : ' ↓' : ' ↕'}</span></button> : <span className="bdg-title">{field.label}</span>}
    {enableColumnFilters && field.filterable !== false && (field.options ? <select aria-label={`筛选${field.label}`} value={config.columnFilters?.[field.key] ?? ''} onChange={(event) => onConfigChange({ ...config, columnFilters: { ...config.columnFilters, [field.key]: event.target.value } })}><option value="">全部</option>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input type={field.filterType ?? 'text'} aria-label={`筛选${field.label}`} placeholder="筛选…" value={config.columnFilters?.[field.key] ?? ''} onChange={(event) => onConfigChange({ ...config, columnFilters: { ...config.columnFilters, [field.key]: event.target.value } })} />)}
  </div>;
}
function DataCell({ row, columnKey }: { row: unknown; columnKey: string }) {
  return useContext(GridContext)!.renderCell(row, columnKey);
}
export function BusinessDataGrid<T>(props: Props<T>) {
  const { name, columns, config, onConfigChange, rows, rowKey, total, page, onPageChange, loading = false, rowActions, exportAll, onSaveView, showColumnSettings = false, enableColumnFilters = false, enableColumnSorting = false, enableExport = false, maxPageSize = 200, showSequence = true, showPagination = true, autoHeight = false } = props;
  const [settings, setSettings] = useState(false), [exportScope, setExportScope] = useState('all'), [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx'), [exporting, setExporting] = useState(false), [feedback, setFeedback] = useState('');
  const paginationMode = props.paginationMode ?? 'paged';
  const [allRows, setAllRows] = useState<T[] | null>(null);
  const [allError, setAllError] = useState('');
  const [allAttempt, setAllAttempt] = useState(0);
  // Stable content/query key avoids refetches caused only by callers recreating arrays/functions.
  const allQueryKey = JSON.stringify([config.filters, config.columnFilters, config.sort, total, page, rows.map(row => [rowKey(row), ...columns.map(column => column.value(row))])]);
  const latestAllLoader = useRef(props.loadAllRows ?? exportAll);
  latestAllLoader.current = props.loadAllRows ?? exportAll;
  useEffect(() => {
    if (paginationMode !== 'all' || loading) { setAllRows(null); setAllError(''); return; }
    if (rows.length === total) { setAllRows(rows); setAllError(''); return; }
    let active = true;
    setAllRows(null); setAllError('');
    void latestAllLoader.current().then(records => {
      if (!active) return;
      if (records.length !== total || new Set(records.map(rowKey)).size !== records.length) throw new Error('全部记录加载不完整或数据已变化，请刷新后重试');
      setAllRows(records);
    }).catch(reason => { if (active) setAllError(reason instanceof Error ? reason.message : '全部记录加载失败，请重试'); });
    return () => { active = false; };
  }, [paginationMode, loading, allQueryKey, allAttempt]);
  const displayedRows = paginationMode === 'all' && rows.length !== total ? allRows ?? [] : rows;
  const displayedRowsRef = useRef(displayedRows); displayedRowsRef.current = displayedRows;
  const gridLoading = loading || (paginationMode === 'all' && allRows === null && !allError);
  const [pageSizeDraft, setPageSizeDraft] = useState(String(config.pageSize));
  useEffect(() => { setPageSizeDraft(String(config.pageSize)); }, [config.pageSize]);
  const applyPageSize = () => { const size = Number(pageSizeDraft); if (Number.isInteger(size) && size >= 1 && size <= maxPageSize && size !== config.pageSize) onConfigChange({ ...config, pageSize: size }); else setPageSizeDraft(String(config.pageSize)); };
  const current = useRef(props); current.current = props;
  const columnSignature = JSON.stringify(columns.map(({ key, label, options, filterType, sortable, filterable, minWidth, wrapText, autoHeight, identity }) => ({ key, label, options, filterType, sortable, filterable, minWidth, wrapText, autoHeight, identity })));
  const configSignature = JSON.stringify(config.columns);
  const hasActions = !!rowActions;
  const definitions = useMemo<ColDef<T>[]>(() => {
    const defs: ColDef<T>[] = showSequence ? [{ colId: '__sequence', headerName: '序号', pinned: 'left', width: 65, lockPosition: true, suppressMovable: true, resizable: false, valueGetter: (params) => (paginationMode === 'all' ? 0 : (page - 1) * config.pageSize) + (params.node?.rowIndex ?? 0) + 1, cellStyle: { textAlign: 'center' } }] : [];
    if (rowActions) defs.push({ colId: '__actions', headerName: '操作', pinned: 'left', width: 108, lockPosition: true, suppressMovable: true, resizable: false, cellRenderer: (params: ICellRendererParams<T>) => params.data ? current.current.rowActions?.(params.data) : null, cellStyle: { textAlign: 'center' } });
    for (const column of config.columns) {
      const field = columns.find((item) => item.key === column.key); if (!field) continue;
      defs.push({ colId: field.key, headerName: field.label, hide: !column.visible, width: Math.max(field.minWidth ?? (field.required ? 150 : 80), column.width), minWidth: field.minWidth ?? (field.required ? 150 : 80), wrapText: field.wrapText, autoHeight: field.autoHeight, maxWidth: 600, pinned: column.fixed, cellClass: field.identity ? 'bdg-identity-cell' : undefined, cellStyle: { textAlign: column.align ?? 'left' }, tooltipValueGetter: (params) => params.data ? String(current.current.columns.find((col) => col.key === field.key)?.value(params.data) ?? '') : '', valueGetter: (params) => params.data ? current.current.columns.find((col) => col.key === field.key)?.value(params.data) : '', cellRenderer: field.render ? (params: ICellRendererParams<T>) => params.data ? <DataCell row={params.data} columnKey={field.key} /> : null : undefined,
        headerComponent: Header, headerComponentParams: { field: { ...field, headerRender: field.headerRender ? () => current.current.columns.find((col) => col.key === field.key)?.headerRender?.() : undefined } } });
    }
    return defs;
  }, [columnSignature, configSignature, page, config.pageSize, paginationMode, hasActions, showSequence]);
  const decorateRow = (params: ProcessRowParams<T>) => {
    const data = params.node.data; if (!data || !current.current.rowAttributes) return;
    const attributes = current.current.rowAttributes(data);
    if (attributes['aria-label']) params.eRow.setAttribute('aria-label', attributes['aria-label']);
    if (attributes.tabIndex !== undefined) params.eRow.tabIndex = attributes.tabIndex;
    for (const [eventName, handlerName] of [['keydown', 'onKeyDown'], ['click', 'onClick'], ['dblclick', 'onDoubleClick']] as const) {
      params.eRow.addEventListener(eventName, (event) => {
        const latest = displayedRowsRef.current.find((item) => current.current.rowKey(item) === current.current.rowKey(data));
        const handler = latest && current.current.rowAttributes?.(latest)?.[handlerName];
        if (handler) (handler as unknown as (event: Event) => void)(event);
      });
    }
  };
  const layoutChanged = (event: ColumnMovedEvent<T> | ColumnResizedEvent<T>) => {
    if (!event.finished || !['uiColumnMoved', 'uiColumnResized'].includes(event.source)) return;
    const state = event.api.getColumnState();
    const ordered = state.flatMap((col) => { const original = config.columns.find((item) => item.key === col.colId); return original ? [{ ...original, width: Math.min(600, Math.max(80, col.width ?? original.width)), fixed: col.pinned === 'left' || col.pinned === 'right' ? col.pinned : null }] : []; });
    onConfigChange({ ...config, columns: ordered });
  };
  const download = async () => {
    setExporting(true); setFeedback('');
    // Freeze layout and query before awaiting so exports use the user's chosen view.
    const visible = config.columns.filter((col) => col.visible).map((col) => columns.find((field) => field.key === col.key)).filter((col): col is GridColumn<T> => !!col);
    try {
      const records = exportScope === 'all' ? await exportAll() : displayedRows;
      if (new Set(records.map(rowKey)).size !== records.length) throw new Error('导出期间记录发生变化，请重试');
      const blob = await gridExport(format, name, visible.map((col) => col.label), records.map((row) => visible.map((col) => col.value(row))));
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `${name}.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(`已导出 ${records.length} 条记录`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : '导出失败，请重试'); }
    finally { setExporting(false); }
  };
  const pages = Math.max(1, Math.ceil(total / config.pageSize));
  return <GridContext.Provider value={{ config, onConfigChange, enableColumnFilters, enableColumnSorting, renderCell: (row, key) => { const latest = displayedRows.find((item) => rowKey(item) === rowKey(row as T)); return latest === undefined ? null : current.current.columns.find((column) => column.key === key)?.render?.(latest); } }}><div className="business-data-grid">
    {(showColumnSettings || enableColumnFilters || enableExport) && <div className="bdg-toolbar">{showColumnSettings && <button type="button" onClick={() => setSettings(true)}>列设置</button>}{enableColumnFilters && <button type="button" disabled={loading} onClick={() => onConfigChange({ ...config, columnFilters: {} })}>清除列筛选</button>}{enableExport && <><span className="bdg-toolbar-spacer" /><label>导出范围<select aria-label="导出范围" value={exportScope} disabled={exporting} onChange={(event) => setExportScope(event.target.value)}><option value="all">全部筛选结果</option><option value="page">当前页</option></select></label><label>导出格式<select aria-label="导出格式" value={format} disabled={exporting} onChange={(event) => setFormat(event.target.value as 'xlsx' | 'csv')}><option value="xlsx">Excel</option><option value="csv">CSV</option></select></label><button type="button" disabled={exporting || loading || !total} onClick={() => void download()}>{exporting ? '导出中…' : '导出'}</button></>}</div>}
    {allError && <p role="alert" className="bdg-feedback">{allError}<button type="button" onClick={() => setAllAttempt(value => value + 1)}>重试全部记录</button></p>}
    {feedback && <p role="status" className="bdg-feedback">{feedback}</p>}
    <div className={`bdg-grid${autoHeight ? " bdg-grid-auto-height" : ""}`} aria-label={`${name}网格`} aria-busy={gridLoading}><AgGridReact<T> theme={theme} animateRows={false} rowHeight={32} domLayout={autoHeight ? "autoHeight" : "normal"} suppressColumnVirtualisation={autoHeight} processRowPostCreate={decorateRow} getRowClass={(params) => params.data ? current.current.rowAttributes?.(params.data)?.className : undefined} onGridReady={(event) => event.api.setGridAriaProperty("label", name)} headerHeight={enableColumnFilters ? 78 : 40} columnDefs={definitions} rowData={gridLoading ? [] : displayedRows} getRowId={(params) => rowKey(params.data)} defaultColDef={{ resizable: true, sortable: false, filter: false, suppressHeaderMenuButton: true, suppressKeyboardEvent: (params) => !!(params.event.target as HTMLElement)?.closest("input,select,textarea,button,a") }} loading={gridLoading} suppressNoRowsOverlay suppressDragLeaveHidesColumns onColumnMoved={layoutChanged} onColumnResized={layoutChanged} />{!gridLoading && !allError && !displayedRows.length && <p role="status" className="bdg-empty">{props.emptyMessage ?? "没有符合当前条件的记录"}</p>}</div>
    {showPagination && paginationMode === 'paged' && <footer className="pagination bdg-pagination"><span>共 {total} 条 · 第 {page} / {pages} 页</span><label>每页条数<input aria-label="每页条数" type="number" min={1} max={maxPageSize} value={pageSizeDraft} onChange={(event) => setPageSizeDraft(event.target.value)} onBlur={applyPageSize} onKeyDown={(event) => { if (event.key === 'Enter') applyPageSize(); }} /></label><button type="button" disabled={loading || page <= 1} onClick={() => onPageChange(1)}>首页</button><button type="button" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>上一页</button><button type="button" disabled={loading || page >= pages} onClick={() => onPageChange(page + 1)}>下一页</button><button type="button" disabled={loading || page >= pages} onClick={() => onPageChange(pages)}>末页</button></footer>}
    {(settings || props.settingsOpen) && <GridViewSettings columns={columns} enableQuerySettings={props.enableQuerySettings} config={config} viewName={props.viewName} onApply={onConfigChange} onSave={onSaveView} onClose={() => { setSettings(false); props.onSettingsClose?.(); }} />}
  </div></GridContext.Provider>;
}
export function GridViewSettings<T>({ columns, config: initial, viewName, onApply, onSave, onClose, enableQuerySettings = false }: { columns: GridColumn<T>[]; config: ListViewConfig; viewName?: string; enableQuerySettings?: boolean; onApply: (config: ListViewConfig) => void; onSave?: (name: string, config: ListViewConfig) => Promise<void>; onClose: () => void }) {
  const [config, setConfig] = useState(initial), [name, setName] = useState(`${viewName ?? '列表'} - 我的视图`), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dialog = useRef<HTMLFormElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.querySelector<HTMLElement>('input,button')?.focus(); return () => previous?.focus(); }, []);
  const update = (key: string, changes: Partial<ListViewConfig['columns'][number]>) => setConfig((current) => ({ ...current, columns: current.columns.map((col) => col.key === key ? { ...col, ...changes } : col) }));
  const move = (index: number, direction: number) => setConfig((current) => { const next = [...current.columns]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return { ...current, columns: next }; });
  return <div className="enterprise-modal-backdrop"><form ref={dialog} className="enterprise-modal bdg-settings" role="dialog" aria-modal="true" aria-label="网格列与视图设置" onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); } if (event.key === 'Tab') { const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled),select:not(:disabled),button:not(:disabled)') ?? []); const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } } }} onSubmit={(event) => { event.preventDefault(); onApply(config); onClose(); }}><header><h2>列与视图设置</h2><button type="button" aria-label="关闭列设置" disabled={busy} onClick={onClose}>×</button></header><div className="modal-body">{error && <p role="alert">{error}</p>}<fieldset disabled={busy}>{onSave && <label>个人视图名称<input required value={name} maxLength={128} onChange={(event) => setName(event.target.value)} /></label>}<p>可拖动表头调整顺序和列宽；保存个人视图后，下次进入恢复设置。</p>
    {config.columns.map((column, index) => { const label = columns.find((field) => field.key === column.key)?.label ?? column.key; return <div className="bdg-setting-row" key={column.key}><label><input type="checkbox" checked={column.visible} disabled={columns.find((field) => field.key === column.key)?.required} onChange={(event) => update(column.key, { visible: event.target.checked })} />{label}</label><label>列宽<input aria-label={`${label}列宽`} type="number" min={80} max={600} value={column.width} onChange={(event) => { const width = Number(event.target.value); if (width >= 80 && width <= 600) update(column.key, { width }); }} /></label><label>对齐<select aria-label={`${label}对齐`} value={column.align ?? 'left'} onChange={(event) => update(column.key, { align: event.target.value as 'left' | 'center' | 'right' })}><option value="left">居左</option><option value="center">居中</option><option value="right">居右</option></select></label><label>固定<select aria-label={`${label}固定`} value={column.fixed ?? ''} onChange={(event) => update(column.key, { fixed: event.target.value as 'left' | 'right' || null })}><option value="">不固定</option><option value="left">左侧</option><option value="right">右侧</option></select></label><button type="button" aria-label={`上移${label}`} disabled={!index} onClick={() => move(index, -1)}>↑</button><button type="button" aria-label={`下移${label}`} disabled={index === config.columns.length - 1} onClick={() => move(index, 1)}>↓</button></div>; })}{enableQuerySettings && <div className="bdg-query-settings"><h3>顶部查询条件</h3>{config.columns.filter((column) => columns.find((field) => field.key === column.key)?.options).map((column) => <div key={column.key}><label><input type="checkbox" checked={column.queryVisible} onChange={(event) => update(column.key, { queryVisible: event.target.checked })} />{columns.find((field) => field.key === column.key)?.label}显示在查询栏</label><label><input type="checkbox" disabled={!column.queryVisible} checked={column.queryCollapsed} onChange={(event) => update(column.key, { queryCollapsed: event.target.checked })} />放入更多</label></div>)}</div>}</fieldset></div><footer><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="submit" disabled={busy || !config.columns.some((col) => col.visible)}>应用</button>{onSave && <button className="is-primary" type="button" disabled={busy || !name.trim() || !config.columns.some((col) => col.visible)} onClick={() => { setBusy(true); void onSave(name.trim(), config).then(onClose).catch((reason) => setError(reason instanceof Error ? reason.message : '保存失败')).finally(() => setBusy(false)); }}>{busy ? '保存中…' : '保存并使用个人视图'}</button>}</footer></form></div>;
}
