import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { inboundOrderWriteSchema, type InboundOrder, type InboundOrderWrite, type Item, type LegalEntity, type Warehouse } from '@interaction-pattern-lab/contracts';
import { DocumentWorkspace } from '../common/DocumentWorkspace';
import { DetailSection } from '../common/DetailWorkspace';
import { RowActionButton } from '../common/RowActionButton';
import type { EnterpriseGateway } from './gateway';

type Props = { systemCode: string; orderId: string; allowedActions: string[]; gateway: EnterpriseGateway; registerGuard?: (guard: (() => boolean) | null) => void };
const statusName = (status: InboundOrder['status']) => ({ DRAFT: '草稿', POSTED: '已过账', REVERSED: '已冲销', VOIDED: '已作废' })[status];
const typeNames = { PRODUCTION: '生产入库', FINISHED_GOODS: '成品入库', STOCK_GAIN: '盘盈入库', TRANSFER: '调拨入库（暂未启用）' };
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作失败，请稍后重试';
const toForm = (order: InboundOrder): InboundOrderWrite => ({ legalEntityId: order.legalEntityId, warehouseId: order.warehouseId, documentDate: order.documentDate, inboundType: order.inboundType, reasonCode: order.reasonCode, factoryCode: order.factoryCode, currencyCode: order.currencyCode, remark: order.remark, version: order.version, lines: order.lines.map(({ lineNo, itemCode, batchNo, originalQty, actualQty, amount, remark }) => ({ lineNo, itemCode, batchNo, originalQty, actualQty, amount, remark })) });

