import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canApplyTabAction, type RouteTab, type TabAction } from './model';
import './route-tabs.css';

const actions: { key: TabAction | 'open-window'; label: string }[] = [
  { key: 'refresh', label: '刷新当前' },
  { key: 'close', label: '关闭当前' },
  { key: 'close-others', label: '关闭其他' },
  { key: 'close-right', label: '关闭右侧' },
  { key: 'close-all', label: '关闭全部' },
  { key: 'open-window', label: '在新窗口打开' },
];

export function RouteTabs({ tabs, activePath, onNavigate, onAction, getHref }: {
  tabs: readonly RouteTab[];
  activePath: string;
  onNavigate: (path: string) => void;
  onAction: (action: TabAction, path: string) => void;
  getHref: (tab: RouteTab) => string;
}) {
  const [menu, setMenu] = useState<{ path: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const target = tabs.find((tab) => tab.path === menu?.path);
  useEffect(() => { setMenu(null); }, [activePath, tabs]);
  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const element = menuRef.current;
    const bounds = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(menu.x, window.innerWidth - bounds.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(menu.y, window.innerHeight - bounds.height - 8))}px`;
    element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
    const dismiss = () => setMenu(null);
    const scroll = (event: Event) => { if (!menuRef.current?.contains(event.target as Node)) dismiss(); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    document.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      document.removeEventListener('scroll', scroll, true);
    };
  }, [menu]);
  return <>
    <nav className="common-route-tabs" aria-label="已打开页面">
      {tabs.map((tab) => <div className="common-route-tab" key={tab.path} data-active={tab.path === activePath || undefined}
        onContextMenu={(event) => {
          event.preventDefault();
          triggerRef.current = event.currentTarget.querySelector('button');
          setMenu({ path: tab.path, x: event.clientX, y: event.clientY });
        }}>
        <button type="button" aria-current={tab.path === activePath ? 'page' : undefined} onClick={() => onNavigate(tab.path)}
          onKeyDown={(event) => {
            if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
              event.preventDefault();
              triggerRef.current = event.currentTarget;
              const rect = event.currentTarget.getBoundingClientRect();
              setMenu({ path: tab.path, x: rect.left, y: rect.bottom });
            }
          }}>{tab.title}</button>
        {tab.closable !== false && <button type="button" className="common-route-tab-close" aria-label={`关闭${tab.title}`} onClick={() => onAction('close', tab.path)}>×</button>}
      </div>)}
    </nav>
    {menu && target && createPortal(<div ref={menuRef} className="common-route-tab-menu" role="menu" aria-label={`${target.title}页签操作`}
      style={{ left: menu.x, top: menu.y }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(null); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); setMenu(null); triggerRef.current?.focus(); }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
          const current = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }
      }}>
      {actions.map((action) => <button type="button" role="menuitem" key={action.key}
        disabled={action.key !== 'open-window' && !canApplyTabAction(tabs, activePath, target.path, action.key)}
        data-divider={action.key === 'close' || action.key === 'open-window' || undefined}
        onClick={() => {
          setMenu(null);
          triggerRef.current?.focus();
          if (action.key === 'open-window') window.open(getHref(target), '_blank', 'noopener,noreferrer');
          else onAction(action.key, target.path);
        }}>{action.key === 'refresh' && <span aria-hidden="true">↻ </span>}{action.label}</button>)}
    </div>, document.body)}
  </>;
}
