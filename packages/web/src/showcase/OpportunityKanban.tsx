import { useEffect, useRef, useState } from 'react';
import { type Opportunity, type OpportunityBoard, type OpportunityTemplate, type ListViewConfig } from '@forge-crm/contracts';
import { KanbanBoard } from '../common/KanbanBoard';
import type { DirectoryExtension } from '../common/BusinessDirectory';
import { opportunityBoardApi } from './opportunity-board-api';
import { GatewayError, type EnterpriseGateway } from './gateway';
import { showcaseHref } from './domain/routes';

const cardLabels = { opportunityName: '商机名称', customerName: '客户', expectedAmount: '预计金额', ownerName: '负责人', confidence: '把握度', expectedSignDate: '预计签约日期' };
export function OpportunityBoardControls({ context, systemCode, gateway }: { context: DirectoryExtension; systemCode: string; gateway: EnterpriseGateway }) {
  const [templates, setTemplates] = useState<OpportunityTemplate[]>([]), [error, setError] = useState('');
  const { config, busy, canSave } = context;
  const fallback = useRef(context.fallback); fallback.current = context.fallback;
  useEffect(() => { let active = true; void gateway.opportunityTemplates(systemCode).then(rows => {
    if (!active) return; setTemplates(rows.filter(t => t.status === 'ACTIVE'));
    if (config.viewMode === 'KANBAN' && !rows.some(t => t.id === config.kanban?.templateId && t.status === 'ACTIVE')) fallback.current('原看板模板已失效，已回退表格，请重新选择模板。');
  }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [gateway, systemCode, config.kanban?.templateId, config.viewMode]);
  const templateId = config.kanban?.templateId ?? templates.find(t => t.isDefault)?.id ?? '';
  const save = (mode: 'TABLE' | 'KANBAN', id = templateId) => {
    const next: ListViewConfig = { ...config, schemaVersion: 2, viewMode: mode, ...(id ? { kanban: { templateId: id, cardFields: (config.kanban?.cardFields ?? Object.keys(cardLabels) as Array<keyof typeof cardLabels>).filter(key => config.columns.some(c => c.key === key && c.visible)) } } : {}) };
    void context.saveConfig(next).catch(e => setError(e.message));
  };
  return <div className="kanban-view-controls" aria-label="商机展示方式"><button type="button" aria-pressed={config.viewMode !== 'KANBAN'} disabled={busy || !canSave} onClick={() => save('TABLE')}>表格</button><button type="button" aria-pressed={config.viewMode === 'KANBAN'} disabled={busy || !canSave || !templateId} onClick={() => save('KANBAN')}>看板</button>
    <label>阶段模板 <select aria-label="看板阶段模板" disabled={busy || !canSave} value={templateId} onChange={e => save(config.viewMode ?? 'TABLE', e.target.value)}><option value="" disabled>请选择模板</option>{templates.map(t => <option key={t.id} value={t.id}>{t.templateName}</option>)}</select></label>{error && <span role="alert">{error}</span>}
  </div>;
}
export function OpportunityKanban({ context, systemCode, allowedActions, onOpen, api = opportunityBoardApi }: { context: DirectoryExtension; systemCode: string; allowedActions: string[]; onOpen: (row: Opportunity) => void; api?: typeof opportunityBoardApi }) {
  const [board, setBoard] = useState<OpportunityBoard | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true), [more, setMore] = useState<string[]>([]), [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<{ row: Opportunity; stageId: string; requestId: string } | null>(null), [saving, setSaving] = useState(false);
  const generation = useRef(0), moreInFlight = useRef(new Set<string>());
  const queryKey = JSON.stringify({ templateId: context.config.kanban!.templateId, keyword: context.query.keyword, ...(context.query.status ? { businessStatus: context.query.status } : {}) });
  useEffect(() => {
    const version = ++generation.current; setLoading(true); setBoard(null); setMore([]); moreInFlight.current.clear(); setError(''); setPending(null);
    void api.load(systemCode, new URLSearchParams(JSON.parse(queryKey))).then(data => { if (generation.current === version) setBoard(data); }).catch(e => { if (generation.current === version) setError(e.message); }).finally(() => { if (generation.current === version) setLoading(false); });
    return () => { generation.current++; };
  }, [api, systemCode, queryKey, context.revision, revision]);
  const canMove = (row: Opportunity) => allowedActions.includes('update') && row.status === 'ACTIVE' && ['INITIAL', 'FOLLOWING'].includes(row.businessStatus ?? 'INITIAL') && board?.columns.some(c => c.stage.id === row.stageId && c.stage.status === 'ACTIVE') === true;
  const choose = (row: Opportunity, stageId: string) => { if (!saving && !pending && canMove(row) && stageId !== row.stageId) setPending({ row, stageId, requestId: crypto.randomUUID() }); };
  const loadMore = async (id: string) => {
    const column = board?.columns.find(c => c.stage.id === id); if (!column?.nextCursor || moreInFlight.current.has(id)) return;
    const version = generation.current; moreInFlight.current.add(id); setMore(old => [...old, id]);
    try { const data = await api.load(systemCode, new URLSearchParams({ ...JSON.parse(queryKey), stageId: id, after: column.nextCursor }));
      if (generation.current !== version) return;
      setBoard(old => old ? { ...old, columns: old.columns.map(c => { const next = data.columns.find(n => n.stage.id === c.stage.id); return next ? { ...next, items: [...c.items, ...next.items.filter(row => !c.items.some(existing => existing.id === row.id))] } : c; }) } : old);
    } catch (e) { if (generation.current === version) setError(e instanceof Error ? e.message : '加载失败'); }
    finally { if (generation.current === version) { moreInFlight.current.delete(id); setMore(old => old.filter(x => x !== id)); } }
  };
  const fields = context.config.kanban!.cardFields.filter(key => context.config.columns.some(c => c.key === key && c.visible));
  return <><p className="kanban-notice">{context.query.status ? '当前按所选状态查询；关闭或停用记录只读。' : '默认显示启用且未关闭的商机。'} 每列汇总全部匹配记录，每次加载20条。预计金额尚未定义币种，不作币种换算。</p>
    {notice && <p role="status" className="kanban-notice">{notice}</p>}{error && <p role="alert" className="enterprise-alert">{error}<button type="button" onClick={() => setRevision(v => v + 1)}>刷新看板</button></p>}{loading && <p role="status">正在加载看板…</p>}
    {board && <KanbanBoard columns={board.columns.map(c => ({ id: c.stage.id, title: c.stage.stageName, readOnly: c.stage.status !== 'ACTIVE', items: c.items, more: !!c.nextCursor, loading: more.includes(c.stage.id), summary: <div className="kanban-summary"><span>{c.total} 个商机 · 预计金额 {c.amount}</span><span>金额未填 {c.missingAmount} 个</span></div> }))} rowKey={row => row.id} canMove={row => !saving && !pending && canMove(row)} onMove={choose} onMore={id => void loadMore(id)} render={row => <>
      <a className="record-detail-link" href={showcaseHref(`/showcase/opportunities/${row.id}`)} onClick={e => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); onOpen(row); } }}>{row.opportunityCode}</a>
      <dl>{fields.map(key => <div key={key} style={{ display: 'contents' }}><dt>{cardLabels[key]}</dt><dd>{key === 'expectedAmount' ? row.expectedAmountExact ?? row.expectedAmount ?? '未填写' : key === 'confidence' ? `${row.confidence}%` : row[key] ?? '—'}</dd></div>)}</dl>
      {canMove(row) && <button type="button" disabled={saving || !!pending} aria-label={`变更阶段 ${row.opportunityCode}`} onClick={() => { const target = board.columns.find(c => c.stage.status === 'ACTIVE' && c.stage.id !== row.stageId); if (target) choose(row, target.stage.id); }}>变更阶段</button>}
    </>} />}
    {pending && board && <StageDialog row={pending.row} stageId={pending.stageId} stages={board.columns.filter(c => c.stage.status === 'ACTIVE' && c.stage.id !== pending.row.stageId).map(c => c.stage)} busy={saving} onClose={() => setPending(null)} onSave={async (stageId, reason) => {
      setSaving(true); setError('');
      try { await api.move(systemCode, pending.row.id, { stageId, reason, version: pending.row.version, requestId: pending.requestId }); setPending(null); setNotice('阶段已更新，已刷新看板汇总。'); setRevision(v => v + 1); }
      catch (e) { if (e instanceof GatewayError && e.status === 409) { setPending(null); setNotice('商机已变化，已刷新看板；请重新选择阶段。'); setRevision(v => v + 1); } else throw e; }
      finally { setSaving(false); }
    }} />}
  </>;
}
function StageDialog({ row, stageId, stages, busy, onClose, onSave }: { row: Opportunity; stageId: string; stages: OpportunityTemplate['stages']; busy: boolean; onClose: () => void; onSave: (stageId: string, reason: string) => Promise<void> }) {
  const [target, setTarget] = useState(stageId), [reason, setReason] = useState(''), [error, setError] = useState('');
  const dialog = useRef<HTMLFormElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.querySelector('select')?.focus(); return () => { if (previous?.isConnected) previous.focus(); }; }, []);
  return <div className="enterprise-modal-backdrop"><form ref={dialog} className="enterprise-modal kanban-stage-dialog" role="dialog" aria-modal="true" aria-label="变更商机阶段" onSubmit={e => { e.preventDefault(); if (!busy && reason.trim()) void onSave(target, reason.trim()).catch(e => setError(e.message)); }} onKeyDown={e => {
    if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); }
    if (e.key === 'Tab') { const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),textarea:not(:disabled)') ?? []); if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); } }
  }}><header><h2>变更商机阶段</h2></header><div className="modal-body"><p>{row.opportunityCode} · 当前阶段：{row.stageName}</p>{error && <p role="alert">{error}</p>}<label>目标阶段<select value={target} disabled={busy} onChange={e => setTarget(e.target.value)}>{stages.map(s => <option key={s.id} value={s.id}>{s.stageName}</option>)}</select></label><label>变更理由<textarea required maxLength={500} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} /></label><p>仅变更销售阶段，不修改签约、丢单等业务状态。</p></div><footer><button type="button" disabled={busy} onClick={onClose}>取消</button><button className="is-primary" type="submit" disabled={busy || !reason.trim()}>{busy ? '保存中…' : '确定变更'}</button></footer></form></div>;
}
