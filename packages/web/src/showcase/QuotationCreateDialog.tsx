import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Opportunity } from '@interaction-pattern-lab/contracts';
import type { EnterpriseGateway } from './gateway';
import { quotationApi } from './quotation-api';

type Option = { id: string; label: string; version?: number; customerName?: string };
export function QuotationCreateDialog({ systemCode, gateway, opportunityId, customerId, onClose, onCreated }: {
  systemCode: string; gateway: EnterpriseGateway; opportunityId?: string; customerId?: string;
  onClose: () => void; onCreated: (id: string) => void;
}) {
  const locked = !!opportunityId;
  const [source, setSource] = useState<Opportunity | null>(null), [refreshing, setRefreshing] = useState(false);
  const sourceRequest = useRef(0);
  const [mode, setMode] = useState<'OPPORTUNITY' | 'INDEPENDENT'>('OPPORTUNITY');
  const [text, setText] = useState(''), [selection, setSelection] = useState<Option | null>(null);
  const [options, setOptions] = useState<Option[]>([]), [page, setPage] = useState(1), [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const key = useRef(crypto.randomUUID()), submitting = useRef(false), listId = useId();
  const dialog = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('select:not(:disabled), input:not(:disabled), button:not(:disabled)')?.focus();
    return () => previous?.focus();
  }, []);
  const loadOpportunity = useCallback(async (id: string) => {
    const request = ++sourceRequest.current; setRefreshing(true); setSelection(null); setSource(null); setError('');
    try {
      const { opportunity: o } = await gateway.opportunityDetail(systemCode, id);
      if (request !== sourceRequest.current) return false;
      setText(`${o.opportunityCode} · ${o.opportunityName}`); setSource(o);
      if (o.status !== 'ACTIVE') { setError('商机已停用，不能新增报价单'); return false; }
      const choice = { id: o.id, label: `${o.opportunityCode} · ${o.opportunityName}`, version: o.version, customerName: o.customerName };
      setSelection(choice); key.current = crypto.randomUUID(); return true;
    } catch (e) { if (request === sourceRequest.current) setError(e instanceof Error ? e.message : '商机加载失败，请重试'); return false; }
    finally { if (request === sourceRequest.current) setRefreshing(false); }
  }, [gateway, systemCode]);
  useEffect(() => {
    if (opportunityId) void loadOpportunity(opportunityId);
    return () => { sourceRequest.current++; };
  }, [opportunityId, loadOpportunity]);
  useEffect(() => {
    let active = true;
    if (!locked && mode === 'INDEPENDENT' && customerId) void gateway.customerDetail(systemCode, customerId).then((r) => {
      if (active) { const choice = { id: customerId, label: r.customer.customerName }; setSelection(choice); setText(choice.label); }
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : '客户加载失败'); });
    return () => { active = false; };
  }, [locked, mode, customerId, systemCode, gateway]);
  useEffect(() => {
    if (locked || selection) { setLoading(false); return; }
    let active = true; setLoading(true);
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ page: String(page), pageSize: '100', keyword: selection ? '' : text });
      const load = async () => {
        if (mode === 'OPPORTUNITY') {
          query.set('status', 'ACTIVE');
          const result = await gateway.opportunities(systemCode, query);
          return { items: result.items.filter((o) => o.status === 'ACTIVE').map((o) => ({ id: o.id, label: `${o.opportunityCode} · ${o.opportunityName}`, version: o.version, customerName: o.customerName })), more: page < result.pagination.totalPages };
        }
        const result = await gateway.customers(systemCode, query);
        return { items: result.items.map((c) => ({ id: c.id, label: `${c.customerCode} · ${c.customerName}` })), more: page < result.pagination.totalPages };
      };
      void load().then((result) => { if (active) { setOptions((old) => page === 1 ? result.items : [...old, ...result.items.filter((x) => !old.some((o) => o.id === x.id))]); setMore(result.more); } }).catch((e) => { if (active) { setOptions([]); setMore(false); setError(e instanceof Error ? e.message : '选项加载失败'); } }).finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [locked, mode, text, selection, page, systemCode, gateway]);
  return <div className="enterprise-modal-backdrop"><form ref={dialog} role="dialog" aria-modal="true" aria-label="新增报价单" className="enterprise-modal quote-create-dialog"
    onKeyDown={(e) => {
      if (e.key === 'Escape' && !saving) { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary') ?? []);
        const first = elements[0], last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }} onSubmit={(e) => {
      e.preventDefault(); if (submitting.current || refreshing) return;
      if (!selection) { setError(mode === 'OPPORTUNITY' ? '请选择一个未关闭的商机' : '请从查询结果中选择客户'); return; }
      if (mode === 'OPPORTUNITY' && !selection.version) { setError('请重新选择商机'); return; }
      submitting.current = true; setSaving(true); setError('');
      const input = mode === 'OPPORTUNITY' ? { mode, opportunityId: selection.id, opportunityVersion: selection.version!, requestKey: key.current } : { mode, customerId: selection.id, requestKey: key.current };
      void quotationApi.create(systemCode, input).then((r) => onCreated(r.id)).catch(async (reason) => {
        const errorMessage = reason instanceof Error ? reason.message : '创建失败，请重试';
        if (mode === 'OPPORTUNITY' && errorMessage.includes('商机信息已更新')) {
          if (await loadOpportunity(selection.id)) setError('商机信息已更新，已刷新客户和产品信息，请重新核对后再次确定创建');
        } else setError(errorMessage);
      }).finally(() => { submitting.current = false; setSaving(false); });
    }}><header><h2>新增报价单</h2><button type="button" disabled={saving} onClick={onClose} aria-label="关闭">×</button></header>
    <div className="modal-body">{error && <p className="enterprise-alert" role="alert">{error}</p>}
      <div className="quote-mode-group" role="radiogroup" aria-label="报价方式">
        <span>报价方式</span>
        {(['OPPORTUNITY', 'INDEPENDENT'] as const).map((value) => <label key={value}>
          <input type="radio" name={`${listId}-mode`} value={value} checked={mode === value} disabled={saving || locked || refreshing} onChange={() => { setMode(value); setSource(null); sourceRequest.current++; setSelection(null); setText(''); setOptions([]); setMore(false); setPage(1); setError(''); key.current = crypto.randomUUID(); }} />
          {value === 'OPPORTUNITY' ? '关联商机报价' : '独立报价'}
        </label>)}
      </div>
      {locked ? <label>关联商机<input readOnly value={text} placeholder="正在加载当前商机…" /></label> : <>
        <label>{mode === 'OPPORTUNITY' ? '选择商机' : '选择客户'}<input role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded={!saving && options.length > 0} list={listId} disabled={saving || refreshing} value={text} placeholder={mode === 'OPPORTUNITY' ? '输入商机编码或名称查询' : '输入客户编码或名称查询'} onChange={(e) => { const value = e.target.value; setText(value); setSource(null); setSelection(options.find((o) => o.label === value) ?? null); setPage(1); setError(''); key.current = crypto.randomUUID(); }} /></label>
        <datalist id={listId}>{options.map((o) => <option key={o.id} value={o.label} />)}</datalist>
      </>}
      {mode === 'OPPORTUNITY' && (locked || selection) && <label>客户名称<input readOnly value={source?.customerName ?? selection?.customerName ?? ''} /></label>}
      {source && <details className="quote-source-products" open={!!error}><summary>待带入产品（{source.products?.length ?? 0} 项）</summary><div className="enterprise-table-wrap"><table><thead><tr><th>产品</th><th>数量</th><th>单价</th><th>需求说明</th></tr></thead><tbody>{source.products?.map((p) => <tr key={p.id}><td>{p.productName}</td><td>{p.quantity}</td><td>{p.unitPrice}</td><td>{p.requirement || '—'}</td></tr>)}</tbody></table></div></details>}
      {loading || refreshing ? <p role="status" className="quote-hint">正在查询…</p> : !locked && !options.length && !selection ? <p role="status" className="quote-hint">没有匹配记录</p> : null}
      {locked && error && !selection && <button type="button" disabled={saving || refreshing} onClick={() => void loadOpportunity(opportunityId!)}>重新加载商机</button>}
      {!locked && !selection && more && <button type="button" disabled={loading || saving || refreshing} onClick={() => setPage((p) => p + 1)}>加载更多</button>}
      <p className="quote-hint">确认后生成报价单，客户及商机关联不可更改。{mode === 'OPPORTUNITY' ? '商机产品将自动带入报价明细。' : ''}</p>
    </div><footer><button type="button" disabled={saving} onClick={onClose}>取消</button><button type="submit" className="is-primary" disabled={saving || refreshing || !selection} aria-busy={saving}>{saving ? '创建中…' : '确定'}</button></footer>
  </form></div>;
}
