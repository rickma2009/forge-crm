import type { ReactNode } from 'react';
import { IconChevronDown, IconChevronUp, IconRefresh, IconSearch } from '@tabler/icons-react';
import './record-query-bar.css';

export function RecordQueryBar({ children, onQuery, onReset, expanded, onToggleMore, moreCount, queryDisabled = false, layout = 'default' }: {
  children: ReactNode;
  onQuery: () => void;
  onReset: () => void;
  expanded?: boolean;
  onToggleMore?: () => void;
  moreCount?: number;
  queryDisabled?: boolean;
  layout?: 'default' | 'singleRow';
}) {
  return <form className={`enterprise-card record-query-bar${layout === 'singleRow' ? ' record-query-bar--single-row' : ''}`} aria-label="查询条件" onSubmit={(event) => { event.preventDefault(); if (!queryDisabled) onQuery(); }}>
    <div className="record-query-fields">{children}</div>
    <div className="record-query-actions">
      <button type="button" onClick={onReset}><IconRefresh size={16} />重置</button>
      <button className="is-primary" type="submit" disabled={queryDisabled}><IconSearch size={16} />查询</button>
      {onToggleMore && <button className="record-query-more" type="button" aria-expanded={expanded} onClick={onToggleMore}>更多{moreCount ? `（${moreCount}）` : ''}{expanded ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}</button>}
    </div>
  </form>;
}
