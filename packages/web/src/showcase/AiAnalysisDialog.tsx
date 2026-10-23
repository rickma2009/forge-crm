import { useCallback, useEffect, useRef, useState } from 'react';
import { aiSectionKeys, aiSectionTitles, type AiResult, type AiSource, type AiTask, type AiStart } from '@forge-crm/contracts';
import { aiAnalysisApi } from './ai-analysis-api';
import './ai-analysis.css';
const sourceLabels: Record<string, string> = { name: '名称', customer: '客户', stage: '阶段', expectedSignDate: '预计签约日期', budget: '客户预算', salesAmount: '销售金额', remark: '备注', model: '型号', quantity: '数量', salesUnitPrice: '销售单价', requirement: '产品需求', date: '跟进时间', workItem: '工作事项', resultNext: '结果与下一步', industryPosition: '行业地位', mainProducts: '主要产品', strengths: '优势', weaknesses: '劣势', status: '状态 / 处理情况', opportunityPoint: '机会点', risk: '风险', nextPlan: '下一步计划', historicalOpinionOnly: '历史判断，仅作参考', structuredResult: '历史完整分析', focus: '关注重点', issues: '补充问题', category: '类别', description: '问题描述', impact: '影响' };
function SourceContent({ value }: { value: unknown }): React.ReactNode {
  if (value == null || value === '') return '未记录';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (Array.isArray(value)) return value.length ? <ol>{value.map((item, index) => <li key={index}><SourceContent value={item} /></li>)}</ol> : '无';
  if (typeof value === 'object') return <dl>{Object.entries(value).filter(([key]) => key !== 'version').map(([key, item]) => <div key={key}><dt>{sourceLabels[key] ?? key}</dt><dd><SourceContent value={item} /></dd></div>)}</dl>;
  return String(value);
}
const stateName = { QUEUED: '排队中', RUNNING: '分析中', SUCCEEDED: '待确认', FAILED: '失败' };
const kindName = { FACT: '事实', INFERENCE: '推断 / 建议', UNKNOWN: '待核实' };
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });
const errorText = (e: unknown) => e instanceof Error ? e.message : '操作失败，请重试';
export function AiResultView({ result }: { result: AiResult }) {
  return <div className="ai-result-readonly">{aiSectionKeys.map(key => <section className="detail-section" key={key}><h3>{aiSectionTitles[key]}</h3>{result.sections.find(s => s.key === key)?.items.map((item, index) => <p key={index}><span className="ai-kind">{kindName[item.kind]}{item.category ? ` · ${item.category}` : ''}</span>{item.text}</p>)}</section>)}</div>;
}
export function AiAnalysisDialog({ systemCode, opportunityId, initialTaskId, canGenerate, canConfirm, onClose, onSaved }: { systemCode: string; opportunityId: string; initialTaskId?: string; canGenerate: boolean; canConfirm: boolean; onClose: () => void; onSaved: () => void }) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof aiAnalysisApi.preview>> | null>(null);
  const [history, setHistory] = useState<AiTask[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1);
  const [task, setTask] = useState<AiTask | null>(null), [result, setResult] = useState<AiResult | null>(null);
  const [focus, setFocus] = useState(''), [issues, setIssues] = useState<AiStart['issues']>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false), [acceptStale, setAcceptStale] = useState(false), [source, setSource] = useState<AiSource | null>(null);
  const dialog = useRef<HTMLElement>(null), requestId = useRef(crypto.randomUUID()), actionPending = useRef(false), generation = useRef(0);
  const running = task?.status === 'QUEUED' || task?.status === 'RUNNING';
  const editable = !!task && !task.analysisId && task.status === 'SUCCEEDED' && task.isOwner && canConfirm;
  const sources = task?.snapshot.sources ?? preview?.snapshot.sources ?? [];
  const applyTask = useCallback((next: AiTask) => { setTask(next); setResult(next.confirmedResult ?? next.result); setFocus(next.snapshot.focus); setIssues(next.snapshot.issues); setDirty(false); setAcceptStale(false); }, []);
  const close = () => { if (!busy) onClose(); };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null; dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const seq = ++generation.current;
    void (async () => {
      try {
        const [p, h] = await Promise.all([canGenerate ? aiAnalysisApi.preview(systemCode, opportunityId) : Promise.resolve(null), aiAnalysisApi.list(systemCode, opportunityId)]);
        if (seq !== generation.current) return;
        setPreview(p); setHistory(h.items); setTotal(h.total);
        const selectedId = initialTaskId ?? h.items.find(t => t.isOwner && !t.analysisId)?.id;
        if (selectedId) { const selected = await aiAnalysisApi.detail(systemCode, opportunityId, selectedId); if (seq === generation.current) applyTask(selected); }
      } catch (e) { if (seq === generation.current) setError(errorText(e)); }
      finally { if (seq === generation.current) setLoading(false); }
    })();
    return () => { generation.current++; };
  }, [systemCode, opportunityId, canGenerate, initialTaskId, applyTask]);
  useEffect(() => {
    if (!running || !task) return;
    let active = true, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const next = await aiAnalysisApi.detail(systemCode, opportunityId, task.id); if (active) { applyTask(next); setError(''); } }
      catch (e) { if (active) setError(errorText(e)); }
      if (active) timer = setTimeout(() => void poll(), 2500);
    };
    timer = setTimeout(() => void poll(), 1500);
    return () => { active = false; clearTimeout(timer); };
  }, [running, task?.id, systemCode, opportunityId, applyTask]);
  const perform = async (operation: () => Promise<void>) => {
    if (actionPending.current) return;
    actionPending.current = true; setBusy(true); setError(''); setMessage('');
    try { await operation(); } catch (e) { setError(errorText(e)); } finally { actionPending.current = false; setBusy(false); }
  };
  const refreshHistory = async (nextPage = 1) => { const h = await aiAnalysisApi.list(systemCode, opportunityId, nextPage); setHistory(h.items); setTotal(h.total); setPage(nextPage); };
  const start = () => void perform(async () => {
    if (dirty && !window.confirm('重新生成会保留AI原稿，但放弃尚未确认的修改，继续吗？')) return;
    const next = await aiAnalysisApi.start(systemCode, opportunityId, { requestId: requestId.current, ...(task?.isOwner ? { parentTaskId: task.id } : {}), focus, issues });
    requestId.current = crypto.randomUUID(); applyTask(next); await refreshHistory();
  });
  const confirm = () => void perform(async () => {
    if (!task || !result) return;
    const next = await aiAnalysisApi.confirm(systemCode, opportunityId, task.id, result, acceptStale);
    applyTask(next); onSaved(); setMessage('已保存到商机分析记录，商机阶段与把握度保持不变'); await refreshHistory();
  });
  const selectTask = (id: string) => void perform(async () => { if (dirty && !window.confirm('切换记录会放弃尚未确认的修改，继续吗？')) return; applyTask(await aiAnalysisApi.detail(systemCode, opportunityId, id)); setSource(null); });
  const updateItem = (sectionIndex: number, itemIndex: number, change: Partial<AiResult['sections'][number]['items'][number]>) => { if (!result) return; setResult({ sections: result.sections.map((s, si) => si !== sectionIndex ? s : { ...s, items: s.items.map((i, ii) => ii !== itemIndex ? i : { ...i, ...change }) }) }); setDirty(true); };
  return <div className="enterprise-modal-backdrop"><section className="enterprise-modal ai-analysis-dialog" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="商机AI分析" onKeyDown={e => {
    if (e.key === 'Escape' && !busy) { e.stopPropagation(); close(); }
    if (e.key === 'Tab') { const elements = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') ?? [])].filter(el => el.getClientRects().length); const first = elements[0], last = elements.at(-1); if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
  }}>
    <header><div><h2>商机AI分析</h2><p>{task?.snapshot.opportunity.name ?? preview?.snapshot.opportunity.name ?? '加载商机资料'}</p></div><button type="button" aria-label="关闭" disabled={busy} onClick={close}>×</button></header>
    <div className="modal-body ai-analysis-body">
      {error && <div className="enterprise-alert" role="alert">{error}</div>}{message && <p role="status">{message}</p>}
      {loading ? <p role="status">正在读取资料和历史任务…</p> : <>
        {preview && <p className="ai-meta">模型：{preview.configuration.model} · 最近24小时上限：{preview.configuration.dailyLimit} 次 {canGenerate && <button type="button" disabled={busy || running || !preview.configuration.configured} onClick={() => void perform(async () => { setMessage((await aiAnalysisApi.test(systemCode, opportunityId)).message); })}>测试连接</button>}</p>}
        {preview && !preview.configuration.configured && <p className="enterprise-alert">尚未配置AI服务，请联系管理员</p>}
        {(task?.provider === 'mock' || preview?.configuration.provider === 'mock') && <p className="enterprise-alert">模拟结果仅供流程验证，不构成业务分析。</p>}
        <p className="ai-meta">资料截至：{task ? date(task.snapshot.capturedAt) : preview ? date(preview.snapshot.capturedAt) : '—'} · {sources.length} 条资料</p>
        <details><summary>查看分析资料与引用依据</summary><div className="ai-sources">{sources.map(s => <button key={s.id} type="button" onClick={() => setSource(s)}>{s.title}</button>)}</div></details>
        {source && <section className="ai-source" aria-label="引用资料"><strong>{source.title}</strong><button type="button" onClick={() => setSource(null)}>收起依据</button><SourceContent value={source.content} /></section>}
        {canGenerate && <section className="detail-section ai-input"><label>本次重点关注的问题<textarea maxLength={2000} value={focus} disabled={busy || running} onChange={e => setFocus(e.target.value)} placeholder="例如：交期风险、竞争对手优势、下一步如何推动客户决策" /></label>
          <div className="table-toolbar"><strong>补充问题</strong><button type="button" disabled={busy || running || issues.length >= 20} onClick={() => setIssues([...issues, { category: '技术', description: '', impact: '', status: '' }])}>新增问题</button></div>
          {issues.map((issue, index) => <div className="ai-issue" key={index}><label>类别<select disabled={busy || running} value={issue.category} onChange={e => setIssues(issues.map((i, n) => n === index ? { ...i, category: e.target.value as typeof issue.category } : i))}>{['技术', '产品', '交期', '成本', '其他'].map(c => <option key={c}>{c}</option>)}</select></label>{(['description', 'impact', 'status'] as const).map((key, k) => <label key={key}>{['问题描述', '影响', '处理情况'][k]}<input maxLength={key === 'description' ? 1500 : key === 'impact' ? 1000 : 200} disabled={busy || running} value={issue[key]} onChange={e => setIssues(issues.map((i, n) => n === index ? { ...i, [key]: e.target.value } : i))} /></label>)}<button type="button" disabled={busy || running} onClick={() => setIssues(issues.filter((_, n) => n !== index))}>移除</button></div>)}
          <p className="ai-meta">补充内容用于下一次生成；不会改写已有任务的资料快照。</p>
        </section>}
        {task && <p role="status">任务：{task.analysisId ? '已确认保存' : stateName[task.status]}{running ? '，关闭弹窗后仍会继续，可再次打开查看。' : ''}</p>}
        {task?.error && <p className="enterprise-alert">{task.error}</p>}
        {result && <div className="ai-results">{result.sections.map((s, si) => <section className="detail-section" key={s.key}><h3>{aiSectionTitles[s.key]}</h3>{s.items.map((item, ii) => <div className="ai-result-item" key={ii}>{editable ? <><div className="ai-item-meta"><label>结论类型<select value={item.kind} disabled={busy} onChange={e => updateItem(si, ii, { kind: e.target.value as typeof item.kind })}>{Object.entries(kindName).map(([k, v]) => <option value={k} key={k}>{v}</option>)}</select></label>{item.category && <span>{item.category}</span>}</div><textarea aria-label={`${aiSectionTitles[s.key]} ${ii + 1}`} maxLength={3000} value={item.text} disabled={busy} onChange={e => updateItem(si, ii, { text: e.target.value })} /></> : <p><span className="ai-kind">{kindName[item.kind]}{item.category ? ` · ${item.category}` : ''}</span>{item.text}</p>}
          <div className="ai-evidence">{item.sourceIds.map(id => <button type="button" key={id} onClick={() => { setSource(sources.find(x => x.id === id) ?? null); dialog.current?.querySelector('.ai-analysis-body')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>查看依据：{sources.find(x => x.id === id)?.title ?? id}</button>)}{!item.sourceIds.length && <span>无引用依据</span>}</div>
          {editable && <details><summary>调整引用依据</summary>{sources.map(source => <label key={source.id} className="ai-check"><input type="checkbox" checked={item.sourceIds.includes(source.id)} onChange={e => updateItem(si, ii, { sourceIds: e.target.checked ? [...item.sourceIds, source.id] : item.sourceIds.filter(x => x !== source.id) })} />{source.title}</label>)}</details>}
        </div>)}</section>)}</div>}
        {task?.result && <details><summary>查看AI原稿（不可修改）</summary><AiResultView result={task.result} /></details>}
        {editable && <label className="ai-check"><input type="checkbox" checked={acceptStale} onChange={e => setAcceptStale(e.target.checked)} />如果资料已更新，仍按本次快照保存（记录将标明资料时间）</label>}
        {task?.stale && <p className="enterprise-alert">商机已有新资料，建议重新生成分析。</p>}
        <details><summary>分析历史与任务（{total}）</summary><div className="ai-history">{history.map(h => <button type="button" disabled={busy} key={h.id} onClick={() => selectTask(h.id)}>{date(h.createdAt)} · {h.analysisId ? '已确认' : stateName[h.status]}{h.provider === 'mock' ? ' · 模拟' : ''}</button>)}</div>{total > 20 && <div><button type="button" disabled={busy || page <= 1} onClick={() => void perform(() => refreshHistory(page - 1))}>上一页</button><span>第 {page} 页</span><button type="button" disabled={busy || page * 20 >= total} onClick={() => void perform(() => refreshHistory(page + 1))}>下一页</button></div>}</details>
      </>}
    </div>
    <footer><button type="button" disabled={busy} onClick={close}>关闭</button>{canGenerate && <button type="button" disabled={loading || busy || running || !preview?.configuration.configured || issues.some(i => !i.description.trim())} onClick={start}>{task ? '重新生成' : '开始分析'}</button>}{editable && <button type="button" className="is-primary" disabled={busy} onClick={confirm}>确认保存</button>}</footer>
  </section></div>;
}
