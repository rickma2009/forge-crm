import { DeclarativeDataGrid } from './data-grid/DeclarativeDataGrid';
import { useEffect, useRef, useState } from 'react';
import type { Product, ProductList } from '@forge-crm/contracts';
import './product-picker-dialog.css';

export type ProductPickerMode = 'single' | 'multiple';
export type ProductPickerQuery = { keyword: string; page: number; pageSize: number };

export function ProductPickerDialog({ mode, loadProducts, onConfirm, onClose }: {
  mode: ProductPickerMode;
  loadProducts: (query: ProductPickerQuery) => Promise<ProductList>;
  onConfirm: (products: Product[]) => void | Promise<void>;
  onClose: () => void;
}) {
  const pageSize = 20;
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ProductList | null>(null);
  const [selected, setSelected] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const current = ++requestId.current;
    setLoading(true); setError('');
    void loadProducts({ keyword: submittedKeyword, page, pageSize })
      .then((next) => { if (current === requestId.current) setResult(next); })
      .catch((reason: unknown) => { if (current === requestId.current) setError(reason instanceof Error ? reason.message : '产品查询失败，请重试'); })
      .finally(() => { if (current === requestId.current) setLoading(false); });
  }, [loadProducts, page, submittedKeyword]);

  const select = (product: Product, checked: boolean) => setSelected((previous) => {
    if (mode === 'single') return checked ? new Map([[product.id, product]]) : new Map();
    const next = new Map(previous);
    if (checked) next.set(product.id, product); else next.delete(product.id);
    return next;
  });
  const currentItems = result?.items ?? [];
  const allCurrentSelected = currentItems.length > 0 && currentItems.every((product) => selected.has(product.id));
  const submit = () => { setSubmittedKeyword(keyword.trim()); setPage(1); };
  const confirm = async () => {
    if (!selected.size || confirming) return;
    setConfirming(true); setError('');
    try { await onConfirm([...selected.values()]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '添加产品失败，请重试'); }
    finally { setConfirming(false); }
  };

  return <div className="enterprise-modal-backdrop"><div role="dialog" aria-modal="true" aria-label="选择产品" className="enterprise-modal product-picker-dialog">
    <header><h2>选择产品</h2><button type="button" disabled={confirming} onClick={onClose} aria-label="关闭">×</button></header>
    <div className="modal-body">
      {error && <p role="alert" className="enterprise-alert">{error}</p>}
      <div className="product-picker-query"><label className="sr-only" htmlFor="product-picker-keyword">查询产品</label><input id="product-picker-keyword" aria-label="查询产品" placeholder="产品编码 / 产品名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} /><button type="button" className="is-primary" disabled={loading || confirming} onClick={submit}>查询</button></div>
      <div className="enterprise-table-wrap"><DeclarativeDataGrid><thead><tr><th className="product-picker-select">{mode === 'multiple' && <input type="checkbox" aria-label="选择当前页全部产品" checked={allCurrentSelected} onChange={(event) => { const checked = event.target.checked; setSelected((previous) => { const next = new Map(previous); currentItems.forEach((product) => checked ? next.set(product.id, product) : next.delete(product.id)); return next; }); }} />}</th><th>产品编码</th><th>产品名称</th><th>产品中类</th><th>产品小类</th></tr></thead><tbody>{loading ? <tr><td colSpan={5}>正在加载产品…</td></tr> : currentItems.length ? currentItems.map((product) => <tr key={product.id}><td><input type={mode === 'single' ? 'radio' : 'checkbox'} name={mode === 'single' ? 'selected-product' : undefined} aria-label={`选择产品 ${product.productCode}`} checked={selected.has(product.id)} onChange={(event) => select(product, event.target.checked)} /></td><td title={product.productCode}>{product.productCode}</td><td title={product.productName}>{product.productName}</td><td title={product.middleCategoryName || '—'}>{product.middleCategoryName || '—'}</td><td title={product.minorCategoryName || '—'}>{product.minorCategoryName || '—'}</td></tr>) : <tr><td colSpan={5}>暂无符合条件的产品</td></tr>}</tbody></DeclarativeDataGrid></div>
      <div className="product-picker-pagination"><span>已选 {selected.size} 项</span><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</button><span>第 {result?.pagination.page ?? page} / {Math.max(result?.pagination.totalPages ?? 1, 1)} 页</span><button type="button" disabled={loading || page >= (result?.pagination.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)}>下一页</button></div>
    </div>
    <footer><button type="button" disabled={confirming} onClick={onClose}>取消</button><button type="button" className="is-primary" disabled={!selected.size || confirming} onClick={() => void confirm()}>{confirming ? '添加中…' : '确认'}</button></footer>
  </div></div>;
}
