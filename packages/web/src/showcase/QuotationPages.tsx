import { DetailWorkspace, DetailHeader } from '../common/DetailWorkspace';
import { RowActionButton } from '../common/RowActionButton';
import { useEffect, useRef, useState } from 'react';
import { quotationDraftSchema, quotationLineAmount, quotationTotal, suggestedPrice, type Product, type ProductPrice, type QuotationRecord } from '@interaction-pattern-lab/contracts';
import { httpNavigationGateway, type EnterpriseGateway } from './gateway';
import { BusinessDirectory } from '../common/BusinessDirectory';
import { quotationApi } from './quotation-api';
import './quotation.css';
import { QuotationCreateDialog } from './QuotationCreateDialog';
import { QuotationLineDialog, type EditorLine } from './QuotationLineDialog';

const message = (e: unknown) => e instanceof Error ? e.message : '操作失败，请重试';
const today = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const statusNames: Record<string, string> = { DRAFT: '草稿', SUBMITTED: '已提交', ACCEPTED: '已接受', REJECTED: '已拒绝', EXPIRED: '已失效' };
const openQuote = (id: string) => { window.location.hash = `/showcase/quotations/${id}`; };

export function PricingEditor({ systemCode, productId, canManage, onClose }: { systemCode: string; productId: string; canManage: boolean; onClose: () => void }) {
  const [pricingType, setPricingType] = useState<'STANDARD' | 'TIERED'>('STANDARD');
  const [price, setPrice] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [expiresDate, setExpiresDate] = useState('');
  const [remark, setRemark] = useState('');
  const [tiers, setTiers] = useState<ProductPrice['tiers']>([]); const [version, setVersion] = useState(0);
  const [history, setHistory] = useState<ProductPrice[]>([]); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => { void quotationApi.prices(systemCode, productId).then((x) => {
    setVersion(x.history[0]?.version ?? 0);
    setPricingType(x.current?.pricingType ?? 'STANDARD');
    setPrice(x.current?.unitPrice ?? '');
    setEffectiveDate(x.current?.effectiveDate ?? today());
    setExpiresDate(x.current?.expiresDate ?? '');
    setRemark(x.current?.remark ?? '');
    setTiers(x.current?.tiers ?? []);
    setHistory(x.history);
  }).catch((e) => setError(message(e))).finally(() => setLoading(false)); }, [systemCode, productId]);
  const changeTier = (index: number, key: 'from' | 'to' | 'price', value: string) => setTiers((t) => t.map((x, i) => i === index ? { ...x, [key]: key === 'to' && !value ? null : value } : x));
  return <div className="enterprise-modal-backdrop"><form role="dialog" aria-modal="true" aria-label="销售定价" className="enterprise-modal quote-price-dialog" onSubmit={(e) => {
    e.preventDefault(); if (saving) return; setSaving(true); setError('');
    void quotationApi.priceSave(systemCode, productId, { version, pricingType, currencyCode: 'CNY', unitPrice: pricingType === 'STANDARD' ? price : null, effectiveDate, expiresDate: expiresDate || null, remark: remark || null, tiers: pricingType === 'TIERED' ? tiers : [] }).then(onClose).catch((reason) => setError(message(reason))).finally(() => setSaving(false));
  }}><header><h2>销售定价 <small>版本 {version}</small></h2><button type="button" disabled={saving} onClick={onClose} aria-label="关闭">×</button></header><div className="modal-body">
    {error && <p role="alert" className="enterprise-alert">{error}</p>}
    <fieldset className="form-grid" disabled={saving || loading || !canManage}>
      <label>定价类型<select value={pricingType} onChange={(e) => setPricingType(e.target.value as 'STANDARD' | 'TIERED')}><option value="STANDARD">标准</option><option value="TIERED">阶梯</option></select></label>
      <label>币别<input readOnly value="CNY" /></label>
      {pricingType === 'STANDARD' && <label>标准含税价（CNY）<input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>}
      <label>生效日期<input required type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></label>
      <label>失效日期<input type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)} /></label>
      <label>当前是否有效<input readOnly value={effectiveDate <= today() && (!expiresDate || expiresDate >= today()) ? '是' : '否'} /></label>
      <label className="span-2">备注<textarea value={remark} onChange={(e) => setRemark(e.target.value)} /></label>
    </fieldset>
    {pricingType === 'TIERED' && <fieldset disabled={saving || loading || !canManage}>
      <div className="table-toolbar"><strong>数量阶梯</strong><button type="button" onClick={() => setTiers([...tiers, { from: tiers.at(-1)?.to ?? '0', to: null, price: price || '0.00' }])}>添加阶梯</button></div>
      <p className="quote-hint">按单行数量取价；下界包含、上界不包含。配置须从 0 连续覆盖，末段上界留空。</p>
      <table><thead><tr><th>阶梯数量从</th><th>阶梯数量至</th><th>含税单价</th><th>操作</th></tr></thead><tbody>{tiers.map((t, i) => <tr key={i}><td><input aria-label={`阶梯${i + 1}下界`} value={t.from} onChange={(e) => changeTier(i, 'from', e.target.value)} /></td><td><input aria-label={`阶梯${i + 1}上界`} placeholder="无上限" value={t.to ?? ''} onChange={(e) => changeTier(i, 'to', e.target.value)} /></td><td><input aria-label={`阶梯${i + 1}价格`} value={t.price} onChange={(e) => changeTier(i, 'price', e.target.value)} /></td><td><RowActionButton type="button" onClick={() => setTiers(tiers.filter((_, index) => index !== i))} label="删除" /></td></tr>)}</tbody></table>
    </fieldset>}
    <details><summary>历史版本（{history.length}）</summary>{history.map((p) => <p key={p.id}>v{p.version} · {p.pricingType === 'TIERED' ? `阶梯价（${p.tiers.length} 段）` : `标准价 ¥${p.unitPrice}`} · CNY · {p.effectiveDate} 至 {p.expiresDate ?? '长期'} · {p.isEffective ? '当前有效' : '非当前有效'}</p>)}</details>
  </div><footer><button type="button" disabled={saving} onClick={onClose}>关闭</button>{canManage && <button className="is-primary" disabled={saving || loading} type="submit">{saving ? '保存中…' : '保存定价'}</button>}</footer></form></div>;
}