export function InboundOrderDetailPage({ systemCode, orderId, allowedActions, gateway, registerGuard }: Props) {
  const [detail, setDetail] = useState<InboundOrder | null>(null), [form, setForm] = useState<InboundOrderWrite | null>(null);
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [entities, setEntities] = useState<LegalEntity[]>([]), [warehouses, setWarehouses] = useState<Warehouse[]>([]), [items, setItems] = useState<Item[]>([]);
  const formId = useId(), busyRef = useRef(false), dirtyRef = useRef(false);
  const canEdit = detail?.status === 'DRAFT' && allowedActions.includes('update'), editable = editing && canEdit;
  const dirty = useMemo(() => editing && detail !== null && JSON.stringify(form) !== JSON.stringify(toForm(detail)), [editing, detail, form]);
  dirtyRef.current = dirty;
  const accept = useCallback((order: InboundOrder) => { setDetail(order); setForm(toForm(order)); setEditing(false); }, []);
  const load = useCallback(async () => { setLoading(true); setError(''); try { accept(await gateway.inboundOrder(systemCode, orderId)); } catch (reason) { setError(errorText(reason)); } finally { setLoading(false); } }, [gateway, systemCode, orderId, accept]);
  useEffect(() => { void load(); }, [load]);
  const leave = useCallback(() => { if (busyRef.current || (dirtyRef.current && !window.confirm('入库单尚未保存，确定放弃修改吗？'))) return false; dirtyRef.current = false; if (detail) setForm(toForm(detail)); setEditing(false); return true; }, [detail]);
  useEffect(() => { registerGuard?.(leave); return () => registerGuard?.(null); }, [registerGuard, leave]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty || busyRef.current) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const back = () => { if (leave()) window.location.hash = '#/showcase/inbound-orders'; };
  const startEdit = async () => {
    if (!canEdit || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const query = new URLSearchParams({ page: '1', pageSize: '100', status: 'ACTIVE' });
      const [e, w, i] = await Promise.all([gateway.legalEntities(systemCode, query), gateway.warehouses(systemCode, query), gateway.items(systemCode, query)]);
      setEntities(e.items); setWarehouses(w.items); setItems(i.items); setEditing(true);
    } catch (reason) { setError(errorText(reason)); } finally { busyRef.current = false; setBusy(false); }
  };
  // Write responses may omit joined names; retain the current or selected reference labels.
  const withNames = (saved: InboundOrder): InboundOrder => ({ ...saved, legalEntityName: saved.legalEntityName || entities.find((e) => e.id === saved.legalEntityId)?.entityName || (detail?.legalEntityId === saved.legalEntityId ? detail.legalEntityName : ''), warehouseName: saved.warehouseName || warehouses.find((w) => w.id === saved.warehouseId)?.warehouseName || (detail?.warehouseId === saved.warehouseId ? detail.warehouseName : '') });
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!detail || !form || !editable || busyRef.current) return;
    setError(''); setNotice('');
    if (!form.lines.length) { setError('请至少添加一行入库明细'); return; }
    const parsed = inboundOrderWriteSchema.safeParse(form);
    if (!parsed.success) { setError(`请检查单据信息：${parsed.error.issues.map((issue) => issue.message).join('；')}`); return; }
    busyRef.current = true; setBusy(true);
    try { accept(withNames(await gateway.updateInboundOrder(systemCode, detail.id, parsed.data))); setNotice('入库单已保存'); }
    catch (reason) { setError(errorText(reason)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const command = async (action: 'post' | 'reverse' | 'void') => {
    if (!detail || editing || busyRef.current || !allowedActions.includes(action)) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { accept(withNames(await gateway.commandInboundOrder(systemCode, detail.id, action, { version: detail.version, requestKey: crypto.randomUUID(), note: action === 'reverse' ? '页面冲销' : '' }))); }
    catch (reason) { setError(errorText(reason)); } finally { busyRef.current = false; setBusy(false); }
  };
  if (loading || !detail || !form) return <DocumentWorkspace title="入库单" fields={[]} backLabel="返回入库单列表" onBack={back}><p role={error ? 'alert' : 'status'}>{error || '正在加载入库单…'}</p>{error && <button type="button" onClick={() => void load()}>重试</button>}</DocumentWorkspace>;
  const set = <K extends keyof InboundOrderWrite>(key: K, value: InboundOrderWrite[K]) => { setNotice(''); setForm({ ...form, [key]: value }); };
  const changeLine = (index: number, patch: Partial<InboundOrderWrite['lines'][number]>) => set('lines', form.lines.map((line, i) => i === index ? { ...line, ...patch } : line));
  const warehouseOptions = warehouses.filter((w) => w.legalEntityId === form.legalEntityId);
  return <DocumentWorkspace title={detail.orderNo} status={<span className="status-pill">{statusName(detail.status)}</span>} backLabel="返回入库单列表" onBack={back} fields={[
    { label: '法人', value: detail.legalEntityName || '—' }, { label: '仓库', value: detail.warehouseName || '—' }, { label: '创建日期', value: new Date(detail.createdAt).toLocaleString('zh-CN') },
  ]} actions={editable ? <><button type="button" disabled={busy} onClick={() => { if (leave()) { setForm(toForm(detail)); setEditing(false); setError(''); } }}>取消编辑</button><button type="submit" form={formId} className="is-primary" disabled={busy}>{busy ? '保存中…' : '保存'}</button></> : <>
    {canEdit && <button type="button" className="is-primary" disabled={busy} onClick={() => void startEdit()}>{busy ? '处理中…' : '编辑'}</button>}
    {!editing && detail.status === 'DRAFT' && allowedActions.includes('post') && <button type="button" disabled={busy} onClick={() => void command('post')}>审核过账</button>}
    {!editing && detail.status === 'DRAFT' && allowedActions.includes('void') && <button type="button" disabled={busy} onClick={() => void command('void')}>作废</button>}
    {!editing && detail.status === 'POSTED' && allowedActions.includes('reverse') && <button type="button" disabled={busy} onClick={() => void command('reverse')}>冲销</button>}
  </>}>
    {error && <div role="alert" className="enterprise-alert document-error">{error}</div>}{notice && <p role="status">{notice}</p>}
    <form id={formId} onSubmit={save}>
      <DetailSection title="入库信息"><fieldset className="form-grid document-fields" disabled={busy}>
        <label>入库单号<input value={detail.orderNo} readOnly /></label><label>状态<input value={statusName(detail.status)} readOnly /></label>
        <label>制单日期<input type="date" required value={form.documentDate} disabled={!editable} onChange={(e) => set('documentDate', e.target.value)} /></label>
        <label>入库类型<select value={form.inboundType} disabled={!editable} onChange={(e) => set('inboundType', e.target.value as InboundOrderWrite['inboundType'])}>{Object.entries(typeNames).map(([key, label]) => <option key={key} value={key} disabled={key === 'TRANSFER'}>{label}</option>)}</select></label>
        <label>入库法人<select required value={form.legalEntityId} disabled={!editable} onChange={(e) => { const id = e.target.value; setForm({ ...form, legalEntityId: id, warehouseId: warehouses.find((w) => w.legalEntityId === id)?.id ?? '' }); }}><option value="">请选择</option>{!entities.some((e) => e.id === form.legalEntityId) && <option value={form.legalEntityId}>{detail.legalEntityName || '原法人'}</option>}{entities.map((e) => <option key={e.id} value={e.id}>{e.entityName}</option>)}</select></label>
        <label>入库仓库<select required value={form.warehouseId} disabled={!editable} onChange={(e) => set('warehouseId', e.target.value)}><option value="">请选择</option>{form.warehouseId && !warehouseOptions.some((w) => w.id === form.warehouseId) && <option value={form.warehouseId}>{detail.warehouseName || '原仓库'}</option>}{warehouseOptions.map((w) => <option key={w.id} value={w.id}>{w.warehouseName}</option>)}</select></label>
        <label>入库原因<input required value={form.reasonCode} disabled={!editable} onChange={(e) => set('reasonCode', e.target.value.toUpperCase())} /></label>
        <label>工厂代码<input value={form.factoryCode ?? ''} disabled={!editable} onChange={(e) => set('factoryCode', e.target.value.toUpperCase() || null)} /></label>
        <label>币别<input value={detail.currencyCode} readOnly /></label><label className="span-2">备注<textarea aria-label="备注" rows={3} maxLength={1000} value={form.remark ?? ''} disabled={!editable} onChange={(e) => set('remark', e.target.value || null)} /></label>
      </fieldset></DetailSection>
      <DetailSection title={`入库明细（${form.lines.length}）`} actions={editable && <button type="button" disabled={busy || !items.length || form.lines.length >= 500} onClick={() => set('lines', [...form.lines, { lineNo: Math.max(0, ...form.lines.map((line) => line.lineNo)) + 10, itemCode: items[0]?.itemCode ?? '', batchNo: null, originalQty: null, actualQty: '1', amount: '0', remark: null }])}><IconPlus size={16} />添加行</button>}>
        <div className="enterprise-table-wrap"><table className="document-grid" aria-label="入库明细"><thead><tr><th>行号</th><th>物料编码</th><th>物料名称</th><th>批次</th><th>原单数量</th><th>实际数量</th><th>单位</th><th>金额</th><th>行备注</th>{editable && <th className="document-line-actions">操作</th>}</tr></thead><tbody>
          {form.lines.map((line, index) => { const item = items.find((i) => i.itemCode === line.itemCode), original = detail.lines.find((l) => l.itemCode === line.itemCode); return <tr key={line.lineNo}>
            <td>{line.lineNo}</td><td>{editable ? <select aria-label={`第${index + 1}行物料`} disabled={busy} value={line.itemCode} onChange={(e) => changeLine(index, { itemCode: e.target.value })}>{!items.some((i) => i.itemCode === line.itemCode) && <option value={line.itemCode}>{line.itemCode}</option>}{items.map((i) => <option key={i.id} value={i.itemCode}>{i.itemCode} · {i.itemName}</option>)}</select> : line.itemCode}</td>
            <td>{item?.itemName ?? original?.itemName ?? '—'}</td><td>{editable ? <input aria-label={`第${index + 1}行批次`} maxLength={64} disabled={busy} value={line.batchNo ?? ''} onChange={(e) => changeLine(index, { batchNo: e.target.value || null })} /> : line.batchNo || '—'}</td>
            <td>{editable ? <input aria-label={`第${index + 1}行原单数量`} type="number" min="0" step="0.0001" disabled={busy} value={line.originalQty ?? ''} onChange={(e) => changeLine(index, { originalQty: e.target.value || null })} /> : line.originalQty ?? '—'}</td>
            <td>{editable ? <input aria-label={`第${index + 1}行实际数量`} type="number" required min="0.0001" step="0.0001" disabled={busy} value={line.actualQty} onChange={(e) => changeLine(index, { actualQty: e.target.value })} /> : line.actualQty}</td><td>{item?.baseUnit ?? original?.baseUnit ?? '—'}</td>
            <td>{editable ? <input aria-label={`第${index + 1}行金额`} type="number" required min="0" step="0.01" disabled={busy} value={line.amount} onChange={(e) => changeLine(index, { amount: e.target.value })} /> : line.amount}</td>
            <td>{editable ? <input className="document-line-remark" aria-label={`第${index + 1}行备注`} maxLength={1000} disabled={busy} value={line.remark ?? ''} onChange={(e) => changeLine(index, { remark: e.target.value || null })} /> : line.remark || '—'}</td>
            {editable && <td className="document-line-actions"><RowActionButton type="button" label="删除" aria-label={`删除第${index + 1}行`} disabled={busy} onClick={() => set('lines', form.lines.filter((_, i) => i !== index))} /></td>}
          </tr>; })}
          {!form.lines.length && <tr><td className="empty-cell" colSpan={editable ? 10 : 9}>{editable ? '暂无明细，请添加行' : '暂无入库明细'}</td></tr>}
        </tbody></table></div>
      </DetailSection>
    </form>
  </DocumentWorkspace>;
}
