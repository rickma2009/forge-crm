import { useRef, type ReactNode } from 'react';
import './kanban-board.css';
export type KanbanColumn<T> = { id: string; title: string; summary: ReactNode; items: T[]; readOnly?: boolean; more?: boolean; loading?: boolean };
/** Rendering only. The caller owns authorization, pagination and confirmation/transactions. */
export function KanbanBoard<T>({ columns, rowKey, canMove, render, onMove, onMore }: {
  columns: KanbanColumn<T>[]; rowKey: (row: T) => string; canMove: (row: T) => boolean;
  render: (row: T) => ReactNode; onMove: (row: T, columnId: string) => void; onMore: (columnId: string) => void;
}) {
  const dragged = useRef<{ row: T; source: string } | null>(null);
  return <div className="kanban-board" aria-label="阶段看板">{columns.map(column => <section key={column.id} className="kanban-column" aria-label={`${column.title}阶段`} onDragOver={event => { if (!column.readOnly && dragged.current && dragged.current.source !== column.id) event.preventDefault(); }} onDrop={event => {
    event.preventDefault(); const item = dragged.current; dragged.current = null;
    if (item && !column.readOnly && item.source !== column.id && canMove(item.row)) onMove(item.row, column.id);
  }}><header><h2>{column.title}{column.readOnly && <small> · 只读</small>}</h2>{column.summary}</header>
    <div className="kanban-cards">{column.items.map(row => <article className="kanban-card" key={rowKey(row)}>
      {canMove(row) && !column.readOnly && <span className="kanban-drag-handle" draggable aria-hidden="true" title="拖动卡片变更阶段；也可使用变更阶段按钮" onDragStart={event => { dragged.current = { row, source: column.id }; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', rowKey(row)); }} onDragEnd={() => { dragged.current = null; }}>⠿</span>}
      {render(row)}
    </article>)}{!column.items.length && <p className="kanban-empty">暂无商机</p>}
    {column.more && <button type="button" disabled={column.loading} onClick={() => onMore(column.id)}>{column.loading ? '加载中…' : `加载更多 · ${column.title}`}</button>}</div>
  </section>)}</div>;
}
