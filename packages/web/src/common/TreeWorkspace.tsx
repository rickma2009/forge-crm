import { useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconPlus, IconSearch } from '@tabler/icons-react';
import { useTreeNodeMenu, type TreeNodeAction } from './useTreeNodeMenu';
import './tree-workspace.css';

export type WorkspaceTreeNode = { id: string; parentId: string | null; label: string; searchText?: string };
export type TreeWorkspaceProps = {
  nodes: WorkspaceTreeNode[]; selectedId?: string | null; onSelect: (id: string) => void;
  title: string; searchLabel?: string; selectLabel?: (node: WorkspaceTreeNode) => string;
  onRefresh: () => void; onCreate?: () => void; createLabel?: string;
  actions?: (node: WorkspaceTreeNode) => TreeNodeAction[];
  rowProps?: (node: WorkspaceTreeNode) => HTMLAttributes<HTMLDivElement>;
  loading?: boolean; children: ReactNode; tools?: ReactNode; className?: string;
  collapseLabel?: string; expandLabel?: string; total?: number;
};

/** Shared UI-TREE-WORKSPACE-01 frame. Authorization and mutations belong to callers. */
export function TreeWorkspace({ nodes, selectedId, onSelect, title, searchLabel = `搜索${title}`, selectLabel = (node) => `选择${title} ${node.label}`, onRefresh, onCreate, createLabel = '新增', actions, rowProps, loading = false, children, tools, className = '', collapseLabel = `收起${title}树`, expandLabel = `展开${title}树`, total = nodes.length }: TreeWorkspaceProps) {
  const [query, setQuery] = useState(''), [closed, setClosed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false), [width, setWidth] = useState(320), [showTools, setShowTools] = useState(false);
  const menu = useTreeNodeMenu(); const tree = useRef<HTMLDivElement>(null);
  const search = query.trim().toLocaleLowerCase();
  const { rows, parents } = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const children = new Map<string | null, WorkspaceTreeNode[]>();
    for (const node of nodes) { const parent = node.parentId && byId.has(node.parentId) ? node.parentId : null; children.set(parent, [...(children.get(parent) ?? []), node]); }
    const matches = new Set<string>();
    if (search) for (const node of nodes) if (`${node.label} ${node.searchText ?? ''}`.toLocaleLowerCase().includes(search)) {
      let current: WorkspaceTreeNode | undefined = node;
      while (current && !matches.has(current.id)) { matches.add(current.id); current = current.parentId ? byId.get(current.parentId) : undefined; }
    }
    const visible: Array<WorkspaceTreeNode & { depth: number; hasChildren: boolean }> = [], seen = new Set<string>();
    const visit = (node: WorkspaceTreeNode, depth: number) => {
      if (seen.has(node.id)) return; seen.add(node.id);
      if (search && !matches.has(node.id)) return;
      const nested = children.get(node.id) ?? [];
      visible.push({ ...node, depth, hasChildren: nested.length > 0 });
      if (search || !closed.has(node.id)) nested.forEach((child) => visit(child, depth + 1));
    };
    (children.get(null) ?? []).forEach((node) => visit(node, 0));
    return { rows: visible, parents: byId };
  }, [nodes, closed, search]);
  const toggle = (id: string) => setClosed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const focusRow = (id?: string | null) => { if (id) tree.current?.querySelectorAll<HTMLElement>('[data-tree-node]').forEach((el) => { if (el.dataset.treeNode === id) el.focus(); }); };
  return <div className={`tree-workspace ${collapsed ? 'is-collapsed' : ''} ${className}`} style={{ '--tree-width': `${width}px` } as CSSProperties}>
    <aside className="tw-panel" aria-label={`${title}面板`}>
      <button className="tw-panel-toggle" type="button" title={collapsed ? expandLabel : collapseLabel} aria-label={collapsed ? expandLabel : collapseLabel} aria-expanded={!collapsed} onClick={() => { menu.close(); setCollapsed(!collapsed); }}>{collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}</button>
      {!collapsed && <><div className="tw-toolbar"><label className="tw-search"><IconSearch size={16} aria-hidden="true" /><input aria-label={searchLabel} placeholder={`${searchLabel}…`} value={query} onChange={(e) => setQuery(e.target.value)} /></label><button className="tw-tools-toggle" type="button" aria-label={`${title}树选项`} aria-expanded={showTools} onClick={() => setShowTools(!showTools)}><IconChevronDown size={16} /></button>{onCreate && <button type="button" className="is-primary tw-create" onClick={onCreate}><IconPlus size={16} />{createLabel}</button>}</div>
        {showTools && <div className="tw-tools"><button type="button" onClick={() => setClosed(new Set())}>全部展开</button><button type="button" onClick={() => { setQuery(''); setClosed(new Set(nodes.map((n) => n.id))); }}>全部收起</button><button type="button" aria-label={`刷新${title}`} onClick={onRefresh}>刷新</button>{tools}</div>}
        <div className="tw-tree" role="tree" aria-label={`${title}树`} aria-busy={loading} ref={tree}>
          {loading && <p className="tw-empty" role="status">加载中…</p>}
          {!loading && rows.map((node, index) => {
            const nodeActions = actions?.(node) ?? [], open = !!search || !closed.has(node.id);
            return <div {...rowProps?.(node)} key={node.id} role="treeitem" data-tree-node={node.id} aria-label={node.label} aria-level={node.depth + 1} aria-selected={node.id === selectedId} aria-expanded={node.hasChildren ? open : undefined} tabIndex={selectedId === node.id || (!rows.some((r) => r.id === selectedId) && index === 0) ? 0 : -1} className={`tw-row${node.id === selectedId ? ' is-selected' : ''}`} style={{ paddingLeft: 6 + node.depth * 16 }} onClick={() => { menu.close(); onSelect(node.id); }} onContextMenu={(e) => menu.open(e, node.label, nodeActions)} onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) e.preventDefault();
              if (e.key === 'ArrowDown') focusRow(rows[Math.min(index + 1, rows.length - 1)]?.id);
              if (e.key === 'ArrowUp') focusRow(rows[Math.max(index - 1, 0)]?.id);
              if (e.key === 'Home') focusRow(rows[0]?.id);
              if (e.key === 'End') focusRow(rows.at(-1)?.id);
              if (e.key === 'ArrowRight' && node.hasChildren) { if (!open) toggle(node.id); else focusRow(rows[index + 1]?.id); }
              if (e.key === 'ArrowLeft') { if (node.hasChildren && open && !search) toggle(node.id); else focusRow(parents.get(node.id)?.parentId); }
              if (e.key === 'Enter' || e.key === ' ') onSelect(node.id);
            }}>
              <button type="button" className="tw-expander" tabIndex={-1} disabled={!node.hasChildren} aria-label={`${open ? '收起' : '展开'} ${node.label}`} onClick={(e) => { e.stopPropagation(); toggle(node.id); }}>{node.hasChildren ? open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} /> : null}</button>
              <button className="tw-node" type="button" tabIndex={-1} aria-label={selectLabel(node)} title={node.label} onClick={(e) => { e.stopPropagation(); menu.close(); onSelect(node.id); }}>{node.label}</button>
              {menu.button(node.label, nodeActions)}
            </div>;
          })}
          {!loading && !rows.length && <p className="tw-empty">{search ? '没有匹配节点' : '暂无节点'}</p>}
        </div><footer className="tw-footer"><span>共 {total} 个节点</span><input type="range" aria-label="面板宽度" min={280} max={440} value={width} onChange={(e) => setWidth(Number(e.target.value))} /></footer></>}
    </aside><div className="tw-detail">{children}</div>{menu.menu}
  </div>;
}
