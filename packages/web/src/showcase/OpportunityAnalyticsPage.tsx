import { useEffect, useMemo, useState } from 'react';
import { opportunityAnalyticsSchema, opportunityAnalyticsRecordsSchema, opportunityBusinessStatusLabels, type OpportunityAnalytics, type OpportunityAnalyticsQuery, type OpportunityAnalyticsRecords, type ListViewConfig } from '@forge-crm/contracts';
import { call } from './gateway';
import { RecordQueryBar } from '../common/RecordQueryBar';
import { DetailTabs, DetailPanel } from '../common/DetailWorkspace';
import { BusinessDataGrid, type GridColumn } from '../common/data-grid/LazyBusinessDataGrid';
import { SalesFunnel } from '../common/analytics/SalesFunnel';
import './opportunity-analytics.css';
export function analysisAmount(value: string | null) { return value === null ? '—' : new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) / 10000); }
function params(query: OpportunityAnalyticsQuery) { return new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))); }
function defaults(): OpportunityAnalyticsQuery {
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
  const first = new Date(`${month}-01T00:00:00Z`), last = new Date(first); last.setUTCMonth(last.getUTCMonth() + 6); last.setUTCDate(0);
  return { dateFrom: first.toISOString().slice(0, 10), dateTo: last.toISOString().slice(0, 10) };
}
function config(columns: { key: string; label: string }[], numeric = new Set<string>()): ListViewConfig {
  return { columns: columns.map((col, index) => ({ key: col.key, visible: true, queryVisible: false, queryCollapsed: false, width: col.key === 'probability' ? 100 : numeric.has(col.key) ? 135 : 200, align: col.key === 'probability' ? 'center' as const : numeric.has(col.key) ? 'right' as const : 'left' as const, fixed: index === 0 ? 'left' as const : null })), filters: {}, pageSize: 20, sort: { field: columns[0]?.key ?? 'id', direction: 'asc' } };
}
type HoldingRow = { id: string; name: string; probability: number | null; amounts: string[]; summary?: boolean };
type RecordRow = OpportunityAnalyticsRecords['items'][number];
export function OpportunityAnalyticsPage({ systemCode, onNavigate }: { systemCode: string; onNavigate: (path: string) => void }) {
  const [tab, setTab] = useState<'funnel' | 'holding'>('funnel');
  const [draft, setDraft] = useState<OpportunityAnalyticsQuery>(defaults);
  const [applied, setApplied] = useState<OpportunityAnalyticsQuery>(defaults);
  const [data, setData] = useState<OpportunityAnalytics | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [records, setRecords] = useState<OpportunityAnalyticsRecords | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false), [recordError, setRecordError] = useState(''), [recordAttempt, setRecordAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const recordColumns = useMemo<GridColumn<RecordRow>[]>(() => [
    { key: 'code', label: '商机编码', value: row => row.code, render: row => <button type="button" className="text-link record-detail-link" onClick={() => onNavigate(`/showcase/opportunities/${row.id}`)}>{row.code}</button> },
    { key: 'name', label: '商机名称', value: row => row.name }, { key: 'customer', label: '客户', value: row => row.customer },
    { key: 'owner', label: '负责人', value: row => row.owner }, { key: 'stage', label: '商机阶段', value: row => row.stage },
    { key: 'businessStatus', label: '商机状态', value: row => opportunityBusinessStatusLabels[row.businessStatus as keyof typeof opportunityBusinessStatusLabels] ?? row.businessStatus },
    { key: 'expectedSignDate', label: '预签日期', value: row => row.expectedSignDate }, { key: 'amount', label: '商机金额（万元）', value: row => analysisAmount(row.amount) },
  ], [onNavigate]);
  const [recordConfig, setRecordConfig] = useState<ListViewConfig>(() => {
    const initial = config(recordColumns, new Set(['amount']));
    const widths: Record<string, number> = { code: 150, name: 210, customer: 180, owner: 110, stage: 130, businessStatus: 100, expectedSignDate: 120, amount: 150 };
    return { ...initial, columns: initial.columns.map(col => ({ ...col, width: widths[col.key] ?? col.width })) };
  });
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    call(`/api/systems/${encodeURIComponent(systemCode)}/opportunity-analysis?${params(applied)}`).then(r => r.json()).then(r => { if (active) { setData(opportunityAnalyticsSchema.parse(r)); setLoading(false); } }).catch(reason => { if (active) { setError(reason instanceof Error ? reason.message : '商机分析加载失败'); setLoading(false); } });
    return () => { active = false; };
  }, [systemCode, applied, attempt]);
  useEffect(() => {
    if (!data || loading || error || tab !== 'funnel') return;
    let active = true; setRecordsLoading(true); setRecords(null); setRecordError('');
    const query = params(data.query); if (selected) query.set('stageId', selected); query.set('page', String(page)); query.set('pageSize', String(recordConfig.pageSize));
    call(`/api/systems/${encodeURIComponent(systemCode)}/opportunity-analysis/records?${query}`).then(r => r.json()).then(r => { if (active) { setRecords(opportunityAnalyticsRecordsSchema.parse(r)); setRecordsLoading(false); } }).catch(reason => { if (active) { setRecordError(reason instanceof Error ? reason.message : '商机列表加载失败'); setRecordsLoading(false); } });
    return () => { active = false; };
  }, [data, loading, error, tab, systemCode, selected, page, recordConfig.pageSize, recordAttempt]);
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; stages: OpportunityAnalytics['stages'] }>();
    for (const stage of data?.stages ?? []) { if (!map.has(stage.templateId)) map.set(stage.templateId, { name: stage.templateName, stages: [] }); map.get(stage.templateId)!.stages.push(stage); }
    return [...map.entries()];
  }, [data]);
  const holdingColumns = useMemo<GridColumn<HoldingRow>[]>(() => [
    { key: 'stage', label: '商机阶段', value: row => row.name, render: row => row.summary ? <strong>{row.name}</strong> : row.name, minWidth: 200 },
    { key: 'probability', label: '阶段赢率', value: row => row.probability === null ? '—' : `${row.probability}%` },
    ...(data?.months ?? []).map((month, i) => ({ key: month, label: `${month}（万元）`, value: (row: HoldingRow) => analysisAmount(row.amounts[i]), render: (row: HoldingRow) => row.summary ? <strong>{analysisAmount(row.amounts[i])}</strong> : analysisAmount(row.amounts[i]) })),
  ], [data?.months]);
  const [holdingConfig, setHoldingConfig] = useState<ListViewConfig>(() => config(holdingColumns));
  useEffect(() => { setHoldingConfig(config(holdingColumns, new Set(data?.months ?? []))); }, [holdingColumns, data?.months]);
  const holdingRows = useMemo<HoldingRow[]>(() => data ? [
    ...data.stages.map(stage => ({ id: stage.id, name: `${stage.templateName} · ${stage.name}`, probability: stage.probability, amounts: stage.monthlyAmounts })),
    { id: 'original-total', name: '原始商机金额合计', probability: null, amounts: data.totals.monthlyAmounts, summary: true },
    { id: 'weighted-total', name: '商机金额 × 赢率合计', probability: null, amounts: data.totals.weightedAmounts, summary: true },
  ] : [], [data]);
  const runQuery = (query: OpportunityAnalyticsQuery) => { setSelected(null); setPage(1); setRecords(null); setApplied(query); setAttempt(n => n + 1); };
  return <div className="enterprise-page opportunity-analytics"><RecordQueryBar onQuery={() => runQuery({ ...draft })} onReset={() => { const q = defaults(); setDraft(q); runQuery(q); }}>
    <label>负责人所在组织<select aria-label="负责人所在组织" value={draft.orgUnitId ?? ''} onChange={e => setDraft({ ...draft, orgUnitId: e.target.value || undefined })}><option value="">全部组织（含下级）</option>{data?.organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
    <label>预签日期从<input aria-label="预签开始日期" type="date" value={draft.dateFrom ?? ''} onChange={e => setDraft({ ...draft, dateFrom: e.target.value || undefined })} /></label>
    <label>预签日期至<input aria-label="预签结束日期" type="date" value={draft.dateTo ?? ''} onChange={e => setDraft({ ...draft, dateTo: e.target.value || undefined })} /></label>
  </RecordQueryBar><section className="enterprise-card analytics-workspace"><DetailTabs id="opportunity-analytics" label="商机分析页签" tabs={[{ id: 'funnel', label: '销售漏斗' }, { id: 'holding', label: '保有量分析' }]} active={tab} onChange={setTab} />
    <DetailPanel id="opportunity-analytics" active={tab}>
      {loading && <p role="status">正在统计商机…</p>}{error && <div role="alert">{error}<button type="button" onClick={() => setAttempt(n => n + 1)}>重试统计</button></div>}
      {!loading && !error && data && <><p className="analytics-scope">预签范围：{data.query.dateFrom} 至 {data.query.dateTo} · 启用且未结束的商机（初始 / 跟进中） · 金额单位：万元{data.totals.missingAmount > 0 && ` · ${data.totals.missingAmount} 个商机未维护金额`}</p>
      {tab === 'funnel' ? <><div className="analytics-funnel-heading"><strong>共 {data.totals.count} 个项目 · {analysisAmount(data.totals.amount)} 万元</strong><span>按配置阶段顺序展示当前分布；点击阶段查看下方商机</span></div><div className="analytics-funnels">{groups.map(([id, group]) => <SalesFunnel key={id} title={group.name} stages={group.stages.map(s => ({ ...s, amountLabel: `${analysisAmount(s.amount)} 万元` }))} selected={selected} onSelect={stageId => { setSelected(stageId); setPage(1); }} />)}</div>{!groups.length && <p role="status">暂无可展示的销售阶段</p>}
        <section className="table-card analytics-records"><div className="table-toolbar"><strong>商机列表 · {selected ? data.stages.find(s => s.id === selected)?.name : '全部阶段'}</strong>{selected && <button type="button" onClick={() => { setSelected(null); setPage(1); }}>显示全部阶段</button>}</div>
        {recordError ? <div role="alert">{recordError}<button type="button" onClick={() => setRecordAttempt(n => n + 1)}>重试列表</button></div> : <BusinessDataGrid name="销售漏斗商机列表" columns={recordColumns} config={recordConfig} onConfigChange={next => { if (next.pageSize !== recordConfig.pageSize) setPage(1); setRecordConfig(next); }} rows={records?.items ?? []} rowKey={r => r.id} total={records?.pagination.total ?? 0} page={page} onPageChange={setPage} loading={recordsLoading} exportAll={async () => records?.items ?? []} />}</section>
      </> : <><p className="analytics-scope">保有量显示 {data.months[0]} 至 {data.months[5]}，仅汇总所选预签范围内的金额。赢率取当前阶段配置，不使用个人把握度。</p><BusinessDataGrid name="商机保有量分析" columns={holdingColumns} config={holdingConfig} onConfigChange={setHoldingConfig} rows={holdingRows} rowKey={r => r.id} total={holdingRows.length} page={1} onPageChange={() => {}} showSequence={false} showPagination={false} autoHeight exportAll={async () => holdingRows} rowAttributes={row => ({ className: row.summary ? 'analytics-total' : '' })} /></>}
      </>}
    </DetailPanel></section></div>;
}
