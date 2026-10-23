import { useEffect, useRef, useState } from 'react';
import { quotationLineWriteSchema, quotationLineAmount, suggestedPrice, type Product, type ProductPrice, type QuotationDraft } from '@forge-crm/contracts';
import type { EnterpriseGateway } from './gateway';
import { quotationApi } from './quotation-api';

export type EditorLine = QuotationDraft['lines'][number] & { productName: string; model: string | null; unit: string; suggested: string; source: string; manual: boolean; lowerQty?: string | null; upperQty?: string | null };

export function QuotationLineDialog({ initial, products, systemCode, businessDate, gateway, onConfirm, onClose }: {
  initial: EditorLine | null; products: Product[]; systemCode: string; gateway: EnterpriseGateway;
  businessDate: string;
  onConfirm: (line: EditorLine) => void; onClose: () => void;
}) {
  const [line, setLine] = useState<EditorLine | null>(() => initial ? { ...initial } : null);
  const [options, setOptions] = useState(products), [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState(initial?.productId ?? '');
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [pricingPending, setPricingPending] = useState(false), [pricingError, setPricingError] = useState('');
  const price = useRef<ProductPrice | null>(null), page = useRef(1), request = useRef(0);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { setOptions((old) => [...products, ...old.filter((p) => !products.some((x) => x.id === p.id))]); }, [products]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    form.current?.querySelector<HTMLElement>('input,select,button')?.focus();
    return () => { request.current++; previous?.focus(); };
  }, []);
  const search = async (more: boolean) => {
    setLoading(true); setError('');
    try {
      const nextPage = more ? page.current + 1 : 1;
      const result = await gateway.products(systemCode, new URLSearchParams({ keyword, page: String(nextPage), pageSize: '100' }));
      setOptions((old) => { const keep = more ? old : old.filter((p) => p.id === selected); return [...keep, ...result.items.filter((p) => !keep.some((x) => x.id === p.id))]; });
      page.current = nextPage;
    } catch (e) { setError(e instanceof Error ? e.message : '产品查询失败，请重试'); }
    finally { setLoading(false); }
  };
  const choose = async (id: string) => {
    setSelected(id); setLine(null); price.current = null; setError(''); setPricingError(''); setPricingPending(false);
    const requestVersion = ++request.current;
    if (!id) return;
    setLoading(true);
    try {
      const product = options.find((p) => p.id === id);
      if (!product || product.status !== 'ACTIVE') throw new Error('产品不存在或已停用');
      const { current } = await quotationApi.prices(systemCode, id, undefined, businessDate);
      if (requestVersion !== request.current) return;
      if (!current) {
        setLine({ id: crypto.randomUUID(), productId: id, priceId: null, quantity: '1', unitPrice: '0.00', discount: '1', delivery: '', remark: '', productName: product.productName, model: product.model ?? null, unit: product.unit ?? '', suggested: '0.00', source: 'UNPRICED', lowerQty: null, upperQty: null, manual: true });
        return;
      }
      price.current = current;
      const s = suggestedPrice(current.standardPrice, current.tiers, '1');
      setLine({ id: crypto.randomUUID(), productId: id, priceId: current.id, quantity: '1', unitPrice: s.price, discount: '1', delivery: '', remark: '', productName: product.productName, model: product.model ?? null, unit: product.unit ?? '', suggested: s.price, source: s.source, lowerQty: s.from, upperQty: s.to, manual: false });
    } catch (e) { if (requestVersion === request.current) setError(e instanceof Error ? e.message : '产品取价失败'); }
    finally { if (requestVersion === request.current) setLoading(false); }
  };
  const update = async (key: 'quantity' | 'unitPrice' | 'discount' | 'delivery' | 'remark', value: string) => {
    if (!line) return;
    setError('');
    setLine((old) => old && ({ ...old, [key]: value, ...(key === 'unitPrice' ? { manual: true } : {}) }));
    if (key !== 'quantity') return;
    if (line.priceId === null) return;
    const requestVersion = ++request.current;
    setPricingPending(true); setPricingError('');
    try {
      let pricing = price.current;
      if (!pricing) {
        const data = await quotationApi.prices(systemCode, line.productId, line.priceId, businessDate);
        pricing = data.history.find((p) => p.id === line.priceId) ?? null;
        if (pricing && requestVersion === request.current) price.current = pricing;
      }
      if (!pricing) throw new Error('原价格版本不可用，请重试');
      const s = suggestedPrice(pricing.standardPrice, pricing.tiers, value);
      if (requestVersion === request.current) setLine((old) => old && ({ ...old, suggested: s.price, source: s.source, lowerQty: s.from, upperQty: s.to, unitPrice: old.manual ? old.unitPrice : s.price }));
    } catch (e) { if (requestVersion === request.current) { const text = e instanceof Error ? e.message : '数量或价格无效'; setError(text); setPricingError(text); } }
    finally { if (requestVersion === request.current) setPricingPending(false); }
  };
  let amount = '—';
  try { if (line) amount = quotationLineAmount(line.quantity, line.unitPrice, line.discount); } catch { /* Validation stays in this dialog. */ }
  const commit = () => {
    if (loading || pricingPending) return;
    if (!line) { setError('请选择产品'); return; }
    const { id, productId, priceId, quantity, unitPrice, discount, delivery, remark } = line;
    const parsed = quotationLineWriteSchema.safeParse({ id, productId, priceId, quantity, unitPrice, discount, delivery, remark });
    if (!parsed.success || amount === '—') { setError('请检查数量、单价、折扣和文本长度：数量须大于 0，单价不得小于 0，折扣范围为 0–1（1 表示不打折，0.9 表示九折）。'); return; }
    if (pricingError) { setError(pricingError); return; }
    onConfirm({ ...line, ...parsed.data });
  };
  return <div className="enterprise-modal-backdrop"><form ref={form} className="enterprise-modal quote-line-dialog" role="dialog" aria-modal="true" aria-label={initial ? '编辑报价明细' : '添加报价明细'} onSubmit={(e) => { e.preventDefault(); commit(); }} onKeyDown={(e) => {
    if (e.key === 'Escape' && !loading) { e.preventDefault(); onClose(); }
    if (e.key !== 'Tab') return;
    const controls = [...(form.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)') ?? [])];
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }}>
    <header><h2>{initial ? '编辑报价明细' : '添加报价明细'}</h2><button type="button" aria-label="关闭明细弹窗" disabled={loading} onClick={onClose}>×</button></header>
    <div className="modal-body">
      {error && <p role="alert" className="enterprise-alert">{error}</p>}
      <fieldset disabled={loading}>
        {!initial && <><div className="quote-lookup"><input aria-label="查找报价产品" placeholder="产品编码/名称/型号" value={keyword} onChange={(e) => setKeyword(e.target.value)} /><button type="button" onClick={() => void search(false)}>查询产品</button><button type="button" onClick={() => void search(true)}>加载更多</button></div><label>产品<select aria-label="选择报价产品" value={selected} onChange={(e) => void choose(e.target.value)}><option value="">请选择产品</option>{options.filter((p) => p.status === 'ACTIVE').map((p) => <option key={p.id} value={p.id}>{p.productCode} · {p.productName}</option>)}</select></label></>}
        {line && <><div className="quote-line-product"><strong>{line.productName}</strong><span>型号：{line.model || '—'} · 单位：{line.unit}</span></div><div className="form-grid">
          <label>数量<input inputMode="decimal" value={line.quantity} onChange={(e) => void update('quantity', e.target.value)} /></label>
          <label>单价<input inputMode="decimal" value={line.unitPrice} onChange={(e) => void update('unitPrice', e.target.value)} /></label>
          <label>折扣<input inputMode="decimal" value={line.discount} onChange={(e) => void update('discount', e.target.value)} /></label>
          <label>含税小计<input readOnly value={amount} /></label>
          <label className="span-2">交付说明<input maxLength={200} value={line.delivery} onChange={(e) => void update('delivery', e.target.value)} /></label>
          <label className="span-2">行备注<textarea maxLength={2000} value={line.remark} onChange={(e) => void update('remark', e.target.value)} /></label>
        </div><p className="quote-hint">{line.source === 'UNPRICED' ? '未配置销售定价，请填写单价' : <>建议价：¥ {line.suggested} · {line.source === 'TIER' ? '阶梯价' : '标准价'}{line.manual ? ' · 已手工改价，修改数量不覆盖单价' : ''}</>}</p></>}
      </fieldset>
      {(loading || pricingPending) && <p role="status">正在加载…</p>}
    </div><footer><span className="quote-hint">确认后更新明细，整单仍需保存草稿。</span><button type="button" disabled={loading} onClick={onClose}>取消</button><button className="is-primary" disabled={loading || pricingPending} type="submit">确认</button></footer>
  </form></div>;
}