export function QuotationListPage({ systemCode, allowedActions, customerId, opportunityId, creationDisabledReason, gateway = httpNavigationGateway }: { systemCode: string; allowedActions: string[]; customerId?: string; opportunityId?: string; creationDisabledReason?: string; gateway?: EnterpriseGateway }) {
  const [creating, setCreating] = useState(false);
  return <><BusinessDirectory objectCode="quotation-directory" systemCode={systemCode} gateway={gateway} loadRows={quotationApi.list} rowKey={(item) => item.id}
    statusOptions={statusNames} keywordPlaceholder="报价单号 / 标题" fixedFilters={{ ...(customerId ? { customerId } : {}), ...(opportunityId ? { opportunityId } : {}) }}
    addDisabledReason={creationDisabledReason} addLabel="新增报价单" onAdd={allowedActions.includes('create') ? () => setCreating(true) : undefined}
    render={(item, key) => key === 'quoteCode' && allowedActions.includes('view') ? <a className="record-detail-link" href={`#/showcase/quotations/${item.id}`}>{item.quoteCode}</a> : key === 'status' ? <span className="status-pill">{statusNames[item.status]}</span> : String(item[key as keyof QuotationRecord] ?? '—')} />{creating && <QuotationCreateDialog systemCode={systemCode} gateway={gateway} customerId={customerId} opportunityId={opportunityId} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); openQuote(id); }} />}</>;
}

