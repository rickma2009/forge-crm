import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { IconDots } from '@tabler/icons-react';
import './tree-node-menu.css';

export type TreeNodeAction = { key: string; label: string; run: () => void; danger?: boolean; disabled?: boolean };
type OpenMenu = { x: number; y: number; label: string; actions: TreeNodeAction[]; returnTo: HTMLElement };

/** One instance per tree; both node contextmenu and its trailing button call open. */
export function useTreeNodeMenu() {
  const [current, setCurrent] = useState<OpenMenu | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setCurrent(null);
  const open = (event: MouseEvent<HTMLElement>, label: string, actions: TreeNodeAction[]) => {
    if (!actions.length) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setCurrent({ x: event.clientX || rect.left, y: event.clientY || rect.bottom, label, actions, returnTo: event.currentTarget });
  };
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !current) return;
    const rect = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(current.x, window.innerWidth - rect.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(current.y, window.innerHeight - rect.height - 8))}px`;
    element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [current]);
  useEffect(() => {
    if (!current) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setCurrent(null); };
    const dismiss = () => setCurrent(null);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [current]);
  const button = (label: string, actions: TreeNodeAction[]) => actions.length ? <button
    type="button" className="tree-node-menu-trigger" title={`${label}操作`} aria-label={`${label}操作`}
    aria-haspopup="menu" aria-expanded={current?.label === label} onClick={(event) => open(event, label, actions)}
  ><IconDots size={16} aria-hidden="true" /></button> : null;
  const menu = current ? createPortal(<div ref={ref} role="menu" aria-label={`${current.label}操作菜单`}
    className="tree-node-context-menu" style={{ left: current.x, top: current.y }} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); current.returnTo.focus(); close(); }
      if (event.key === 'Tab') { close(); return; }
      const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index - 1 + buttons.length) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
    }}>
    {current.actions.map((action) => <button type="button" role="menuitem" key={action.key} disabled={action.disabled}
      className={action.danger ? 'is-danger' : undefined} onClick={() => { close(); action.run(); }}>{action.label}</button>)}
  </div>, document.body) : null;
  return { open, button, menu, close };
}
