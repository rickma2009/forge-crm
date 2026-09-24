import { DetailWorkspace, DetailHeader, DetailTabs, DetailPanel } from '../common/DetailWorkspace';
import { RowActionButton } from '../common/RowActionButton';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { customerAddressWriteSchema, customerContactWriteSchema, customerUpdateSchema, type Customer, type CustomerAddress, type CustomerContact, type CustomerDetail, type CustomerWrite, type Dictionary, type SalesOption } from '@interaction-pattern-lab/contracts';
import { GatewayError, type EnterpriseGateway } from './gateway';
import './customer-detail.css';

export type CustomerMode = 'view' | 'edit';
export type LeaveGuard = () => boolean;
const message = (error: unknown) => error instanceof GatewayError ? error.message : '操作失败，请稍后重试';
const addressTypes: Record<string, string> = { BILLING: '开票地址', SHIPPING: '收货地址', OFFICE: '办公地址', CONTRACT: '合同地址' };
const toWrite = (customer: Customer): CustomerWrite => ({ customerName: customer.customerName, shortName: customer.shortName, categoryValue: customer.categoryValue, statusValue: customer.statusValue, address: customer.address ?? '', industryValue: customer.industryValue ?? '', levelValue: customer.levelValue ?? '', salesOwnerKey: customer.salesOwnerKey ?? '', remark: customer.remark ?? '' });

