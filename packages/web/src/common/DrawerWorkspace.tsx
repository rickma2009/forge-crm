import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@tabler/icons-react';
import './drawer-workspace.css';
/** Shared right drawer; the caller supplies its unsaved-change guard and business content. */
export function DrawerWorkspace({ title, subtitle, children, footer, onClose }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  const host = useRef<HTMLElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; host.current?.focus(); return () => previous?.focus(); }, []);
  return createPortal(<div className="drawer-workspace-backdrop"><section className="drawer-workspace" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={host} onKeyDown={e => {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    if (e.key === 'Tab') { const nodes = [...(host.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], summary, [tabindex="0"]') ?? [])].filter(n => n.tabIndex >= 0 && n.getClientRects().length); const first = nodes[0], last = nodes.at(-1); if (e.shiftKey && (document.activeElement === first || document.activeElement === host.current)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && (document.activeElement === last || !first)) { e.preventDefault(); first?.focus(); } }
  }}><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" aria-label={`关闭${title}`} onClick={onClose}><IconX size={18} /></button></header><div className="drawer-workspace-body">{children}</div>{footer && <footer>{footer}</footer>}</section></div>, document.body);
}
