import { useId, type ReactNode } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import './detail-workspace.css';

/** UI-DETAIL-01: one object, one surface, consistent header and content tabs. */
export function DetailWorkspace({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`enterprise-page detail-workspace ${className}`}>{children}</div>;
}

/** Shared return control for all page-level back actions. */
export function DetailBackButton({ label, onBack, disabled = false }: { label: string; onBack: () => void; disabled?: boolean }) {
  return <button type="button" className="detail-back" aria-label={label} title={label} disabled={disabled} onClick={onBack}><IconArrowLeft size={16} aria-hidden="true" /></button>;
}

export function DetailHeader({ title, status, fields, actions, onBack, backLabel }: {
  title: ReactNode; status?: ReactNode; fields: { label: string; value: ReactNode }[];
  actions?: ReactNode; onBack: () => void; backLabel: string;
}) {
  return <header className="detail-header">
    <DetailBackButton label={backLabel} onBack={onBack} />
    <div className="detail-identity"><div className="detail-title"><h1>{title}</h1>{status}</div>
      <div className="detail-summary">{fields.map(({ label, value }) => <span key={label}>{label}：{value ?? '—'}</span>)}</div>
    </div>
    {actions && <div className="detail-actions">{actions}</div>}
  </header>;
}

export function DetailTabs<T extends string>({ id, label, tabs, active, onChange }: {
  id: string; label: string; tabs: { id: T; label: ReactNode }[]; active: T; onChange: (id: T) => void;
}) {
  return <div className="detail-tabs" role="tablist" aria-label={label} onKeyDown={(event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !tabs.length) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.findIndex((tab) => tab.id === active) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    onChange(tabs[index].id); event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
  }}>{tabs.map((tab) => <button key={tab.id} id={`${id}-${tab.id}-tab`} type="button" role="tab" tabIndex={active === tab.id ? 0 : -1} aria-selected={active === tab.id} aria-controls={`${id}-${tab.id}-panel`} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>;
}

export function DetailPanel({ id, active, children, className = '' }: { id: string; active: string; children: ReactNode; className?: string }) {
  return <section className={`detail-panel ${className}`} role="tabpanel" id={`${id}-${active}-panel`} aria-labelledby={`${id}-${active}-tab`}>{children}</section>;
}

export function DetailSection({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const id = useId();
  return <section className="detail-section" aria-labelledby={id}><div className="detail-section-heading"><h2 id={id}>{title}</h2>{actions && <div className="detail-actions">{actions}</div>}</div>{children}</section>;
}