type QuotationDetailProps = { systemCode: string; id: string; gateway: EnterpriseGateway; allowedActions: string[]; registerGuard?: (guard: (() => boolean) | null) => void };
export function QuotationDetailPage(props: QuotationDetailProps) {
  const initial = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  if (props.id === 'new') return props.allowedActions.includes('create') ? <QuotationCreateDialog systemCode={props.systemCode} gateway={props.gateway} opportunityId={initial.get('opportunityId') ?? undefined} customerId={initial.get('customerId') ?? undefined} onClose={() => { window.location.hash = '/showcase/quotations'; }} onCreated={openQuote} /> : <p role="alert">无新增报价权限</p>;
  return <QuotationEditor key={`${props.systemCode}:${props.id}`} {...props} />;
}
function QuotationEditor({ systemCode, id, gateway, allowedActions, registerGuard }: QuotationDetailProps) {
  const initial = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [record, setRecord] = useState<QuotationRecord | null>(null), [form, setForm] = useState({ title: '', customerId: initial.get('customerId') ?? '', contactId: '', opportunityId: initial.get('opportunityId') ?? '', quoteDate: today(), validUntil: today(), terms: '', remark: '' });
  const [lines, setLines] = useState<EditorLine[]>([]), [products, setProducts] = useState<Product[]>([]), [contacts, setContacts] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [notice, setNotice] = useState('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null), [actionError, setActionError] = useState(''), [feedback, setFeedback] = useState('');
  const [selectedLines, setSelectedLines] = useState<string[]>([]); const pendingKey = useRef(crypto.randomUUID()); const actionKey = useRef(crypto.randomUUID());
  const priceCache = useRef(new Map<string, ProductPrice>());
  const [lineDialog, setLineDialog] = useState<EditorLine | null | undefined>(undefined);
  const dirtyRef = useRef(false);
  const editable = record?.status === 'DRAFT' && allowedActions.includes('edit');
  const assign = (r: QuotationRecord) => { setRecord((previous) => previous?.id === r.id ? { ...previous, ...r } : r); setForm({ title: r.title, customerId: r.customerId, contactId: r.contactId ?? '', opportunityId: r.opportunityId ?? '', quoteDate: r.quoteDate, validUntil: r.validUntil, terms: r.terms, remark: r.remark }); setLines(r.lines.map((l) => ({ ...l, suggested: l.suggestedPrice, source: l.priceSource, manual: l.unitPrice !== l.suggestedPrice }))); setDirty(false); dirtyRef.current = false; pendingKey.current = crypto.randomUUID(); };
  useEffect(() => { let active = true; if (id !== 'new') void quotationApi.detail(systemCode, id).then((x) => { if (active) assign(x); }).catch((e) => { if (active) setError(message(e)); }); else { setRecord(null); setLines([]); } void gateway.products(systemCode, new URLSearchParams({ pageSize: '100' })).then((p) => { if (active) setProducts(p.items); }).catch((e) => { if (active) setError(message(e)); }); return () => { active = false; }; }, [systemCode, id, gateway]);
  useEffect(() => { let alive = true; if (form.customerId) void gateway.customerDetail(systemCode, form.customerId).then((r) => { if (alive) setContacts(r.contacts); }).catch((e) => { if (alive) setError(message(e)); }); else setContacts([]); return () => { alive = false; }; }, [form.customerId, gateway, systemCode]);
  useEffect(() => { const guard = () => (!dirtyRef.current && lineDialog === undefined) || window.confirm('报价尚未保存，确定离开并丢弃修改吗？'); registerGuard?.(guard); const unload = (e: BeforeUnloadEvent) => { if (dirty || lineDialog !== undefined) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', unload); return () => { registerGuard?.(null); window.removeEventListener('beforeunload', unload); }; }, [dirty, registerGuard, lineDialog]);
  const changed = () => { dirtyRef.current = true; setDirty(true); setNotice(''); pendingKey.current = crypto.randomUUID(); };
  const amount = (l: EditorLine) => { try { return quotationLineAmount(l.quantity, l.unitPrice, l.discount); } catch { return null; } };
  let total = '—'; try { if (lines.every((l) => amount(l) !== null)) total = quotationTotal(lines.map((l) => amount(l)!)); } catch { /* Show invalid amount without silently coercing it. */ }
  const save = async () => { if (busy || lineDialog !== undefined) return; setBusy(true); setError(''); try {
    const input = quotationDraftSchema.safeParse({ ...form, contactId: form.contactId || null, opportunityId: form.opportunityId || null, version: record?.version ?? 0, requestKey: pendingKey.current, lines: lines.map(({ id, productId, priceId, quantity, unitPrice, discount, delivery, remark }) => ({ id, productId, priceId, quantity, unitPrice, discount, delivery, remark })) });
    if (!input.success) throw new Error(input.error.issues.map((i) => `${i.path.join('.')}：${i.message}`).join('；'));
    const next = await quotationApi.save(systemCode, record?.id ?? null, input.data); assign(next); setNotice('报价已保存'); if (id === 'new') openQuote(next.id);
  } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  const perform = async () => { if (!record || !confirmAction || busy) return; setBusy(true); setActionError(''); try {
    const result = await quotationApi.command(systemCode, record.id, confirmAction, { version: record.version, requestKey: actionKey.current, note: feedback, keepPrices: false, ...(record.opportunity ? { opportunityVersion: record.opportunity.version } : {}) });
    setConfirmAction(null); if (confirmAction === 'copy') openQuote(result.id); else assign(await quotationApi.detail(systemCode, record.id));
  } catch (e) { setActionError(message(e)); } finally { setBusy(false); } };
  const action = (name: string) => { setActionError(''); setFeedback(''); actionKey.current = crypto.randomUUID(); setConfirmAction(name); };
  return <DetailWorkspace className="quotation-page">
    <DetailHeader title={record?.quoteCode ?? '加载报价单…'} backLabel="返回报价列表" onBack={() => { window.location.hash = '/showcase/quotations'; }} fields={[
      { label: '客户名称', value: record?.customerName ?? '—' },
      ...(record?.opportunityId ? [{ label: '商机名称', value: record.opportunity?.opportunityName ? <a className="record-detail-link" href={`#/showcase/opportunities/${record.opportunityId}`}>{record.opportunity.opportunityName}</a> : '—' }] : []),
      { label: '状态', value: <span className="status-pill">{statusNames[record?.status ?? 'DRAFT']}</span> },
      { label: '创建日期', value: record?.createdAt ? new Date(record.createdAt).toLocaleString('zh-CN') : '—' }, { label: '创建人', value: record?.creatorName ?? '—' },
    ]} actions={<>{editable && <button className="is-primary" disabled={busy || lineDialog !== undefined} onClick={() => void save()}>保存草稿</button>}{record?.status === 'DRAFT' && allowedActions.includes('submit') && <button disabled={busy || dirty} onClick={() => action('submit')}>提交报价</button>}{record?.status === 'SUBMITTED' && allowedActions.includes('feedback') && <><button disabled={busy} onClick={() => action('accept')}>登记接受</button><button disabled={busy} onClick={() => action('reject')}>登记拒绝</button></>}{record && record.status !== 'DRAFT' && allowedActions.includes('copy') && <button disabled={busy} onClick={() => action('copy')}>复制新报价</button>}{record?.status === 'ACCEPTED' && record.opportunity && allowedActions.includes('writeback') && <button disabled={busy} onClick={() => action('writeback')}>回写预签金额</button>}{record && allowedActions.includes('export') && <button disabled={busy || dirty} onClick={() => { setBusy(true); setError(''); void quotationApi.pdf(systemCode, record.id).then((blob) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${record.quoteCode}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }).catch((e) => setError(message(e))).finally(() => setBusy(false)); }}>导出 PDF</button>}</>} />
    {error && <p className="enterprise-alert" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{dirty && <p className="quote-hint">有未保存修改；提交前请先保存草稿。</p>}
    <section className="detail-section quote-form"><fieldset className="form-grid" disabled={!editable || busy}>
      <label className="span-2">报价标题<input maxLength={200} value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); changed(); }} /></label>
      <label>报价日期<input type="date" value={form.quoteDate} onChange={(e) => { setForm({ ...form, quoteDate: e.target.value }); changed(); }} /></label>
      <label>有效期至<input type="date" value={form.validUntil} onChange={(e) => { setForm({ ...form, validUntil: e.target.value }); changed(); }} /></label>
      <label>报价合计<input className="quote-amount-input" readOnly value={total} /></label><label>币别<input readOnly value="人民币 CNY" /></label>
      <label>客户联系人{!editable && record ? <input readOnly value={record.contactName ?? '未指定'} /> : <select aria-label="客户联系人" value={form.contactId} onChange={(e) => { setForm({ ...form, contactId: e.target.value }); changed(); }}><option value="">未指定</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}</label>
      <label>报价人<input readOnly value={record?.ownerName ?? '—'} /></label>
      <label className="span-2">报价条款<textarea maxLength={8000} rows={3} value={form.terms} onChange={(e) => { setForm({ ...form, terms: e.target.value }); changed(); }} /></label>
      <label className="span-2">备注<textarea maxLength={2000} rows={2} placeholder="内部备注，不导出" value={form.remark} onChange={(e) => { setForm({ ...form, remark: e.target.value }); changed(); }} /></label>
    </fieldset></section>
    <section className="detail-section table-card"><div className="table-toolbar"><strong>报价明细</strong>{editable && <><button disabled={busy} onClick={() => setLineDialog(null)}>＋ 添加行</button><button disabled={busy || !selectedLines.length} onClick={() => { if (window.confirm(`删除选中的 ${selectedLines.length} 行？`)) { setLines(lines.filter((l) => !selectedLines.includes(l.id))); setSelectedLines([]); changed(); } }}>删除选中行</button><button disabled={busy || !lines.length} onClick={async () => { setBusy(true); try { const next = await Promise.all(lines.map(async (l) => { const { current } = await quotationApi.prices(systemCode, l.productId, undefined, form.quoteDate); if (!current) throw new Error('产品在报价日期无有效价格'); priceCache.current.set(current.id, current); const s = suggestedPrice(current.standardPrice, current.tiers, l.quantity); return { ...l, priceId: current.id, unitPrice: s.price, suggested: s.price, source: s.source, lowerQty: s.from, upperQty: s.to, manual: false }; })); const diff = next.map((l, i) => `${i + 1}. ${l.productName}：${lines[i].unitPrice} → ${l.unitPrice}`).join('\n'); if (window.confirm(`重新取价将替换手工成交价：\n${diff}\n确认应用？`)) { setLines(next); changed(); } } catch (e) { setError(message(e)); } finally { setBusy(false); } }}>重新取价</button></>}</div>
    <div className="enterprise-table-wrap"><table className="quote-lines"><thead><tr>{editable && <th>选择</th>}<th>序号</th><th>产品 / 型号</th><th>单位</th><th>数量</th><th>建议价 / 来源</th><th>成交单价</th><th>折扣 %</th><th>含税小计</th><th>交付说明</th><th>行备注</th>{editable && <th>操作</th>}</tr></thead><tbody>{lines.map((l, i) => <tr key={l.id}>{editable && <td><input type="checkbox" aria-label={`选择第${i + 1}行`} checked={selectedLines.includes(l.id)} onChange={(e) => setSelectedLines(e.target.checked ? [...selectedLines, l.id] : selectedLines.filter((x) => x !== l.id))} /></td>}<td>{i + 1}</td><td><strong>{l.productName}</strong><small>{l.model || '—'}</small></td><td>{l.unit}</td><td>{l.quantity}</td><td>{l.suggested}<small>{l.source === 'TIER' ? '阶梯价' : '标准价'} <span title={`取价版本 ID：${l.priceId}`}>· {priceCache.current.get(l.priceId) ? `v${priceCache.current.get(l.priceId)!.version}` : l.priceId.slice(0, 8)}</span>{l.source === 'TIER' && <span> · [{l.lowerQty ?? '0'}, {l.upperQty ?? '∞'})</span>}{l.manual ? ' · 已改价' : ''}</small></td><td>{l.unitPrice}</td><td>{l.discount}</td><td className="quote-money">{amount(l) ?? '请检查输入'}</td><td>{l.delivery || '—'}</td><td>{l.remark || '—'}</td>{editable && <td><RowActionButton aria-label={`编辑第${i + 1}行`} disabled={busy} onClick={() => setLineDialog({ ...l })} label="编辑" /><RowActionButton disabled={i === 0 || busy} onClick={() => { const next = [...lines]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setLines(next); changed(); }} label="上移" /></td>}</tr>)}</tbody></table></div><div className="quote-total">含税总金额（CNY） <strong>¥ {total}</strong></div></section>
    {lineDialog !== undefined && editable && <QuotationLineDialog initial={lineDialog} products={products} systemCode={systemCode} businessDate={form.quoteDate} gateway={gateway} onClose={() => setLineDialog(undefined)} onConfirm={(line) => { setLines((old) => lineDialog ? old.map((l) => l.id === line.id ? line : l) : [...old, line]); changed(); setLineDialog(undefined); }} />}
    {record?.sourceQuoteId && <p>来源报价：<button onClick={() => openQuote(record.sourceQuoteId!)}>查看原报价</button></p>}
    {record?.events && <section className="detail-section quote-history"><h3>操作记录</h3>{record.events.map((e) => <p key={e.id}><time>{new Date(e.createdAt).toLocaleString('zh-CN')}</time> · {e.action} {e.note}</p>)}</section>}
    {confirmAction && <div className="enterprise-modal-backdrop"><div role="dialog" aria-modal="true" aria-label="确认报价操作" className="enterprise-modal"><header><h2>确认操作</h2></header><div className="modal-body">{actionError && <p role="alert" className="enterprise-alert">{actionError}</p>}{confirmAction === 'submit' ? <p>提交后表头与明细不可再编辑。系统将再次校验报价日期对应的有效定价，确认提交？</p> : confirmAction === 'writeback' ? <p>以报价 {record?.quoteCode} 总额 ¥{record?.total} 替换商机当前预签金额 ¥{record?.opportunity?.expectedAmount ?? '未填写'}（{record?.opportunity?.amountSource}）。差额 ¥{(() => { const cents = (v: string) => { const [a,b = ''] = v.split('.'); return BigInt(a) * 100n + BigInt(b.padEnd(2, '0')); }; const n = cents(record?.total ?? '0.00') - cents(record?.opportunity?.expectedAmount ?? '0.00'); return `${n < 0n ? '-' : '+'}${(n < 0n ? -n : n) / 100n}.${String((n < 0n ? -n : n) % 100n).padStart(2, '0')}`; })()}。不会改变阶段、预算或商品行。</p> : <p>确认{confirmAction === 'accept' ? '登记客户接受' : confirmAction === 'reject' ? '登记客户拒绝' : '复制为新的草稿报价'}？</p>}<label>操作说明<textarea disabled={busy} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></label></div><footer><button disabled={busy} onClick={() => setConfirmAction(null)}>取消</button><button className="is-primary" disabled={busy} onClick={() => void perform()}>{busy ? '处理中…' : '确认'}</button></footer></div></div>}
  </DetailWorkspace>;
}
