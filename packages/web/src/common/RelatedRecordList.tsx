import type { ReactNode } from 'react';
import { DeclarativeDataGrid } from './data-grid/DeclarativeDataGrid';

/** Read-only relation projection. Caller owns authorization, querying and navigation. */
export function RelatedRecordList<T extends { id: string }>({ label, columns, rows, page, pageSize, total, loading, error, onRetry, onPageChange, onPageSizeChange }: {
  label: string; columns: { key: string; label: string; render: (row: T) => ReactNode }[]; rows: T[];
  page: number; pageSize: number; total: number; loading: boolean; error: string;
  onRetry: () => void; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  return <section aria-label={label} aria-busy={loading}>
    <div className="table-toolbar"><strong>{label}</strong><button type="button" onClick={onRetry} disabled={loading}>刷新</button></div>
    {error && <div role="alert">{error} <button type="button" onClick={onRetry}>重试</button></div>}
    {loading && <p role="status">正在加载{label}…</p>}
    {!loading && !error && !rows.length && <p>暂无关联{label}</p>}
    <div className="enterprise-table-wrap"><DeclarativeDataGrid aria-label={label} pagination={{ page, pageSize, total, loading, maxPageSize: 100, onPageChange, onPageSizeChange }}>
      <thead><tr><th>序号</th>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>{!loading && !error && rows.map((row, index) => <tr key={row.id}><td>{(page - 1) * pageSize + index + 1}</td>{columns.map(c => <td key={c.key}>{c.render(row)}</td>)}</tr>)}</tbody>
    </DeclarativeDataGrid></div>
  </section>;
}