export function CustomerDetailPage({ systemCode, customerId, allowedActions, gateway, onBack, initialMode = 'view', onIdentity, onChanged, registerGuard }: {
  systemCode: string; customerId: string; allowedActions: string[]; gateway: EnterpriseGateway; onBack: () => void;
  initialMode?: CustomerMode; onIdentity?: (customer: Customer) => void; onChanged?: () => void; registerGuard?: (guard: LeaveGuard | null) => void;
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [form, setForm] = useState<CustomerWrite | null>(null);
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [sales, setSales] = useState<SalesOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(initialMode === 'edit');
  const [saving, setSaving] = useState(false);
  const [childSaving, setChildSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'contacts' | 'addresses'>('basic');
  const [childEditor, setChildEditor] = useState<{ kind: 'contact'; record?: CustomerContact } | { kind: 'address'; record?: CustomerAddress } | null>(null);
  const canEdit = allowedActions.includes('update');
  const dirty = Boolean(detail && form && JSON.stringify(form) !== JSON.stringify(toWrite(detail.customer)));
  const identityRef = useRef(onIdentity);
  identityRef.current = onIdentity;

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([gateway.customerDetail(systemCode, customerId), gateway.dictionaries(systemCode), gateway.salesOptions(systemCode)])
      .then(([data, dicts, options]) => {
        if (!active) return;
        setDetail(data); setForm(toWrite(data.customer)); setDictionaries(dicts); setSales(options);
        identityRef.current?.(data.customer);
      }).catch((reason) => { if (active) setError(message(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, systemCode, customerId, retry]);

  const leave = (): boolean => {
    if (saving || childSaving) { window.alert('正在保存，请稍候。'); return false; }
    if ((dirty || childEditor) && !window.confirm('有未保存的内容，确定放弃修改并离开吗？')) return false;
    if (detail) setForm(toWrite(detail.customer));
    setChildEditor(null); setEditing(false); setError('');
    return true;
  };
  useEffect(() => { registerGuard?.(leave); return () => registerGuard?.(null); });
  useEffect(() => {
    if (!dirty && !childEditor && !saving && !childSaving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, childEditor, saving, childSaving]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || !form || !canEdit || !editing || saving) return;
    const permitted = Object.fromEntries(Object.entries(form).filter(([key]) => detail.customer.fieldAccess?.[key]?.writable !== false));
    const parsed = customerUpdateSchema.safeParse({ ...permitted, version: detail.customer.version });
    if (!parsed.success) { setActiveTab('basic'); setError('请检查必填项及字段长度。'); return; }
    setSaving(true); setError('');
    try {
      const customer = await gateway.updateCustomer(systemCode, customerId, parsed.data);
      setDetail((current) => current && ({ ...current, customer })); setForm(toWrite(customer)); setEditing(false);
      identityRef.current?.(customer); onChanged?.();
    } catch (reason) { setError(message(reason)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="enterprise-page" role="status">正在加载客户…</div>;
  if (!detail || !form) return <div className="enterprise-page"><p role="alert">{error || '客户不存在'}</p><button onClick={() => setRetry((value) => value + 1)}>重试客户详情</button><button onClick={onBack}>返回列表</button></div>;
  const { customer, contacts, addresses } = detail;
  const editable = canEdit && editing && !saving;
  const fieldEditable = (key: string) => editable && customer.fieldAccess?.[key]?.writable !== false;
  const set = (key: keyof CustomerWrite, value: string) => setForm((current) => current && ({ ...current, [key]: value }));
  const dictOptions = (code: string) => (dictionaries.find((item) => item.dictCode === code)?.items ?? []).map((item) => ({ value: item.itemValue, label: item.itemName }));
  const dictLabel = (code: string, value: string) => dictOptions(code).find((item) => item.value === value)?.label ?? value;
  const projectRoles = dictionaries.find((item) => item.dictCode === 'contact_project_role' && item.status === 'ACTIVE')?.items.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.itemValue, label: item.itemName })) ?? [];
  const formId = `customer-basic-${customerId}`;
  const optionsField = (label: string, key: keyof CustomerWrite, options: { value: string; label: string }[], required = false) => {
    if (customer.fieldAccess?.[key]?.visible === false) return null;
    const value = form[key] ?? '';
    return <label>{label}<select value={value} disabled={!fieldEditable(key)} required={required} onChange={(event) => set(key, event.target.value)}>
      <option value="">请选择</option>{value && !options.some((option) => option.value === value) && <option value={value}>{key === 'salesOwnerKey' ? customer.salesOwnerName ?? value : value}</option>}
      {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select></label>;
  };
  return <DetailWorkspace className="customer-detail-page">
    <DetailHeader title={customer.shortName} status={<span className="status-pill">{dictLabel('customer_status', customer.statusValue)}</span>} backLabel="返回客户列表" onBack={() => { if (leave()) onBack(); }} fields={[
      { label: '客户编码', value: customer.customerCode }, { label: '客户名称', value: customer.customerName }, { label: '负责人', value: customer.salesOwnerName || '—' },
    ]} actions={canEdit && <>{editing ? <><button disabled={saving} onClick={() => { if (leave()) setEditing(false); }}>取消编辑</button><button className="is-primary" form={formId} type="submit" disabled={saving}>{saving ? '保存中…' : '保存客户'}</button></> : <button className="is-primary" onClick={() => { setActiveTab('basic'); setEditing(true); }}>编辑客户</button>}</>} />
    <DetailTabs id={customerId} label="客户详情分区" active={activeTab} onChange={setActiveTab} tabs={[{ id: 'basic', label: '客户基本信息' }, { id: 'contacts', label: `联系人 (${contacts.length})` }, { id: 'addresses', label: `地址 (${addresses.length})` }]} />
    {error && <div className="enterprise-alert" role="alert">{error}</div>}
    <DetailPanel className="customer-detail-panel" id={customerId} active={activeTab}>
      {/* Keep the form mounted: header save works even while a child tab is selected. */}
      <form id={formId} hidden={activeTab !== 'basic'} noValidate onSubmit={save} className="customer-basic-form">
        <div className="form-grid">
          <label hidden={customer.fieldAccess?.customerCode?.visible === false}>客户编码<input value={customer.customerCode} disabled /></label>
          <label hidden={customer.fieldAccess?.customerName?.visible === false}>客户名称<input required maxLength={255} value={form.customerName} disabled={!fieldEditable('customerName')} onChange={(event) => set('customerName', event.target.value)} /></label>
          <label hidden={customer.fieldAccess?.shortName?.visible === false}>客户简称<input required maxLength={100} value={form.shortName} disabled={!fieldEditable('shortName')} onChange={(event) => set('shortName', event.target.value)} /></label>
          {optionsField('客户类别', 'categoryValue', dictOptions('customer_category'), true)}
          {optionsField('当前状态', 'statusValue', dictOptions('customer_status'), true)}
          {optionsField('所属行业', 'industryValue', dictOptions('customer_industry'))}
          {optionsField('客户等级', 'levelValue', dictOptions('customer_level'))}
          {optionsField('负责人', 'salesOwnerKey', sales.map((option) => ({ value: option.key, label: option.name })))}
          <label className="span-2" hidden={customer.fieldAccess?.address?.visible === false}>客户地址<input maxLength={500} value={form.address ?? ''} disabled={!fieldEditable('address')} onChange={(event) => set('address', event.target.value)} /></label>
          <label className="span-2" hidden={customer.fieldAccess?.remark?.visible === false}>备注<textarea maxLength={1000} rows={3} value={form.remark ?? ''} disabled={!fieldEditable('remark')} onChange={(event) => set('remark', event.target.value)} /></label>
        </div>
      </form>
      {activeTab === 'contacts' && <><div className="customer-child-toolbar"><span>当前客户的联系人 · {contacts.length} 人</span>{canEdit && <button className="is-primary" onClick={() => setChildEditor({ kind: 'contact' })}>新增联系人</button>}</div>
        <div className="enterprise-table-wrap"><table aria-label="客户联系人"><thead><tr>{['序号', '联系人姓名', '所在部门', '职位', '项目角色', '手机', '电话', '邮件', '状态', '备注', '操作'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>
          {!contacts.length && <tr><td colSpan={11} className="empty-cell">暂无联系人，可新增当前客户的联系人</td></tr>}
          {contacts.map((contact, index) => <tr key={contact.id}><td>{index + 1}</td><td>{contact.name}</td><td>{contact.department || '—'}</td><td>{contact.position || '—'}</td><td>{contact.decisionRole ? dictLabel('contact_project_role', contact.decisionRole) : '—'}</td><td>{contact.mobile || '—'}</td><td>{contact.phone || '—'}</td><td>{contact.email || '—'}</td><td>{contact.status === 'ACTIVE' ? '在职' : contact.status === 'INACTIVE' ? '离职' : contact.status}</td><td>{contact.remark || '—'}</td><td>{canEdit ? <RowActionButton onClick={() => setChildEditor({ kind: 'contact', record: contact })} aria-label={`修改联系人 ${contact.name}`} label="修改" /> : '—'}</td></tr>)}
        </tbody></table></div></>}
      {activeTab === 'addresses' && <><div className="customer-child-toolbar"><span>开票、收货与办公地址 · {addresses.length} 条</span>{canEdit && <button className="is-primary" onClick={() => setChildEditor({ kind: 'address' })}>新增地址</button>}</div>
        <div className="enterprise-table-wrap"><table aria-label="客户地址"><thead><tr>{['类型', '收件人', '联系电话', '地址', '默认', '状态', '备注', '操作'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>
          {!addresses.length && <tr><td colSpan={8} className="empty-cell">暂无地址，可新增当前客户的地址</td></tr>}
          {addresses.map((address) => <tr key={address.id}><td>{addressTypes[address.addressType] ?? address.addressType}</td><td>{address.recipient || '—'}</td><td>{address.phone || '—'}</td><td>{[address.province, address.city, address.district, address.detail].filter(Boolean).join(' ')}</td><td>{address.isDefault ? '默认' : '—'}</td><td>{address.status === 'ACTIVE' ? '启用' : address.status === 'INACTIVE' ? '停用' : address.status}</td><td>{address.remark || '—'}</td><td>{canEdit ? <RowActionButton onClick={() => setChildEditor({ kind: 'address', record: address })} aria-label={`修改地址 ${address.detail}`} label="修改" /> : '—'}</td></tr>)}
        </tbody></table></div></>}
    </DetailPanel>
    {childEditor && canEdit && <ChildEditor key={`${childEditor.kind}:${childEditor.record?.id ?? 'new'}`} editor={childEditor} customerId={customerId} customerName={customer.customerName} systemCode={systemCode} gateway={gateway} projectRoles={projectRoles} onSaving={setChildSaving} onClose={() => setChildEditor(null)} onSaved={async () => {
      setChildEditor(null); onChanged?.();
      try { const next = await gateway.customerDetail(systemCode, customerId); setDetail((current) => current && ({ ...current, contacts: next.contacts, addresses: next.addresses })); }
      catch (reason) { setError(`记录已保存，但刷新失败：${message(reason)}`); }
    }} />}
  </DetailWorkspace>;
}

const contactFields = [['name', '联系人姓名', 100], ['department', '所在部门', 128], ['position', '职位', 128], ['decisionRole', '项目角色', 64], ['mobile', '手机', 32], ['phone', '电话', 32], ['email', '邮件', 128]] as const;
const addressFields = [['recipient', '收件人', 100], ['phone', '联系电话', 32], ['province', '省', 64], ['city', '市', 64], ['district', '区/县', 64]] as const;

function ChildEditor({ editor, customerId, customerName, systemCode, gateway, projectRoles, onClose, onSaved, onSaving }: {
  editor: { kind: 'contact'; record?: CustomerContact } | { kind: 'address'; record?: CustomerAddress };
  customerId: string; customerName: string; systemCode: string; gateway: EnterpriseGateway; onClose: () => void; onSaved: () => Promise<void>; onSaving: (saving: boolean) => void;
  projectRoles: { value: string; label: string }[];
}) {
  const isContact = editor.kind === 'contact';
  const title = `${editor.record ? '修改' : '新增'}${isContact ? '联系人' : '地址'}`;
  const fields = isContact ? contactFields : addressFields;
  const [initial] = useState<Record<string, string>>(() => {
    const record = editor.record as unknown as Record<string, unknown> | undefined;
    return Object.fromEntries([...fields.map(([key]) => [key, String(record?.[key] ?? '')]), ['status', String(record?.status ?? 'ACTIVE')], ['remark', String(record?.remark ?? '')], ...(!isContact ? [['addressType', String(record?.addressType ?? 'OFFICE')], ['detail', String(record?.detail ?? '')], ['isDefault', record?.isDefault ? 'true' : 'false']] : [])]);
  });
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const close = () => { if (!saving && (JSON.stringify(initial) === JSON.stringify(form) || window.confirm('放弃此记录未保存的修改吗？'))) onClose(); };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    formRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
    return () => previous?.focus();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return; setError('');
    const { isDefault, ...values } = form;
    const candidate = { ...values, sortNo: editor.record?.sortNo ?? 0, ...(!isContact ? { isDefault: isDefault === 'true' } : {}) };
    const parsed = (isContact ? customerContactWriteSchema : customerAddressWriteSchema).safeParse(candidate);
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join('；')); return; }
    setSaving(true); onSaving(true);
    try {
      if (isContact) {
        const input = customerContactWriteSchema.parse(candidate);
        if (editor.record) await gateway.updateContact(systemCode, customerId, editor.record.id, { ...input, version: editor.record.version });
        else await gateway.createContact(systemCode, customerId, input);
      } else {
        const input = customerAddressWriteSchema.parse(candidate);
        if (editor.record) await gateway.updateAddress(systemCode, customerId, editor.record.id, { ...input, version: editor.record.version });
        else await gateway.createAddress(systemCode, customerId, input);
      }
      await onSaved();
    } catch (reason) { setError(message(reason)); }
    finally { setSaving(false); onSaving(false); }
  };
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="enterprise-modal-backdrop"><form ref={formRef} className="enterprise-modal customer-child-editor" role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} onKeyDown={(event) => {
    if (event.key === 'Escape') { event.stopPropagation(); close(); }
    if (event.key === 'Tab') {
      const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'));
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <header><h2>{title}</h2><button type="button" aria-label={`关闭${title}`} disabled={saving} onClick={close}>×</button></header>
    <div className="modal-body form-grid">
      {error && <div className="enterprise-alert span-2" role="alert">{error}</div>}
      {!isContact && <label className="span-2">所属客户<input value={customerName} disabled /></label>}
      {!isContact && <label>地址类型<select disabled={saving} value={form.addressType} onChange={(event) => set('addressType', event.target.value)}>{!addressTypes[form.addressType] && <option value={form.addressType}>{form.addressType}</option>}{Object.entries(addressTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {fields.map(([key, label, max]) => <label key={key}>{label}{key === 'decisionRole' ? <select disabled={saving} value={form[key]} onChange={(event) => set(key, event.target.value)}>
        <option value="">请选择</option>
        {form[key] && !projectRoles.some((item) => item.value === form[key]) && <option value={form[key]} disabled>{form[key]}（历史值）</option>}
        {projectRoles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select> : <input type={key === 'email' ? 'email' : 'text'} required={key === 'name'} maxLength={max} disabled={saving} value={form[key]} onChange={(event) => set(key, event.target.value)} />}</label>)}
      {isContact && projectRoles.length === 0 && <small className="span-2">暂无可用项目角色，请在数据字典中维护“项目角色”。</small>}
      <label>状态<select disabled={saving} value={form.status} onChange={(event) => set('status', event.target.value)}>{!['ACTIVE', 'INACTIVE'].includes(form.status) && <option value={form.status}>{form.status}</option>}<option value="ACTIVE">{isContact ? '在职' : '启用'}</option><option value="INACTIVE">{isContact ? '离职' : '停用'}</option></select></label>
      {!isContact && <><label>是否默认<select disabled={saving} value={form.isDefault} onChange={(event) => set('isDefault', event.target.value)}><option value="false">否</option><option value="true">是</option></select></label><label className="span-2">详细地址<textarea required maxLength={500} disabled={saving} rows={2} value={form.detail} onChange={(event) => set('detail', event.target.value)} /></label></>}
      <label className="span-2">备注<textarea maxLength={500} disabled={saving} rows={2} value={form.remark} onChange={(event) => set('remark', event.target.value)} /></label>
    </div>
    <footer><button type="button" disabled={saving} onClick={close}>取消</button><button type="submit" className="is-primary" disabled={saving}>{saving ? '保存中…' : '保存'}</button></footer>
  </form></div>;
}
