import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Product, ProductWrite } from '@interaction-pattern-lab/contracts';
import { GatewayError, type EnterpriseGateway } from './gateway';
import { PricingEditor } from './QuotationPages';
import { AttachmentPanel } from './AttachmentPanel';
import './product-detail.css';

type ProductTab = 'info' | 'pricing' | 'attachments';

export function ProductDetailPage({ systemCode, productId, allowedActions, gateway, onBack }: {
  systemCode: string;
  productId: string;
  allowedActions: string[];
  gateway: EnterpriseGateway;
  onBack: () => void;
}) {
  const [item, setItem] = useState<Product | null>(null);
  const [tab, setTab] = useState<ProductTab>('info');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const canUpdate = allowedActions.includes('update');
  const formId = `product-basic-${productId}`;

  const load = async () => {
    try { setItem(await gateway.productDetail(systemCode, productId)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '产品加载失败'); }
  };
  useEffect(() => { void load(); }, [productId, systemCode]);

  if (!item) return <div className="enterprise-page" role={error ? 'alert' : 'status'}>{error || '正在加载产品…'}</div>;

  const deleteProduct = async () => {
    if (!window.confirm(`删除产品“${item.productName}”？`)) return;
    try { await gateway.deleteProduct(systemCode, item.id, item.version); onBack(); }
    catch (reason) {
      if (reason instanceof GatewayError && reason.details) {
        const labels: Record<string, string> = { opportunities: '商机', quotations: '报价单', prices: '定价', attachments: '附件' };
        const refs = Object.entries(reason.details).filter(([, value]) => Number(value) > 0).map(([key, value]) => `${labels[key] ?? key} ${value} 条`).join('、');
        setError(`${reason.message}${refs ? `：${refs}` : ''}`);
      } else setError(reason instanceof Error ? reason.message : '删除失败');
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUpdate || saving) return;
    const data = new FormData(event.currentTarget);
    const input: ProductWrite & { version: number } = {
      productCode: item.productCode,
      productName: String(data.get('productName') ?? '').trim(),
      model: String(data.get('model') ?? '').trim() || null,
      productLine: String(data.get('productLine') ?? '').trim() || null,
      unit: String(data.get('unit') ?? '').trim() || null,
      status: String(data.get('status') ?? item.status) as ProductWrite['status'],
      remark: String(data.get('remark') ?? '').trim() || null,
      version: item.version,
    };
    setSaving(true); setError('');
    try { setItem(await gateway.updateProduct(systemCode, item.id, input)); setEditing(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '产品保存失败'); }
    finally { setSaving(false); }
  };

  const tabs: Array<{ key: ProductTab; label: string }> = [
    { key: 'info', label: '产品信息' },
    ...(allowedActions.includes('price-view') ? [{ key: 'pricing' as const, label: '产品定价' }] : []),
    ...(allowedActions.includes('attachment-view') ? [{ key: 'attachments' as const, label: '附件' }] : []),
  ];
  const moveTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.findIndex((entry) => entry.key === tab);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    setTab(tabs[index].key);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
  };

  return <div className="enterprise-page product-detail-page">
    <header className="product-object-header">
      <button className="product-back-button" type="button" aria-label="返回产品列表" onClick={onBack}>←</button>
      <div className="product-object-identity">
        <div><h1>{item.productName}</h1><span className={`status-pill ${item.status === 'ACTIVE' ? '' : 'is-inactive'}`}>{item.status === 'ACTIVE' ? '启用' : '停用'}</span></div>
        <p><span>产品编码：<code>{item.productCode}</code></span><span>型号：{item.model || '—'}</span><span>产品线：{item.productLine || '—'}</span></p>
      </div>
      <div className="product-object-actions">
        {editing ? <><button type="button" disabled={saving} onClick={() => { formRef.current?.reset(); setEditing(false); setError(''); }}>取消编辑</button><button className="is-primary" form={formId} type="submit" disabled={saving}>{saving ? '保存中…' : '保存产品'}</button></> : <>{canUpdate && <button className="is-primary" type="button" onClick={() => { setTab('info'); setEditing(true); }}>编辑产品</button>}{allowedActions.includes('delete') && <button type="button" onClick={() => void deleteProduct()}>删除</button>}</>}
      </div>
    </header>

    <div className="product-inner-tabs" role="tablist" aria-label="产品详情分区" onKeyDown={moveTab}>
      {tabs.map((entry) => <button key={entry.key} id={`${productId}-${entry.key}-tab`} type="button" role="tab" tabIndex={tab === entry.key ? 0 : -1} aria-selected={tab === entry.key} aria-controls={`${productId}-${entry.key}-panel`} onClick={() => setTab(entry.key)}>{entry.label}</button>)}
    </div>

    {error && <div className="enterprise-alert" role="alert">{error}</div>}
    <section className="product-detail-panel" role="tabpanel" id={`${productId}-${tab}-panel`} aria-labelledby={`${productId}-${tab}-tab`}>
      {tab === 'info' && <form key={item.version} ref={formRef} id={formId} className="product-basic-form" onSubmit={save}>
        <div className="form-grid">
          <label>产品编码<input aria-label="产品编码" value={item.productCode} disabled /></label>
          <label>产品名称<input aria-label="产品名称" name="productName" required defaultValue={item.productName} disabled={!editing || saving} /></label>
          <label>型号<input name="model" defaultValue={item.model || ''} disabled={!editing || saving} /></label>
          <label>产品线<input name="productLine" defaultValue={item.productLine || ''} disabled={!editing || saving} /></label>
          <label>单位<input name="unit" defaultValue={item.unit || ''} disabled={!editing || saving} /></label>
          <label>状态<select name="status" defaultValue={item.status} disabled={!editing || saving}><option value="ACTIVE">启用</option><option value="INACTIVE">停用</option></select></label>
          <label className="span-2">备注<textarea name="remark" rows={3} defaultValue={item.remark || ''} disabled={!editing || saving} /></label>
        </div>
      </form>}
      {tab === 'pricing' && <div className="product-tab-content"><div className="table-toolbar"><strong>产品定价</strong><button type="button" onClick={() => setPricingOpen(true)}>{allowedActions.includes('price-manage') ? '维护定价' : '查看定价'}</button></div><p className="product-tab-summary">产品编码：{item.productCode} · 产品名称：{item.productName} · 单位：{item.unit || '—'}</p>{pricingOpen && <PricingEditor systemCode={systemCode} productId={item.id} canManage={allowedActions.includes('price-manage')} onClose={() => setPricingOpen(false)} />}</div>}
      {tab === 'attachments' && <AttachmentPanel systemCode={systemCode} ownerType="PRODUCT" ownerId={item.id} allowedActions={allowedActions} gateway={gateway} />}
    </section>
  </div>;
}
