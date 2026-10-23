import type { ReactNode } from 'react';
import './dashboard.css';

export function MetricCard({ title, value, unit, children, note, tone = 'blue' }: { title: string; value: string; unit: string; children: ReactNode; note: string; tone?: 'blue' | 'sky' | 'teal' }) {
  return <article className="dashboard-metric" data-tone={tone}><h2>{title}</h2><div className="dashboard-metric-body"><div className="dashboard-metric-value"><strong className="ipl-type-metric">{value}</strong><span>{unit}</span></div><div className="dashboard-metric-detail">{children}</div></div><footer>{note}</footer></article>;
}
export function DashboardModule({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return <section className="dashboard-module" aria-label={title}><header><h2>{title}</h2>{count !== undefined && <span className="dashboard-module-count">{count}</span>}</header><div className="dashboard-module-body">{children}</div></section>;
}
