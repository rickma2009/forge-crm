import { Children, Fragment, isValidElement, useLayoutEffect, useRef, useState, type ReactNode, type ReactElement, type TableHTMLAttributes, type TdHTMLAttributes, type HTMLAttributes } from 'react';
import type { ListViewConfig } from '@forge-crm/contracts';
import type { GridPaginationMode } from './BusinessDataGrid';
import { BusinessDataGrid, type GridColumn } from './LazyBusinessDataGrid';

type Cell = ReactElement<TdHTMLAttributes<HTMLTableCellElement>>;
type Row = { id: string; cells: Cell[]; attributes: HTMLAttributes<HTMLDivElement> };
type ElementProps = { children?: ReactNode; colSpan?: number; className?: string };
/** Empty-state descriptor for a grid body. It is interpreted, never mounted as a table row. */
export function GridEmpty(props: { cols?: number; children?: ReactNode }) { void props; return null; }
function flat(node: ReactNode): ReactElement<ElementProps>[] {
  const result: ReactElement<ElementProps>[] = [];
  Children.forEach(node, (child) => {
    if (!isValidElement<ElementProps>(child)) return;
    if (child.type === Fragment) result.push(...flat(child.props.children)); else result.push(child);
  });
  return result;
}
function elements(node: ReactNode, tag: string): ReactElement<ElementProps>[] {
  return flat(node).flatMap((child) => child.type === tag ? [child] : elements(child.props.children, tag));
}
function text(node: ReactNode): string {
  let value = '';
  Children.forEach(node, (child) => { if (typeof child === 'string' || typeof child === 'number') value += child; else if (isValidElement<ElementProps>(child)) value += text(child.props.children); });
  return value.trim();
}
function controlWidth(node: ReactNode): number {
  return flat(node).reduce((width, child) => {
    const type = child.type;
    if (typeof type !== 'string' && 'label' in child.props) return width + 32;
    // Reserve a stable slot: edits can change a button label without rebuilding the column and losing focus.
    if (type === 'button' || type === 'a') return width + 140;
    return width + controlWidth(child.props.children);
  }, 0);
}
function CellContent({ cell, row, wrap }: { cell?: Cell; row: Row; wrap: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current?.closest('.ag-cell');
    if (!host || !cell) return;
    for (const name of ['aria-label', 'title', 'data-fixed-actions']) {
      const value = (cell.props as Record<string, unknown>)[name];
      if (value !== undefined) host.setAttribute(name, String(value)); else host.removeAttribute(name);
    }
    const rowHost = host.closest('.ag-row');
    if (row.attributes['aria-label']) rowHost?.setAttribute('aria-label', row.attributes['aria-label']);
  });
  return <div ref={ref} className={`bdg-cell-content${wrap ? ' is-wrap' : ''} ${cell?.props.className ?? ''}`} style={cell?.props.style} title={cell?.props.title ?? text(cell?.props.children)}>{cell?.props.children}</div>;
}
function hasMultipleFields(node: ReactNode): boolean {
  return flat(node).some((child) => ['small', 'br', 'p'].includes(String(child.type)) || hasMultipleFields(child.props.children));
}
/**
 * Migration adapter: table-shaped JSX declares headers/cells; all rendering uses BusinessDataGrid.
 * It does not execute child components, fetch data, paginate a server result, or change business events.
 * New data-driven lists should bind typed GridColumn<T> and rows to BusinessDataGrid directly.
 */
