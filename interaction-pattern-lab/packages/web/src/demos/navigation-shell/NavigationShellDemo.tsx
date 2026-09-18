import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface DemoGroup {
  id: string;
  label: string;
  marker: string;
  children: Array<{ id: string; label: string; marker: string }>;
}

const defaultGroups: DemoGroup[] = [
  {
    id: 'objects',
    label: '对象管理',
    marker: 'O',
    children: [
      { id: 'records', label: '记录列表', marker: 'L' },
      { id: 'categories', label: '分类配置', marker: 'C' },
    ],
  },
  {
    id: 'workflow',
    label: '流程协作',
    marker: 'W',
    children: [
      { id: 'tasks', label: '流程任务', marker: 'T' },
      { id: 'history', label: '流转记录', marker: 'H' },
    ],
  },
  {
    id: 'settings',
    label: '系统设置',
    marker: 'S',
    children: [
      { id: 'fields', label: '字段规则', marker: 'F' },
      { id: 'access', label: '访问策略', marker: 'A' },
    ],
  },
];

export function NavigationShellDemo({ groups = defaultGroups, title = '示例管理系统', activeId, onSelect, children, showOverview = true }: {
  groups?: DemoGroup[];
  title?: string;
  activeId?: string;
  onSelect?: (id: string) => void;
  children?: ReactNode;
  showOverview?: boolean;
} = {}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groups.filter(group => group.children.some(child => child.id === activeId)).map(group => group.id)));
  const [localActiveItem, setLocalActiveItem] = useState('overview');
  const activeItem = activeId ?? localActiveItem;
  const setActiveItem = (id: string) => {
    if (activeId === undefined) setLocalActiveItem(id);
    onSelect?.(id);
  };

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    if (!normalized) return groups;
    return groups.flatMap((group) => {
      const parentMatches = group.label.toLocaleLowerCase('zh-CN').includes(normalized);
      const children = parentMatches
        ? group.children
        : group.children.filter((child) => child.label.toLocaleLowerCase('zh-CN').includes(normalized));
      return children.length ? [{ ...group, children }] : [];
    });
  }, [query, groups]);

  const toggleGroup = (id: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeLabel = activeItem === 'overview'
    ? '工作概览'
    : groups.flatMap((group) => group.children).find((item) => item.id === activeItem)?.label ?? '工作概览';

  return (
    <div className="demo-nav-shell">
      <aside className="demo-nav-rail" aria-label="导航壳层案例侧栏" data-collapsed={collapsed}>
        <div className="demo-nav-brand">
          <span className="demo-nav-brand-mark" aria-hidden="true">IP</span>
          {!collapsed && <strong>{title}</strong>}
          <button
            type="button"
            className="demo-nav-collapse"
            aria-label={collapsed ? '展开案例导航' : '折叠案例导航'}
            title={collapsed ? '展开案例导航' : '折叠案例导航'}
            onClick={() => { setCollapsed((value) => !value); setQuery(''); }}
          >{collapsed ? '›' : '‹'}</button>
        </div>

        {!collapsed && (
          <label className="demo-nav-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="搜索案例菜单"
              placeholder="搜索菜单…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && <button type="button" aria-label="清除案例菜单搜索" onClick={() => setQuery('')}>×</button>}
          </label>
        )}

        <nav className="demo-nav-menu" aria-label="案例菜单">
          {showOverview && <button
            type="button"
            className={`demo-nav-item${activeItem === 'overview' ? ' is-active' : ''}`}
            aria-current={activeItem === 'overview' ? 'page' : undefined}
            aria-label="工作概览"
            title="工作概览"
            onClick={() => setActiveItem('overview')}
          ><span className="demo-nav-marker">D</span>{!collapsed && <span>工作概览</span>}</button>}

          {filteredGroups.map((group) => {
            const open = query.trim() ? true : openGroups.has(group.id);
            return (
              <section className="demo-nav-group" key={group.id}>
                <button
                  type="button"
                  className="demo-nav-item"
                  aria-label={group.label}
                  aria-expanded={open}
                  title={group.label}
                  onClick={() => toggleGroup(group.id)}
                >
                  <span className="demo-nav-marker">{group.marker}</span>
                  {!collapsed && <><span>{group.label}</span><span className={`demo-nav-chevron${open ? ' is-open' : ''}`} aria-hidden="true">›</span></>}
                </button>
                {open && (
                  <div className={`demo-nav-children${collapsed ? ' is-flyout' : ''}`}>
                    {collapsed && <strong>{group.label}</strong>}
                    {group.children.map((child) => (
                      <button
                        type="button"
                        key={child.id}
                        className={`demo-nav-item demo-nav-child${activeItem === child.id ? ' is-active' : ''}`}
                        aria-current={activeItem === child.id ? 'page' : undefined}
                        aria-label={child.label}
                        onClick={() => setActiveItem(child.id)}
                      ><span className="demo-nav-marker">{child.marker}</span><span>{child.label}</span></button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {query.trim() && filteredGroups.length === 0 && <p className="demo-nav-empty">没有匹配的菜单</p>}
        </nav>
      </aside>

      <section className="demo-nav-workspace" aria-label="导航案例内容区">
        <header className="demo-nav-topbar">
          <span>当前案例</span>
          <span className="demo-nav-user"><span aria-hidden="true">样</span> 示例用户</span>
        </header>
        <div className="demo-nav-content">
          {children ?? <>
          <p className="demo-eyebrow">CURRENT DESTINATION</p>
          <h2>{activeLabel}</h2>
          <p>点击侧栏分组和二级入口，观察层级、搜索、折叠与当前项反馈。</p>
          <div className="demo-nav-content-grid" aria-hidden="true">
            <div><span>内容工作面</span><i /></div>
            <div><span>独立滚动区</span><i /></div>
          </div>
          </>}
        </div>
      </section>
    </div>
  );
}
