import { useCallback, useEffect, useRef, useState } from 'react';
import { aiSectionTitles, type AgentTask, type AgentStart, type AgentSave, type AgentPreview, type AiSource } from '@forge-crm/contracts';
import { DrawerWorkspace } from '../DrawerWorkspace';
import './agent-assistant-drawer.css';
export type AgentGateway = {
  preview: (system: string, id: string) => Promise<AgentPreview>;
  list: (system: string, id: string, page?: number) => Promise<{ items: AgentTask[]; total: number; page: number }>;
  detail: (system: string, id: string, taskId: string) => Promise<AgentTask>;
  start: (system: string, id: string, input: AgentStart) => Promise<AgentTask>;
  cancel: (system: string, id: string, taskId: string) => Promise<AgentTask>;
  save: (system: string, id: string, taskId: string, input: AgentSave) => Promise<AgentTask>;
};
const stateNames = { QUEUED: '排队中', RUNNING: '执行中', SUCCEEDED: '待审阅', FAILED: '失败', CANCELLED: '已取消' };
const sourceLabels: Record<string, string> = { name: '名称', customer: '客户', stage: '阶段', expectedSignDate: '预计签约日期', budget: '预算', salesAmount: '销售金额', remark: '备注', model: '型号', quantity: '数量', salesUnitPrice: '销售单价', requirement: '需求', date: '跟进日期', workItem: '工作事项', resultNext: '结果与下一步', industryPosition: '行业地位', mainProducts: '主要产品', strengths: '优势', weaknesses: '劣势', businessStatus: '商机状态', signedDate: '签约日期', lostDate: '丢单日期', status: '状态' };
const errorText = (e: unknown) => e instanceof Error ? e.message : '操作失败，请重试';
export function AgentAssistantDrawer({ systemCode, contextId, contextName, api, canSave, onClose, onSaved }: { systemCode: string; contextId: string; contextName: string; api: AgentGateway; canSave: boolean; onClose: () => void; onSaved: () => void }) {
  const [preview, setPreview] = useState<AgentPreview | null>(null), [task, setTask] = useState<AgentTask | null>(null), [history, setHistory] = useState<AgentTask[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1);
  const [mode, setMode] = useState<AgentStart['mode']>('FOLLOW_UP'), [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [dirty, setDirty] = useState(false);
  const [source, setSource] = useState<AiSource | null>(null), [workItem, setWorkItem] = useState('沟通事项'), [resultNext, setResultNext] = useState(''), [followedAt, setFollowedAt] = useState(new Date().toISOString().slice(0, 10)), [acceptStale, setAcceptStale] = useState(false);
  const pending = useRef(false), mounted = useRef(true), requestId = useRef(crypto.randomUUID());
  const running = task?.status === 'QUEUED' || task?.status === 'RUNNING';
  const apply = useCallback((next: AgentTask) => { setTask(next); setMode(next.mode); setInstruction(next.instruction); setDirty(false); setAcceptStale(false); setSource(null); setWorkItem(next.plan?.workItem ?? '沟通事项'); setFollowedAt(next.plan?.followedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10)); setResultNext(next.plan?.resultNext ?? next.result?.sections.find(s => s.key === 'actions')?.items.map(i => i.text).join('\n') ?? ''); }, []);
  useEffect(() => {
    mounted.current = true; let active = true;
    void Promise.all([api.preview(systemCode, contextId), api.list(systemCode, contextId)]).then(async ([p, h]) => {
      if (!active) return; setPreview(p); setHistory(h.items); setTotal(h.total);
      if (h.items[0]) { const selected = await api.detail(systemCode, contextId, h.items[0].id); if (active) apply(selected); }
    }).catch(e => { if (active) setError(errorText(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; mounted.current = false; };
  }, [api, systemCode, contextId, apply]);
  useEffect(() => {
    if (!running || !task) return; let active = true, timer: ReturnType<typeof setTimeout>;
    const poll = async () => { try { const next = await api.detail(systemCode, contextId, task.id); if (active) { apply(next); setError(''); } } catch (e) { if (active) setError(errorText(e)); } if (active) timer = setTimeout(() => void poll(), 2500); };
    timer = setTimeout(() => void poll(), 1500); return () => { active = false; clearTimeout(timer); };
  }, [api, running, task?.id, systemCode, contextId, apply]);
  useEffect(() => { const leave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave); }, [dirty]);
  const discard = () => !dirty || window.confirm('沟通计划的修改尚未保存，确定离开吗？Agent原稿仍会保留。');
  const close = () => { if (discard()) onClose(); };
  const perform = async (action: () => Promise<void>) => { if (pending.current) return; pending.current = true; setBusy(true); setError(''); setMessage(''); try { await action(); } catch (e) { if (mounted.current) setError(errorText(e)); } finally { pending.current = false; if (mounted.current) setBusy(false); } };
  const refresh = async (nextPage = 1) => { const h = await api.list(systemCode, contextId, nextPage); if (mounted.current) { setHistory(h.items); setTotal(h.total); setPage(nextPage); } };
  const start = () => void perform(async () => { if (!discard()) return; const next = await api.start(systemCode, contextId, { requestId: requestId.current, mode, instruction }); requestId.current = crypto.randomUUID(); if (mounted.current) { apply(next); await refresh(); } });
  const save = () => void perform(async () => { if (!task || !task.result) return; const next = await api.save(systemCode, contextId, task.id, { result: task.result, followedAt: new Date(followedAt + 'T00:00:00.000Z').toISOString(), workItem, resultNext, acceptStale }); if (mounted.current) { apply(next); setMessage('已保存为商机跟进中的沟通计划（待执行）'); await refresh(); } onSaved(); });
  const seen = new Set(task?.steps.filter(s => s.kind === 'TOOL' && s.status === 'SUCCEEDED').flatMap(s => s.sourceIds) ?? []);
  const result = task?.confirmedResult ?? task?.result;
  const editable = canSave && task?.status === 'SUCCEEDED' && !task.followUpId;
  return <DrawerWorkspace title="Agent小助手" subtitle={contextName} onClose={close} footer={<><button type="button" onClick={close}>关闭</button>{running && <button type="button" disabled={busy} onClick={() => void perform(async () => { if (task) { const next = await api.cancel(systemCode, contextId, task.id); if (mounted.current) apply(next); } })}>取消任务</button>}<button type="button" disabled={loading || busy || running || !preview?.configuration.configured} onClick={start}>{task ? '重新生成' : '开始执行'}</button>{editable && <button type="button" className="is-primary" disabled={busy || !workItem.trim() || !resultNext.trim() || resultNext.length > 2000 || !followedAt || (task.stale && !acceptStale)} onClick={save}>保存沟通计划</button>}</>}>
    {error && <p className="enterprise-alert" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {loading ? <p role="status">正在加载助手…</p> : <>
      {!preview?.configuration.configured && <p role="alert">模型尚未配置，请联系管理员；暂不能生成任务。</p>}
      {preview?.configuration.provider === 'mock' && <p role="alert">当前为模拟模式，结果仅供流程测试。</p>}
      <label>任务类型<select value={mode} disabled={busy || running} onChange={e => setMode(e.target.value as AgentStart['mode'])}><option value="FOLLOW_UP">分析跟进</option><option value="COMMUNICATION_PLAN">生成沟通计划</option></select></label>
      <label>补充要求<textarea maxLength={2000} value={instruction} disabled={busy || running} onChange={e => setInstruction(e.target.value)} placeholder="例如：整理下一次客户沟通的问题，重点关注交期和需求变化" /></label>
      <p className="agent-muted">仅使用当前商机及其跟进、产品需求和已关联竞争资料。关闭抽屉后任务继续，可再次打开查看。</p>
      {task && <p className="agent-task-status" role="status">任务：{task.followUpId ? '已保存沟通计划' : stateNames[task.status]}{task.provider === 'mock' ? ' · 模拟结果' : ''}</p>}
      {task?.error && <p role="alert">{task.error}</p>}
      <section><h3>执行过程</h3>{task?.steps.length ? <ol className="agent-progress">{task.steps.map(s => <li key={s.id}>{s.label} · {s.status === 'SUCCEEDED' ? '完成' : s.status === 'RUNNING' ? '处理中' : '失败'}</li>)}</ol> : <p className="agent-muted">发起任务后展示实际模型处理与工具调用步骤。</p>}</section>
      {source && <section className="agent-source"><h3>依据：{source.title}</h3><p className="agent-muted">任务快照时间：{task?.snapshot.capturedAt.slice(0, 19).replace('T', ' ')}</p><dl>{Object.entries(source.content).filter(([key]) => key !== 'version').map(([key, value]) => <div key={key}><dt>{sourceLabels[key] ?? key}</dt><dd>{value == null ? '未记录' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl><button type="button" onClick={() => setSource(null)}>收起依据</button></section>}
      {result && <section><h3>结果与建议</h3>{result.sections.map(s => <section key={s.key}><h3>{aiSectionTitles[s.key]}</h3>{s.items.map((item, i) => <div key={i}><p><span className="agent-kind">{item.kind === 'FACT' ? '事实' : item.kind === 'INFERENCE' ? '建议 / 推断' : '待核实'}</span>{item.text}</p><div className="agent-evidence">{item.sourceIds.map(id => <button key={id} type="button" onClick={() => setSource(task?.snapshot.sources.find(s => s.id === id) ?? null)}>查看依据：{task?.snapshot.sources.find(s => s.id === id)?.title ?? id}</button>)}</div></div>)}</section>)}</section>}
      {(editable || task?.plan) && <section><h3>审阅并保存沟通计划</h3><p className="agent-muted">保存为待执行计划，不代表沟通已经完成。</p><label>计划日期<input type="date" disabled={!editable || busy} value={followedAt} onChange={e => { setFollowedAt(e.target.value); setDirty(true); }} /></label><label>沟通事项<input maxLength={950} disabled={!editable || busy} value={workItem} onChange={e => { setWorkItem(e.target.value); setDirty(true); }} /></label><label>沟通计划<textarea maxLength={2000} disabled={!editable || busy} value={resultNext} onChange={e => { setResultNext(e.target.value); setDirty(true); }} /></label>{resultNext.length > 2000 && <p role="alert">生成建议超过2000字，请精简沟通计划后保存，原稿会保留。</p>}{task?.stale && editable && <><p role="alert">商机已有新资料，建议重新生成。</p><label className="agent-check"><input type="checkbox" checked={acceptStale} onChange={e => setAcceptStale(e.target.checked)} />我确认按本次旧快照保存</label></>}</section>}
      <section><h3>我的任务（{total}）</h3><div className="agent-history">{history.map(h => <button type="button" disabled={busy || running} key={h.id} onClick={() => void perform(async () => { if (discard()) { const next = await api.detail(systemCode, contextId, h.id); if (mounted.current) apply(next); } })}>{new Date(h.createdAt).toLocaleString('zh-CN', { hour12: false })} · {h.followUpId ? '已保存' : stateNames[h.status]}</button>)}</div>{total > 20 && <div><button disabled={busy || page <= 1} onClick={() => void perform(() => refresh(page - 1))}>上一页</button><span>第{page}页</span><button disabled={busy || page * 20 >= total} onClick={() => void perform(() => refresh(page + 1))}>下一页</button></div>}<details><summary>可用业务工具</summary><ul>{preview?.tools.map(t => <li key={t.name}>{t.label}</li>)}</ul><p className="agent-muted">共 {seen.size} 项资料已被当前任务工具读取。</p></details></section>
    </>}
  </DrawerWorkspace>;
}
