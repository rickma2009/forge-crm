import { useEffect, useState } from 'react';
import type { CustomerOverview, CustomerRelatedKind, CustomerRelatedPage, CustomerRelatedRow } from '@forge-crm/contracts';
import { RelatedRecordList } from '../common/RelatedRecordList';
import { customerRelatedApi } from './customer-related-api';
import { GatewayError } from './gateway';

export const relatedLabels: Record<CustomerRelatedKind, string> = { opportunities: '商机', quotations: '报价单', 'sales-orders': '销售订单', 'sales-outbounds': '销售出货' };
const statusLabels: Record<string, string> = { INITIAL: '初始', FOLLOWING: '跟进中', SIGNED: '已签约', LOST: '已丢单', CLOSED: '已关闭', VOID: '已作废', DRAFT: '草稿', SUBMITTED: '已提交审核', APPROVED: '已审核', ACCEPTED: '已接受', REJECTED: '已拒绝', EXPIRED: '已过期', CANCELLED: '已取消', REVERSED: '已冲销', POSTED: '已过账', NOT_SHIPPED: '未出货', PARTIAL: '部分出货', PARTIALLY_SHIPPED: '部分出货', SHIPPED: '全部出货', FULLY_SHIPPED: '全部出货' };
const errorMessage = (e: unknown) => e instanceof GatewayError ? e.message : '加载失败，请重试';
export function CustomerOverviewPanel({ systemCode, customerId, onSelect }: { systemCode: string; customerId: string; onSelect: (kind: CustomerRelatedKind) => void }) {
  const [result, setResult] = useState<CustomerOverview | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setResult(null); setError('');
    customerRelatedApi.overview(systemCode, customerId).then(x => { if (active) setResult(x); }).catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [systemCode, customerId, retry]);
  return <section aria-label="客户业务概览"><div className="customer-child-toolbar"><strong>当前可见业务记录</strong><button type="button" onClick={() => setRetry(x => x + 1)}>刷新概览</button></div>
    {error && <p role="alert">{error}</p>}{!result && !error && <p role="status">正在加载概览…</p>}
    {result && !result.items.length && <p>暂无可访问的关联业务</p>}
    <dl className="customer-overview-counts">{result?.items.map(x => <div key={x.kind}><dt>{relatedLabels[x.kind]}</dt><dd>{x.error ? <span>加载失败，请刷新概览</span> : <button type="button" className="record-detail-link" onClick={() => onSelect(x.kind)}>{x.count} 条</button>}</dd></div>)}</dl>
    <p>按当前权限统计全部状态的记录；金额请在各业务列表按币别查看。</p>
  </section>;
}
export function CustomerRelatedPanel({ systemCode, customerId, kind, onOpen }: { systemCode: string; customerId: string; kind: CustomerRelatedKind; onOpen?: (path: string) => void }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20), [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; data: CustomerRelatedPage | null; error: string }>({ key: '', data: null, error: '' });
  const key = `${systemCode}:${customerId}:${kind}:${page}:${pageSize}:${retry}`;
  useEffect(() => { let active = true; setState({ key, data: null, error: '' });
    customerRelatedApi.list(systemCode, customerId, kind, page, pageSize).then(data => { if (active) setState({ key, data, error: '' }); }).catch(e => { if (active) setState({ key, data: null, error: errorMessage(e) }); });
    return () => { active = false; };
  }, [systemCode, customerId, kind, page, pageSize, key]);
  const current = state.key === key ? state : { data: null, error: '' };
  const link = (row: CustomerRelatedRow) => <a className="record-detail-link" href={`#/showcase/${kind}/${row.id}`} onClick={event => { if (onOpen && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onOpen(`/showcase/${kind}/${row.id}`); } }}>{row.code}</a>;
  const columns = [
    { key: 'code', label: kind === 'opportunities' ? '商机编号' : '单号', render: link },
    { key: 'name', label: kind === 'opportunities' ? '商机名称' : kind === 'quotations' ? '报价说明' : '来源单号', render: (r: CustomerRelatedRow) => r.name || '—' },
    { key: 'status', label: '状态', render: (r: CustomerRelatedRow) => statusLabels[r.status] ?? r.status },
    { key: 'amount', label: kind === 'opportunities' ? '预计金额' : kind === 'sales-orders' ? '折扣后金额' : '金额', render: (r: CustomerRelatedRow) => r.amount ?? '—' },
    { key: 'currency', label: '币别', render: (r: CustomerRelatedRow) => r.currency || '未定义币别' },
    { key: 'date', label: kind === 'opportunities' ? '预计签约日期' : '单据日期', render: (r: CustomerRelatedRow) => r.date?.slice(0, 10) || '—' },
    ...(kind === 'quotations' ? [] : [{ key: 'owner', label: kind === 'sales-outbounds' ? '出货人' : '负责人', render: (r: CustomerRelatedRow) => r.owner || '—' }, { key: 'stage', label: kind === 'opportunities' ? '销售阶段' : kind === 'sales-orders' ? '出货进度' : '出货仓库', render: (r: CustomerRelatedRow) => r.stage ? statusLabels[r.stage] ?? r.stage : '—' }]),
  ];
  return <RelatedRecordList label={relatedLabels[kind]} columns={columns} rows={current.data?.items ?? []} total={current.data?.pagination.total ?? 0} page={page} pageSize={pageSize} loading={!current.data && !current.error} error={current.error} onRetry={() => setRetry(x => x + 1)} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />;
}
