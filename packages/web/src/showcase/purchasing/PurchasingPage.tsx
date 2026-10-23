import { useCallback, useEffect, useRef, useState, useMemo, useId, type ReactNode } from 'react';
import { supplierWriteSchema, purchaseOrderWriteSchema, purchaseReceiptWriteSchema, type SupplierWrite } from '@forge-crm/contracts';
import { BusinessDirectory, type ListViewGateway } from '../../common/BusinessDirectory';
import { DocumentWorkspace } from '../../common/DocumentWorkspace';
import { DetailSection } from '../../common/DetailWorkspace';
import { RowActionButton } from '../../common/RowActionButton';
import { SalesActionDialog } from '../../common/SalesActionDialog';
import { call, write } from '../gateway';
import './purchasing.css';
type Kind = 'supplier' | 'order' | 'receipt';
type Props = {
    path: string;
    systemCode: string;
    userId: string;
    gateway: ListViewGateway;
    allowedActions: string[];
    onNavigate: (path: string) => void;
};
type Line = {
    id?: string;
    itemId: string;
    itemCode?: string;
    itemName?: string;
    baseUnit?: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    sortNo: number;
    remark: string;
    orderLineId?: string;
    batchNo: string;
    receivedQty?: string;
    grossAmount?: string;
    taxAmount?: string;
    finalAmount?: string;
    costAmount?: string;
    sourceLineNo?: number;
    lineStatus?: string;
    lineNo?: number;
};
type RecordData = {
    id: string;
    version: number;
    status: string;
    createdAt: string;
    creatorId: string;
    submittedBy?: string | null;
    supplierCode?: string;
    supplierName: string;
    shortName?: string;
    categoryCode?: string;
    contactName?: string;
    phone?: string;
    paymentTermDays?: number;
    leadTimeDays?: number;
    remark: string;
    orderNo?: string;
    receiptNo?: string;
    orderDate?: string;
    expectedDate?: string;
    documentDate?: string;
    orderId?: string;
    supplierId?: string;
    buyerId?: string;
    receiverId?: string;
    legalEntityId?: string;
    warehouseId?: string;
    orderType?: string;
    discount?: string;
    amount?: string;
    netAmount?: string;
    grossAmount?: string;
    taxAmount?: string;
    costAmount?: string;
    fulfillmentStatus?: string;
    lines?: Line[];
};
type Options = {
    suppliers: {
        id: string;
        supplierCode: string;
        supplierName: string;
        taxRate: string;
        status: string;
    }[];
    items: {
        id: string;
        itemCode: string;
        itemName: string;
        baseUnit: string;
        batchManaged: boolean;
    }[];
    warehouses: {
        id: string;
        legalEntityId: string;
        warehouseName: string;
        status: string;
    }[];
    legalEntities: {
        id: string;
        entityName: string;
        status: string;
    }[];
    users: {
        id: string;
        displayName: string;
        status: string;
    }[];
    categories: {
        code: string;
        name: string;
    }[];
};
type Page = {
    items: RecordData[];
    pagination: {
        total: number;
    };
};
type FormData = {
    supplierId: string;
    buyerId: string;
    receiverId: string;
    legalEntityId: string;
    warehouseId: string;
    orderDate: string;
    expectedDate: string;
    documentDate: string;
    orderType: 'NORMAL' | 'SAMPLE';
    discount: string;
    remark: string;
    orderId: string;
    lines: Line[];
};
const names: Record<Kind, string> = { supplier: '供应商', order: '采购订单', receipt: '采购入库' };
const paths: Record<Kind, string> = { supplier: '/showcase/suppliers', order: '/showcase/purchase-orders', receipt: '/showcase/purchase-receipts' };
const endpoints: Record<Kind, string> = { supplier: 'suppliers', order: 'purchase-orders', receipt: 'purchase-receipts' };
const objects = { supplier: 'supplier-directory', order: 'purchase-order-directory', receipt: 'purchase-receipt-directory' } as const;
const statuses: Record<string, string> = { ACTIVE: '启用', DISABLED: '停用', DRAFT: '草稿', SUBMITTED: '已提交审核', APPROVED: '已审核', POSTED: '已过账', REVERSED: '已冲销', VOIDED: '已取消', NOT_RECEIVED: '未收货', PARTIAL: '部分收货', FULL: '全部收货', REMAINDER_CLOSED: '剩余量已关闭' };
const actions: Record<string, string> = { submit: '提交审核', withdraw: '撤回', approve: '审核通过', reject: '驳回', cancel: '取消单据', close: '关闭剩余量', post: '过账', reverse: '冲销', delete: '删除' };
const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const message = (e: unknown) => e instanceof Error ? e.message : '操作失败';
const base = (code: string) => `/api/systems/${encodeURIComponent(code)}`;
const get = async <T,>(url: string): Promise<T> => await (await call(url)).json() as T;
const send = async <T,>(url: string, body: unknown, method = 'POST'): Promise<T> => await (await write(url, body, method)).json() as T;
const blank = (id: string): FormData => ({ supplierId: '', buyerId: id, receiverId: id, legalEntityId: '', warehouseId: '', orderDate: day(), expectedDate: day(), documentDate: day(), orderType: 'NORMAL', discount: '1', remark: '', orderId: '', lines: [] });
const emptyLine = (sortNo: number): Line => ({ itemId: '', quantity: '1', unitPrice: '0', discount: '1', taxRate: '0.13', sortNo, remark: '', batchNo: '' });
function Field({ label, children }: {
    label: string;
    children: ReactNode;
}) { return <label className="purchasing-field"><span>{label}</span>{children}</label>; }
function Select({ value, onChange, options, disabled = false, label }: {
    value: string;
    onChange: (v: string) => void;
    options: {
        id: string;
        name: string;
    }[];
    disabled?: boolean;
    label: string;
}) { return <select aria-label={label} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}><option value="">请选择</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>; }
const money = (v?: string) => Number(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function PurchasingPage(props: Props) { const kind: Kind = props.path.startsWith(paths.supplier) ? 'supplier' : props.path.startsWith(paths.order) ? 'order' : 'receipt'; const [options, setOptions] = useState<Options | null>(null), [error, setError] = useState(''); useEffect(() => { let alive = true; setOptions(null); setError(''); void get<Options>(`${base(props.systemCode)}/purchasing/options/${kind}`).then(v => { if (alive)
    setOptions(v); }).catch(e => { if (alive)
    setError(message(e)); }); return () => { alive = false; }; }, [props.systemCode, kind]); if (error)
    return <p className="enterprise-alert" role="alert">{error}</p>; if (!options)
    return <p>正在加载采购资料…</p>; const tail = props.path.slice(paths[kind].length); return tail ? <PurchaseDetail key={`${props.systemCode}:${props.path}`} {...props} kind={kind} options={options} id={tail.split('/')[1]} editing={tail.endsWith('/edit') || tail === '/new'}/> : <PurchaseList {...props} kind={kind} options={options}/>; }
function PurchaseList(props: Props & {
    kind: Kind;
    options: Options;
}) { const { kind, systemCode, options, onNavigate, allowedActions } = props; const [tick, setTick] = useState(0), [deleting, setDeleting] = useState<RecordData | null>(null); const loadRows = useCallback((code: string, q: URLSearchParams) => get<Page>(`${base(code)}/${endpoints[kind]}?${q}`), [kind]); const identity = kind === 'supplier' ? 'supplierCode' : kind === 'order' ? 'orderNo' : 'receiptNo'; const render = (r: RecordData, key: string): ReactNode => { if (key === identity)
    return <button className="purchasing-link" onClick={() => onNavigate(`${paths[kind]}/${r.id}`)}>{String(r[key] ?? '—')}</button>; if (key === 'supplierName')
    return options.suppliers.find(s => s.id === r.supplierId)?.supplierName ?? r.supplierName; if (key === 'status' || key === 'fulfillmentStatus')
    return statuses[r[key] ?? ''] ?? r[key]; if (key === 'categoryCode')
    return options.categories.find(c => c.code === r.categoryCode)?.name ?? '—'; if (key === 'buyerId' || key === 'receiverId')
    return options.users.find(u => u.id === r[key])?.displayName ?? '—'; if (key === 'legalEntityId')
    return options.legalEntities.find(u => u.id === r.legalEntityId)?.entityName ?? '—'; if (key === 'warehouseId')
    return options.warehouses.find(u => u.id === r.warehouseId)?.warehouseName ?? '—'; if (key === 'updatedAt')
    return new Date((r as unknown as {
        updatedAt: string;
    }).updatedAt).toLocaleString('zh-CN'); if (['amount', 'netAmount', 'grossAmount', 'taxAmount', 'costAmount'].includes(key))
    return money((r as unknown as Record<string, string>)[key]); return String((r as unknown as Record<string, unknown>)[key] ?? '—'); }; return <div className="enterprise-page purchasing-page"><BusinessDirectory<RecordData> {...props} objectCode={objects[kind]} rowKey={r => r.id} loadRows={loadRows} render={render} refreshToken={tick} addLabel={`新增${names[kind]}`} onAdd={allowedActions.includes('create') ? () => onNavigate(`${paths[kind]}/new`) : undefined} keywordPlaceholder={kind === 'supplier' ? '供应商编码 / 名称 / 简称' : '单号 / 供应商 / 来源单号'} statusOptions={kind === 'supplier' ? { ACTIVE: '启用', DISABLED: '停用' } : kind === 'order' ? { DRAFT: '草稿', SUBMITTED: '已提交审核', APPROVED: '已审核', VOIDED: '已取消' } : { DRAFT: '草稿', SUBMITTED: '已提交审核', APPROVED: '已审核', POSTED: '已过账', REVERSED: '已冲销', VOIDED: '已取消' }} rowActions={r => <><RowActionButton label="修改" disabled={!allowedActions.includes('update') || (kind !== 'supplier' && r.status !== 'DRAFT')} onClick={() => onNavigate(`${paths[kind]}/${r.id}/edit`)}/><RowActionButton label="删除" disabled={!allowedActions.includes('delete') || (kind !== 'supplier' && r.status !== 'DRAFT')} onClick={() => setDeleting(r)}/></>}/>{deleting && <SalesActionDialog title={`删除${names[kind]}`} saveLabel="确认删除" onClose={() => setDeleting(null)} onSave={async () => { await send(`${base(systemCode)}/${endpoints[kind]}/${deleting.id}/delete`, { version: deleting.version, requestKey: crypto.randomUUID(), note: '用户确认删除草稿或未引用供应商' }); setDeleting(null); setTick(t => t + 1); }}><p>确认删除 {deleting[identity]}？已引用的供应商及非草稿单据不能删除。</p></SalesActionDialog>}</div>; }
function PurchaseDetail(props: Props & {
    kind: Kind;
    options: Options;
    id: string;
    editing: boolean;
}) {
    const { kind, id, systemCode, options, allowedActions, onNavigate, userId } = props;
    const isNew = id === 'new';
    const [sourceOrder, setSourceOrder] = useState<RecordData | null>(null);
    const [record, setRecord] = useState<RecordData | null>(null), [form, setForm] = useState<FormData>(blank(userId)), [supplier, setSupplier] = useState<SupplierWrite>({ ...supplierWriteSchema.parse({ supplierName: '新供应商' }), supplierName: '' }), [busy, setBusy] = useState(false), [error, setError] = useState(''), [command, setCommand] = useState(''), [note, setNote] = useState(''), [revision, setRevision] = useState(0);
    const busyRef = useRef(false);
    const editing = props.editing && (isNew ? allowedActions.includes('create') : allowedActions.includes('update') && (kind === 'supplier' || record?.status === 'DRAFT'));
    const accept = useCallback((r: RecordData) => { setRecord(r); if (kind === 'supplier')
        setSupplier(supplierWriteSchema.parse({ ...Object.fromEntries(Object.keys(supplierWriteSchema.shape).map(k => [k, (r as unknown as Record<string, unknown>)[k]])), taxRate: String((r as unknown as {
                taxRate: string;
            }).taxRate) }));
    else
        setForm({ ...blank(userId), ...r, orderType: r.orderType === 'SAMPLE' ? 'SAMPLE' : 'NORMAL', supplierId: r.supplierId ?? '', buyerId: r.buyerId ?? userId, receiverId: r.receiverId ?? userId, legalEntityId: r.legalEntityId ?? '', warehouseId: r.warehouseId ?? '', orderId: r.orderId ?? '', discount: r.discount ?? '1', orderDate: r.orderDate ?? day(), expectedDate: r.expectedDate ?? day(), documentDate: r.documentDate ?? day(), lines: (r.lines ?? []).map((l, i) => ({ ...emptyLine(i + 1), ...l })) }); }, [kind, userId]);
    useEffect(() => { if (isNew) {
        setSupplier({ ...supplierWriteSchema.parse({ supplierName: '新供应商' }), supplierName: '' });
        setForm({ ...blank(userId), legalEntityId: options.legalEntities[0]?.id ?? '', warehouseId: options.warehouses.find(w => w.legalEntityId === options.legalEntities[0]?.id)?.id ?? '' });
        return;
    } let alive = true; void get<RecordData>(`${base(systemCode)}/${endpoints[kind]}/${id}`).then(r => { if (alive) {
        accept(r);
        setError('');
    } }).catch(e => { if (alive)
        setError(message(e)); }); return () => { alive = false; }; }, [id, isNew, kind, systemCode, accept, options, revision, userId]);
    const update = <K extends keyof FormData,>(k: K, v: FormData[K]) => setForm(f => ({ ...f, [k]: v }));
    const lineUpdate = (index: number, patch: Partial<Line>) => setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === index ? { ...l, ...patch } : l) }));
    async function chooseSource(order: RecordData) { setSourceOrder(order); update('orderId', order.id); setForm(f => ({ ...f, orderId: order.id, supplierId: order.supplierId ?? '', legalEntityId: order.legalEntityId ?? '', warehouseId: order.warehouseId ?? '', lines: (order.lines ?? []).filter(l => Number(l.quantity) > Number(l.receivedQty)).map((l, i) => ({ ...emptyLine(i + 1), itemId: l.itemId, itemCode: l.itemCode, itemName: l.itemName, baseUnit: l.baseUnit, orderLineId: l.id, sourceLineNo: l.lineNo, quantity: String(Number(l.quantity) - Number(l.receivedQty)), unitPrice: l.unitPrice, remark: '' })) })); }
    useEffect(() => { if (!isNew || kind !== 'receipt')
        return; const source = sessionStorage.getItem('purchase-receipt-source'); if (!source)
        return; sessionStorage.removeItem('purchase-receipt-source'); void get<RecordData>(`${base(systemCode)}/purchase-receipts/source/${source}`).then(chooseSource).catch(e => setError(message(e))); }, [isNew, kind, systemCode]);
    useEffect(() => { if (kind !== 'receipt' || !form.orderId)
        return; let alive = true; void get<RecordData>(`${base(systemCode)}/purchase-receipts/source/${form.orderId}`).then(r => { if (alive)
        setSourceOrder(r); }).catch(e => { if (alive)
        setError(message(e)); }); return () => { alive = false; }; }, [kind, form.orderId, systemCode]);
    async function save() { if (busyRef.current)
        return; busyRef.current = true; setBusy(true); setError(''); try {
        const payload = kind === 'supplier' ? supplierWriteSchema.parse({ ...supplier, version: record?.version }) : kind === 'order' ? purchaseOrderWriteSchema.parse({ version: record?.version, supplierId: form.supplierId, buyerId: form.buyerId, legalEntityId: form.legalEntityId, warehouseId: form.warehouseId, orderDate: form.orderDate, expectedDate: form.expectedDate, orderType: form.orderType, discount: form.discount, remark: form.remark, lines: form.lines.map(l => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount, taxRate: l.taxRate, sortNo: l.sortNo, remark: l.remark })) }) : purchaseReceiptWriteSchema.parse({ version: record?.version, orderId: form.orderId, warehouseId: form.warehouseId, receiverId: form.receiverId, documentDate: form.documentDate, remark: form.remark, lines: form.lines.map(l => ({ orderLineId: l.orderLineId, batchNo: l.batchNo, quantity: l.quantity, remark: l.remark })) });
        const r = await send<RecordData>(`${base(systemCode)}/${endpoints[kind]}${isNew ? '' : `/${id}`}`, payload, isNew ? 'POST' : 'PATCH');
        accept(r);
        onNavigate(`${paths[kind]}/${r.id}`);
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        busyRef.current = false;
        setBusy(false);
    } }
    const identity = (kind === 'supplier' ? record?.supplierCode : kind === 'order' ? record?.orderNo : record?.receiptNo) ?? `新增${names[kind]}`;
    const commandAllowed = (action: string) => allowedActions.includes(action) && (!['approve'].includes(action) || record?.submittedBy !== userId);
    const permittedCommands = record ? (record.status === 'DRAFT' ? ['submit'] : record.status === 'SUBMITTED' ? ['withdraw', 'approve', 'reject'] : record.status === 'APPROVED' ? kind === 'receipt' ? ['post', 'cancel'] : ['cancel', ...(record.fulfillmentStatus === 'PARTIAL' ? ['close'] : [])] : record.status === 'POSTED' && kind === 'receipt' ? ['reverse'] : []) : [];
    const preview = useMemo(() => { if (kind === 'receipt') {
        const amounts = form.lines.map(l => { const source = sourceOrder?.lines?.find(s => s.id === l.orderLineId); const ratio = source ? Number(l.quantity) / Number(source.quantity) : 0; return { gross: Number(source?.finalAmount ?? 0) * ratio, tax: Number(source?.taxAmount ?? 0) * ratio }; });
        return { gross: amounts.reduce((a, l) => a + l.gross, 0), tax: amounts.reduce((a, l) => a + l.tax, 0) };
    } const before = form.lines.reduce((sum, l) => sum + Math.round(Number(l.quantity) * Number(l.unitPrice) * Number(l.discount) * 100) / 100, 0); const gross = Math.round(before * Number(form.discount) * 100) / 100; const tax = before ? form.lines.reduce((sum, l) => { const share = gross * (Math.round(Number(l.quantity) * Number(l.unitPrice) * Number(l.discount) * 100) / 100) / before; return sum + share - share / (1 + Number(l.taxRate)); }, 0) : 0; return { gross, tax }; }, [form.lines, form.discount, kind, sourceOrder]);
    const getName = (type: 'supplier' | 'legal' | 'warehouse' | 'user', value?: string) => type === 'supplier' ? options.suppliers.find(s => s.id === value)?.supplierName ?? record?.supplierName ?? '—' : type === 'legal' ? options.legalEntities.find(s => s.id === value)?.entityName ?? '—' : type === 'warehouse' ? options.warehouses.find(s => s.id === value)?.warehouseName ?? '—' : options.users.find(s => s.id === value)?.displayName ?? '—';
    if (!isNew && !record)
        return <p role={error ? 'alert' : undefined}>{error || '正在加载单据…'}</p>;
    return <div className="purchasing-page"><DocumentWorkspace title={kind === 'supplier' ? (record?.shortName || record?.supplierName || identity) : identity} status={<span className="purchasing-status">{isNew ? '新增' : statuses[record?.status ?? '']}</span>} backLabel={`返回${names[kind]}列表`} onBack={() => onNavigate(paths[kind])} fields={[{ label: kind === 'supplier' ? '供应商编码' : '供应商', value: kind === 'supplier' ? record?.supplierCode ?? '保存后生成' : getName('supplier', form.supplierId) }, { label: '创建人', value: record ? getName('user', record.creatorId) : getName('user', userId) }, { label: '创建时间', value: record ? new Date(record.createdAt).toLocaleString('zh-CN') : '保存后生成' }, ...(kind === 'receipt' && form.orderId ? [{ label: '来源订单', value: <button className="purchasing-link" onClick={() => onNavigate(`${paths.order}/${form.orderId}`)}>{record?.orderNo ?? sourceOrder?.orderNo ?? '正在加载'}</button> }] : [])]} actions={editing ? <><button disabled={busy} onClick={() => onNavigate(isNew ? paths[kind] : `${paths[kind]}/${id}`)}>取消</button><button className="is-primary" disabled={busy} onClick={() => void save()}>{busy ? '保存中…' : '保存'}</button></> : <>{record && (kind === 'supplier' || record.status === 'DRAFT') && <button disabled={!allowedActions.includes('update')} onClick={() => onNavigate(`${paths[kind]}/${id}/edit`)}>编辑</button>}{permittedCommands.map(a => <button key={a} title={a === 'approve' && record?.submittedBy === userId ? '提交人与审核人必须分离，请由其他采购审核员审批' : undefined} disabled={!commandAllowed(a) || (a === 'withdraw' && record?.submittedBy !== userId) || (a === 'cancel' && kind === 'order' && record?.lines?.some(l => Number(l.receivedQty) > 0))} onClick={() => { setCommand(a); setNote(''); }}>{actions[a]}</button>)}{kind === 'order' && record?.status === 'APPROVED' && !['FULL', 'REMAINDER_CLOSED'].includes(record.fulfillmentStatus ?? '') && <button className="is-primary" onClick={() => { sessionStorage.setItem('purchase-receipt-source', record.id); onNavigate(`${paths.receipt}/new`); }}>转采购入库</button>}</>}>
 {error && <p className="enterprise-alert" role="alert">{error}</p>}
 {kind === 'supplier' ? <SupplierFields value={supplier} options={options} editing={editing && !busy} onChange={setSupplier}/> : <>
 {kind === 'receipt' && isNew && !form.orderId && editing && <SourceChooser code={systemCode} onChoose={chooseSource}/>}
 <div className="purchasing-fields"><Field label="供应商"><Select label="供应商" value={form.supplierId} disabled={!editing || kind === 'receipt'} onChange={v => { update('supplierId', v); }} options={options.suppliers.filter(s => !editing || s.status === 'ACTIVE' || s.id === form.supplierId).map(s => ({ id: s.id, name: `${s.supplierCode} ${s.supplierName}` }))}/></Field><Field label={kind === 'order' ? '采购员' : '收货人'}><Select label={kind === 'order' ? '采购员' : '收货人'} value={kind === 'order' ? form.buyerId : form.receiverId} disabled={!editing} onChange={v => update(kind === 'order' ? 'buyerId' : 'receiverId', v)} options={options.users.filter(u => !editing || u.status === 'ACTIVE').map(u => ({ id: u.id, name: u.displayName }))}/></Field><Field label="法人"><Select label="法人" value={form.legalEntityId} disabled={!editing || kind === 'receipt'} onChange={v => { update('legalEntityId', v); update('warehouseId', ''); }} options={options.legalEntities.filter(l => !editing || l.status === 'ACTIVE').map(l => ({ id: l.id, name: l.entityName }))}/></Field><Field label={kind === 'order' ? '计划仓库' : '收货仓库'}><Select label="仓库" value={form.warehouseId} disabled={!editing} onChange={v => update('warehouseId', v)} options={options.warehouses.filter(w => w.legalEntityId === form.legalEntityId && (!editing || w.status === 'ACTIVE')).map(w => ({ id: w.id, name: w.warehouseName }))}/></Field><Field label={kind === 'order' ? '订单日期' : '入库日期'}><input type="date" value={kind === 'order' ? form.orderDate : form.documentDate} readOnly={!editing} onChange={e => update(kind === 'order' ? 'orderDate' : 'documentDate', e.target.value)}/></Field>{kind === 'order' && <><Field label="预计到货日期"><input type="date" value={form.expectedDate} readOnly={!editing} onChange={e => update('expectedDate', e.target.value)}/></Field><Field label="订单类型"><select disabled={!editing} value={form.orderType} onChange={e => update('orderType', e.target.value as FormData['orderType'])}><option value="NORMAL">常规采购</option><option value="SAMPLE">样品采购</option></select></Field><Field label="整单折扣系数（0–1）"><input type="number" min="0" max="1" step="0.0001" readOnly={!editing} value={form.discount} onChange={e => update('discount', e.target.value)}/></Field></>}<Field label="币别"><input readOnly value="CNY"/></Field><Field label="含税金额"><input readOnly value={money(editing ? String(preview.gross) : record?.netAmount ?? record?.grossAmount)}/></Field><Field label="税额"><input readOnly value={money(editing ? String(preview.tax) : record?.taxAmount)}/></Field><Field label={kind === 'order' ? '收货进度' : '入库成本（不含税）'}><input readOnly value={kind === 'order' ? statuses[record?.fulfillmentStatus ?? 'NOT_RECEIVED'] : money(editing ? String(preview.gross - preview.tax) : record?.costAmount)}/></Field><Field label="备注"><textarea rows={2} readOnly={!editing} value={form.remark} onChange={e => update('remark', e.target.value)}/></Field></div>
 <DetailSection title={kind === 'order' ? '采购产品明细' : '采购入库明细'} actions={editing ? <button disabled={kind === 'receipt' && (!form.orderId || !form.lines.some(l => options.items.find(item => item.id === l.itemId)?.batchManaged))} onClick={() => { if (kind === 'order')
            update('lines', [...form.lines, { ...emptyLine(Math.max(0, ...form.lines.map(l => l.sortNo)) + 1), taxRate: options.suppliers.find(s => s.id === form.supplierId)?.taxRate ?? '0.13' }]);
        else {
            const source = form.lines.find(l => options.items.find(item => item.id === l.itemId)?.batchManaged);
            if (source)
                update('lines', [...form.lines, { ...source, id: undefined, quantity: '1', batchNo: '', sortNo: form.lines.length + 1 }]);
        } }}> {kind === 'order' ? '新增行' : '拆分批次行'}</button> : undefined}>
 <p className="purchasing-hint">{kind === 'order' ? editing ? '数量和单价可编辑；金额随输入预览，保存时统一计算并分摊尾差。' : '仅草稿可修改；审核后可按剩余数量分批转采购入库。' : '批次管理物料必须填写批号；非批次物料留空。已审核尚未入库，过账后才增加库存和订单收货数量。'}</p><div className="purchasing-table-scroll"><table className="purchasing-lines"><thead><tr><th>行号</th>{editing && <th>操作</th>}<th>{kind === 'order' ? '产品 / 物料' : '来源行号'}</th>{kind === 'receipt' && <th>产品 / 物料</th>}<th>单位</th>{kind === 'receipt' && <th>批次</th>}<th>{kind === 'order' ? '订单数量' : '本次入库数量'}</th>{kind === 'order' && <><th>含税单价</th><th>行折扣（0–1）</th><th>税率（0–1）</th><th>显示序号</th><th>折后含税金额</th><th>已收货数量</th><th>行状态</th></>}{kind === 'receipt' && <th>入库成本</th>}<th>行备注</th></tr></thead><tbody>{form.lines.map((l, i) => <tr key={i}><td>{i + 1}</td>{editing && <td><RowActionButton label="删除行" onClick={() => update('lines', form.lines.filter((_, index) => index !== i))}/></td>}<td>{kind === 'order' ? editing ? <ItemPicker label={`第${i + 1}行物料`} value={l.itemId} options={options.items.map(item => ({ id: item.id, name: `${item.itemCode} ${item.itemName}` }))} onChange={v => { const item = options.items.find(item => item.id === v); lineUpdate(i, { itemId: v, itemCode: item?.itemCode, itemName: item?.itemName, baseUnit: item?.baseUnit }); }}/> : `${l.itemCode} ${l.itemName}` : l.sourceLineNo}</td>{kind === 'receipt' && <td>{l.itemCode} {l.itemName}</td>}<td>{l.baseUnit ?? '—'}</td>{kind === 'receipt' && <td><input aria-label={`第${i + 1}行批次`} placeholder={options.items.find(item => item.id === l.itemId)?.batchManaged ? '必填批号' : '非批次物料'} disabled={!editing || !options.items.find(item => item.id === l.itemId)?.batchManaged} value={l.batchNo} onChange={e => lineUpdate(i, { batchNo: e.target.value })}/></td>}<td><input aria-label={`第${i + 1}行数量`} type="number" min="0.0001" step="0.0001" readOnly={!editing} value={l.quantity} onChange={e => lineUpdate(i, { quantity: e.target.value })}/></td>{kind === 'order' && <>{(['unitPrice', 'discount', 'taxRate', 'sortNo'] as const).map(k => <td key={k}><input aria-label={`第${i + 1}行${k === 'unitPrice' ? '单价' : k === 'discount' ? '折扣' : k === 'taxRate' ? '税率' : '显示序号'}`} type="number" min="0" step={k === 'sortNo' ? '1' : k === 'unitPrice' ? '0.000001' : '0.0001'} max={k === 'discount' || k === 'taxRate' ? '1' : undefined} readOnly={!editing} value={l[k]} onChange={e => lineUpdate(i, { [k]: k === 'sortNo' ? Number(e.target.value) : e.target.value })}/></td>)}<td>{money(editing ? String(Number(l.quantity) * Number(l.unitPrice) * Number(l.discount) * Number(form.discount)) : l.finalAmount)}</td><td>{l.receivedQty ?? '0'}</td><td>{statuses[l.lineStatus ?? 'NOT_RECEIVED']}</td></>}{kind === 'receipt' && <td>{money(editing ? String((Number(sourceOrder?.lines?.find(s => s.id === l.orderLineId)?.finalAmount ?? 0) - Number(sourceOrder?.lines?.find(s => s.id === l.orderLineId)?.taxAmount ?? 0)) * Number(l.quantity) / Number(sourceOrder?.lines?.find(s => s.id === l.orderLineId)?.quantity ?? 1)) : l.costAmount)}</td>}<td><input aria-label={`第${i + 1}行备注`} readOnly={!editing} value={l.remark} onChange={e => lineUpdate(i, { remark: e.target.value })}/></td></tr>)}</tbody></table>{!form.lines.length && <p>暂无明细，请{kind === 'order' ? '新增行' : '选择已审核采购订单'}。</p>}</div></DetailSection>
 </>}
 {!isNew && kind !== 'supplier' && <PurchaseHistory code={systemCode} kind={kind} id={id} revision={revision} options={options}/>}
 </DocumentWorkspace>{command && record && <SalesActionDialog title={actions[command]} saveLabel="确认" onClose={() => setCommand('')} onSave={async () => { await send(`${base(systemCode)}/${endpoints[kind]}/${id}/${command}`, { version: record.version, requestKey: crypto.randomUUID(), note }); setCommand(''); setRevision(v => v + 1); }}><p>{command === 'post' ? '过账将增加库存、生成库存流水，并更新采购订单已收货数量。' : command === 'reverse' ? '冲销将反向扣减原入库数量与成本，库存不足时整单不执行。' : `确认${actions[command]} ${identity}？`}</p><Field label="操作说明"><textarea required={['reject', 'cancel', 'close', 'reverse'].includes(command)} rows={3} value={note} onChange={e => setNote(e.target.value)}/></Field></SalesActionDialog>}</div>;
}
function SupplierFields({ value, options, editing, onChange }: {
    value: SupplierWrite;
    options: Options;
    editing: boolean;
    onChange: (v: SupplierWrite) => void;
}) { const field = (key: keyof SupplierWrite, v: string | number) => onChange({ ...value, [key]: v }); const textFields: {
    key: keyof SupplierWrite;
    label: string;
    type?: string;
}[] = [{ key: 'supplierName', label: '供应商名称' }, { key: 'shortName', label: '供应商简称' }, { key: 'creditCode', label: '统一社会信用代码' }, { key: 'contactName', label: '业务联系人' }, { key: 'phone', label: '电话' }, { key: 'email', label: '邮箱', type: 'email' }, { key: 'address', label: '地址' }, { key: 'paymentTermDays', label: '付款账期（天）', type: 'number' }, { key: 'leadTimeDays', label: '采购交期（天）', type: 'number' }, { key: 'taxRate', label: '默认税率（0–1）', type: 'number' }]; return <div className="purchasing-fields">{textFields.map(f => <Field key={f.key} label={f.label}><input type={f.type ?? 'text'} step={f.key === 'taxRate' ? '0.0001' : f.type === 'number' ? '1' : undefined} min={f.type === 'number' ? 0 : undefined} max={f.key === 'taxRate' ? 1 : undefined} readOnly={!editing} value={String(value[f.key] ?? '')} onChange={e => field(f.key, ['paymentTermDays', 'leadTimeDays'].includes(f.key) ? Number(e.target.value) : e.target.value)}/></Field>)}<Field label="供应商类别"><select value={value.categoryCode} disabled={!editing} onChange={e => field('categoryCode', e.target.value)}>{options.categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></Field><Field label="状态"><select value={value.status} disabled={!editing} onChange={e => field('status', e.target.value)}><option value="ACTIVE">启用</option><option value="DISABLED">停用</option></select></Field><Field label="备注"><textarea rows={3} value={value.remark} readOnly={!editing} onChange={e => field('remark', e.target.value)}/></Field></div>; }
function SourceChooser({ code, onChoose }: {
    code: string;
    onChoose: (r: RecordData) => Promise<void>;
}) { const [input, setInput] = useState(''), [keyword, setKeyword] = useState(''), [page, setPage] = useState(1), [data, setData] = useState<Page | null>(null), [error, setError] = useState(''); useEffect(() => { let alive = true; void get<Page>(`${base(code)}/purchase-receipts/sources?${new URLSearchParams({ page: String(page), pageSize: '20', keyword })}`).then(v => { if (alive) {
    setData(v);
    setError('');
} }).catch(e => { if (alive)
    setError(message(e)); }); return () => { alive = false; }; }, [code, keyword, page]); return <DetailSection title="选择已审核的采购订单"><form className="purchasing-source-query" onSubmit={e => { e.preventDefault(); setKeyword(input); setPage(1); }}><Field label="单号 / 供应商名称"><input value={input} onChange={e => setInput(e.target.value)}/></Field><button type="submit">查询</button></form>{error && <p role="alert">{error}</p>}<div className="purchasing-table-scroll"><table className="purchasing-lines"><thead><tr><th>选择</th><th>采购订单号</th><th>供应商</th><th>订单日期</th><th>折后含税金额</th><th>收货进度</th></tr></thead><tbody>{data?.items.map(r => <tr key={r.id}><td><button disabled={['FULL', 'REMAINDER_CLOSED'].includes(r.fulfillmentStatus ?? '')} onClick={() => void onChoose(r)}>引入</button></td><td>{r.orderNo}</td><td>{r.supplierName}</td><td>{r.orderDate}</td><td>{money(r.netAmount)}</td><td>{statuses[r.fulfillmentStatus ?? '']}</td></tr>)}</tbody></table></div><footer className="purchasing-source-pager"><span>共 {data?.pagination.total ?? 0} 条 · 每页20条</span><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button><span>第{page}页</span><button disabled={page * 20 >= (data?.pagination.total ?? 0)} onClick={() => setPage(p => p + 1)}>下一页</button></footer></DetailSection>; }
function PurchaseHistory({ code, kind, id, revision, options }: {
    code: string;
    kind: 'order' | 'receipt';
    id: string;
    revision: number;
    options: Options;
}) { const [rows, setRows] = useState<{
    id: string;
    actorId: string;
    action: string;
    note: string;
    createdAt: string;
}[]>([]), [error, setError] = useState(''); useEffect(() => { let alive = true; void get<typeof rows>(`${base(code)}/purchasing/history/${kind}/${id}`).then(r => { if (alive) {
    setRows(r);
    setError('');
} }).catch(e => { if (alive)
    setError(message(e)); }); return () => { alive = false; }; }, [code, kind, id, revision]); return <DetailSection title="单据流转记录">{error && <p role="alert">{error}</p>}{!rows.length ? <p className="purchasing-hint">尚无审核或过账记录。</p> : <ol className="purchasing-history">{rows.map(r => <li key={r.id}><time>{new Date(r.createdAt).toLocaleString('zh-CN')}</time><strong>{actions[r.action] ?? r.action}</strong><span>{options.users.find(u => u.id === r.actorId)?.displayName ?? '历史操作人'}</span><span>{r.note || '—'}</span></li>)}</ol>}</DetailSection>; }
function ItemPicker({ label, value, options, onChange }: {
    label: string;
    value: string;
    options: {
        id: string;
        name: string;
    }[];
    onChange: (id: string) => void;
}) { const id = useId(); const [query, setQuery] = useState(options.find(o => o.id === value)?.name ?? ''); useEffect(() => { if (value)
    setQuery(options.find(o => o.id === value)?.name ?? ''); }, [value, options]); const filtered = options.filter(o => o.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 40); return <><input aria-label={label} list={id} placeholder="输入编码或名称查询物料" value={query} onChange={e => { const text = e.target.value; setQuery(text); onChange(options.find(o => o.name === text)?.id ?? ''); }}/><datalist id={id}>{filtered.map(o => <option key={o.id} value={o.name}/>)}</datalist></>; }