export type GridPagination = { loadAllRows?: () => Promise<ReactNode>; page: number; pageSize: number; total: number; loading?: boolean; maxPageSize?: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void };
export function DeclarativeDataGrid({ pagination, paginationMode = 'paged', children, className = '', style, ...attributes }: TableHTMLAttributes<HTMLTableElement> & { pagination?: GridPagination; paginationMode?: GridPaginationMode }) {
  const head = flat(children).find((child) => child.type === 'thead');
  const body = flat(children).find((child) => child.type === 'tbody');
  const foot = flat(children).find((child) => child.type === 'tfoot');
  const sourceHeaders = elements(head?.props.children, 'th') as Cell[];
  const bodyRows = elements(body?.props.children, 'tr');
  const emptyRow = bodyRows.find((row) => flat(row.props.children).some((cell) => (cell.props.colSpan ?? 1) > 1));
  const emptyDescriptor = flat(body?.props.children).find((child) => child.type === GridEmpty);
  const sequenceIndex = sourceHeaders.findIndex((header) => /^(序号|行号)$/.test(text(header.props.children)));
  const actionIndex = sourceHeaders.findIndex((header) => text(header.props.children) === '操作');
  const order = [sequenceIndex < 0 ? -1 : sequenceIndex, ...(actionIndex >= 0 ? [actionIndex] : []), ...sourceHeaders.map((_, index) => index).filter((index) => index !== sequenceIndex && index !== actionIndex)];
  const headers = order.map((index) => index < 0 ? <th key="__sequence">序号</th> : sourceHeaders[index]);
  const convertRows = (bodyRows: ReactElement<ElementProps>[], fromFirstPage = false): Row[] => bodyRows.filter((row) => row !== emptyRow).map((row, index) => {
    const cells = flat(row.props.children) as Cell[];
    return { id: String(row.key ?? index), cells: order.map((sourceIndex) => sourceIndex < 0 ? <td key="__sequence">{(fromFirstPage ? 0 : ((pagination?.page ?? 1) - 1) * (pagination?.pageSize ?? 20)) + index + 1}</td> : cells[sourceIndex]), attributes: row.props as HTMLAttributes<HTMLDivElement> };
  });
  const rows = convertRows(bodyRows, paginationMode === 'all');
  const labels = headers.map((header) => text(header.props.children));
  const name = attributes['aria-label'] ?? '记录列表';
  const [layout, setLayout] = useState<ListViewConfig['columns']>([]);
  const defaults = headers.map((header, index) => {
    const label = labels[index];
    const sample = rows[0]?.cells[index];
    const fixed = sample?.props.style?.position === 'sticky' && sample.props.style.right !== undefined ? 'right' : ['序号', '行号', '操作', '选择', '授权'].includes(label) || !label ? 'left' : null;
    const actionWidth = Math.min(300, Math.max(100, ...rows.map((row) => controlWidth(row.cells[index]?.props.children) + 40)));
    const width = Number(header.props.style?.width) || (label === '操作' ? actionWidth : ['序号', '行号'].includes(label) ? 65 : ['操作', '选择', '授权'].includes(label) || !label ? 100 : /说明|备注|地址|摘要|结果|权限|名称|需求/.test(label) ? 240 : /时间|日期/.test(label) ? 180 : /状态|类型|数量|序号|排序|币别|单位/.test(label) ? 110 : 160);
    return { key: String(header.key ?? (label || '__selection')), width, visible: true, fixed, align: header.props.style?.textAlign === 'right' ? 'right' : header.props.style?.textAlign === 'center' || ['序号', '行号'].includes(label) ? 'center' : 'left', queryVisible: false, queryCollapsed: false } as ListViewConfig['columns'][number];
  });
  const config: ListViewConfig = { columns: defaults.map((column) => layout.find((current) => current.key === column.key) ?? column), filters: {}, pageSize: pagination?.pageSize ?? 20, sort: { field: defaults[0]?.key ?? 'id', direction: 'asc' } };
  if (layout.length) config.columns.sort((a, b) => layout.findIndex((column) => column.key === a.key) - layout.findIndex((column) => column.key === b.key));
  const columns: GridColumn<Row>[] = headers.map((header, index) => {
    const wrap = (header.props as Record<string, unknown>)['data-wrap'] === true || (header.props as Record<string, unknown>)['data-wrap'] === 'true'
      || rows.some((row) => (row.cells[index]?.props as Record<string, unknown> | undefined)?.['data-wrap'] === true || (row.cells[index]?.props as Record<string, unknown> | undefined)?.['data-wrap'] === 'true' || hasMultipleFields(row.cells[index]?.props.children));
    return { key: defaults[index].key, label: labels[index], identity: /编码|代码|编号|单号|工号|账号/.test(labels[index]), minWidth: ['序号', '行号'].includes(labels[index]) ? 45 : 80, headerRender: () => header.props.children, value: (row) => text(row.cells[index]?.props.children), render: (row) => <CellContent cell={row.cells[index]} row={row} wrap={wrap} />, autoHeight: wrap, wrapText: wrap };
  });
  const emptyMessage = text(emptyRow?.props.children ?? emptyDescriptor?.props.children) || '暂无数据';
  // Optional pagination delegates to the shared footer and the server; otherwise retain the outer pager.
  return <div className={`bdg-declarative ${className}`} style={style} data-grid-adapter="declarative"><BusinessDataGrid name={name} columns={columns} config={config} onConfigChange={(next) => { setLayout(next.columns); if (pagination && next.pageSize !== pagination.pageSize) pagination.onPageSizeChange(next.pageSize); }} rows={rows} rowKey={(row) => row.id} total={pagination?.total ?? rows.length} page={pagination?.page ?? 1} onPageChange={pagination?.onPageChange ?? (() => {})} loading={pagination?.loading} maxPageSize={pagination?.maxPageSize} exportAll={async () => rows} paginationMode={paginationMode} loadAllRows={pagination?.loadAllRows ? async () => convertRows(elements(await pagination.loadAllRows!(), 'tr'), true) : undefined} showSequence={false} showPagination={Boolean(pagination)} autoHeight={!pagination} emptyMessage={emptyMessage} rowAttributes={(row) => row.attributes} />{foot && <div className="bdg-summary">{elements(foot.props.children, 'th').map((cell, index) => <strong key={`label-${index}`}>{cell.props.children}</strong>)}{elements(foot.props.children, 'td').map((cell, index) => <span key={index}>{cell.props.children}</span>)}</div>}</div>;
}
