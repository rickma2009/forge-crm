import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconChevronDown,
  IconCopy,
  IconDots,
  IconFileImport,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import './sales-order.css';

type Line = {
  id: string;
  code: string;
  name: string;
  specification: string;
  bom: string;
  quantity: number;
  unit: string;
  price: number;
  taxRate: number;
  deliveryDate: string;
  warehouse: string;
  draft?: boolean;
};

const initialLines: Line[] = [
  { id: '1', code: 'PRD-1001', name: '精密主轴组件', specification: 'Φ120×300 高精度', bom: 'BOM-1.0', quantity: 2, unit: '台', price: 28500, taxRate: 13, deliveryDate: '2026-09-20', warehouse: '广州成品仓' },
  { id: '2', code: 'PRD-2003', name: '伺服驱动器', specification: '7.5kW 380V', bom: 'BOM-2.1', quantity: 4, unit: '台', price: 8200, taxRate: 13, deliveryDate: '2026-09-18', warehouse: '广州成品仓' },
  { id: '3', code: 'PRD-3005', name: '直线导轨', specification: 'HGR20-1000mm', bom: '—', quantity: 10, unit: '套', price: 1280, taxRate: 13, deliveryDate: '2026-09-15', warehouse: '广州成品仓' },
  { id: '4', code: 'PRD-4002', name: '气动夹爪', specification: 'MHF2-16D', bom: 'BOM-1.2', quantity: 6, unit: '个', price: 1750, taxRate: 13, deliveryDate: '2026-09-20', warehouse: '广州成品仓' },
];

const products = [
  { code: 'PRD-5001', name: '滚珠丝杠副', specification: 'SFU1605-1000mm', bom: 'BOM-1.0', stock: 120, price: 2360, unit: '套' },
  { code: 'PRD-5002', name: '步进电机', specification: '86HD85-80 2.6N·m', bom: 'BOM-1.1', stock: 65, price: 1680, unit: '台' },
  { code: 'PRD-5003', name: '联轴器', specification: '弹性梅花联轴器 L55', bom: 'BOM-1.0', stock: 240, price: 460, unit: '个' },
];

const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 });

export function SalesOrderPrototype() {
  const [lines, setLines] = useState(initialLines);
  const [selected, setSelected] = useState<Set<string>>(new Set(['4']));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; removed?: { line: Line; index: number } } | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'草稿' | '已提交'>('草稿');

  useEffect(() => {
    if (pickerOpen) codeInput.current?.focus();
  }, [pickerOpen]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.price, 0), [lines]);
  const tax = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.price * line.taxRate / 100, 0), [lines]);

  const addLine = () => {
    const draft: Line = { id: `draft-${Date.now()}`, code: '', name: '', specification: '', bom: '', quantity: 1, unit: '台', price: 0, taxRate: 13, deliveryDate: '2026-09-04', warehouse: '广州成品仓', draft: true };
    setLines((current) => [...current, draft]);
    setEditingId(draft.id);
    setPickerOpen(true);
  };

  const updateLine = (id: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));

  const chooseProduct = (product: typeof products[number]) => {
    if (!editingId) return;
    updateLine(editingId, { ...product, draft: true });
    setPickerOpen(false);
  };

  const removeLine = (id: string) => {
    const index = lines.findIndex((line) => line.id === id);
    const line = lines[index];
    if (!line) return;
    setLines((current) => current.filter((item) => item.id !== id));
    setSelected((current) => { const next = new Set(current); next.delete(id); return next; });
    if (!line.draft) setToast({ message: `已删除第 ${index + 1} 行`, removed: { line, index } });
  };

  const deleteSelected = () => {
    const ids = [...selected];
    if (!ids.length) return;
    const first = lines.findIndex((line) => ids.includes(line.id));
    const removed = lines.filter((line) => ids.includes(line.id));
    setLines((current) => current.filter((line) => !selected.has(line.id)));
    setSelected(new Set());
    setToast({ message: `已删除 ${ids.length} 行`, removed: removed.length === 1 ? { line: removed[0], index: first } : undefined });
  };

  const undo = () => {
    if (!toast?.removed) return;
    setLines((current) => {
      const next = [...current];
      next.splice(toast.removed!.index, 0, toast.removed!.line);
      return next;
    });
    setToast(null);
  };

  const copySelected = () => {
    const copies = lines.filter((line) => selected.has(line.id)).map((line) => ({ ...line, id: `copy-${line.id}-${Date.now()}`, draft: true }));
    if (!copies.length) return;
    setLines((current) => [...current, ...copies]);
    setToast({ message: `已复制 ${copies.length} 行` });
  };

  const save = (submit: boolean) => {
    setLines((current) => current.map((line) => ({ ...line, draft: false })));
    setEditingId(null);
    setPickerOpen(false);
    if (submit) setStatus('已提交');
    setToast({ message: submit ? '订单已保存并提交' : '草稿已保存' });
  };

  return <div className="sales-order-page">
    <header className="sales-order-head">
      <div className="sales-order-title"><h1>新建销售订单</h1><span className={`sales-order-status ${status === '已提交' ? 'is-submitted' : ''}`}>{status}</span><i>·</i><small>{status === '草稿' ? '保存后生成单号' : 'SO-202609-0187'}</small></div>
      <div className="sales-order-head-actions"><button type="button" onClick={() => save(false)}>暂存</button><button className="primary" type="button" onClick={() => save(true)}>保存并提交</button><button className="icon-only" type="button" aria-label="更多订单操作"><IconDots size={18} /></button></div>
    </header>

    <section className="order-header-fields" aria-label="销售订单表头">
      <label className="required">客户<div className="input-with-icon"><input defaultValue="广州精工设备有限公司" /><IconSearch size={16} /></div></label>
      <label>客户 PO 号<input placeholder="请输入客户PO号" /></label>
      <label className="required">订单日期<input type="date" defaultValue="2026-09-05" /></label>
      <label className="required">要求交付日期<input type="date" defaultValue="2026-09-20" /></label>
      <label className="required">币种<select defaultValue="CNY"><option value="CNY">CNY 人民币</option><option value="USD">USD 美元</option></select></label>
      <label className="required">价格表<select defaultValue="standard"><option value="standard">标准价目表（2026）</option></select></label>
      <label className="required">结算条款<select defaultValue="monthly"><option value="monthly">月结30天</option><option value="prepay">款到发货</option></select></label>
      <label className="address required">发货地址<div className="input-with-icon"><input defaultValue="广东省广州市番禺区南村镇万博二路79号" /><IconSearch size={16} /></div></label>
      <label>负责人<input defaultValue="陈思远" readOnly /></label>
    </section>

    <section className="order-lines" aria-label="订单明细">
      <div className="lines-heading"><h2>订单明细 <span>{lines.length}</span></h2><p><kbd>Enter</kbd> 新行 <i>·</i> <kbd>Tab</kbd> 移动 <i>·</i> <kbd>Esc</kbd> 取消</p></div>
      <div className="lines-toolbar">
        <button className="add-line" type="button" onClick={addLine}><IconPlus size={17} />添加一行</button>
        <button type="button"><IconFileImport size={16} />批量导入</button>
        <button type="button" disabled={!selected.size} onClick={copySelected}><IconCopy size={16} />复制所选</button>
        <button type="button" disabled={!selected.size} onClick={deleteSelected}><IconTrash size={16} />删除所选</button>
      </div>
      <div className="sales-grid-wrap">
        <table className="sales-grid">
          <thead><tr><th className="select-cell"><input aria-label="选择全部订单行" type="checkbox" checked={selected.size === lines.length && lines.length > 0} onChange={(event) => setSelected(event.target.checked ? new Set(lines.map((line) => line.id)) : new Set())} /></th><th className="row-no">#</th><th className="product-code">产品编码</th><th>产品名称</th><th>规格</th><th>BOM版本</th><th>数量</th><th>单位</th><th>含税单价</th><th>税率</th><th>交付日期</th><th>仓库</th><th className="amount">金额</th><th className="action-cell">操作</th></tr></thead>
          <tbody>{lines.map((line, index) => {
            const editing = editingId === line.id;
            const invalidDate = line.deliveryDate < '2026-09-05';
            return <tr key={line.id} className={`${editing ? 'is-editing' : ''} ${selected.has(line.id) ? 'is-selected' : ''}`}>
              <td className="select-cell"><input aria-label={`选择第 ${index + 1} 行`} type="checkbox" checked={selected.has(line.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(line.id); else next.delete(line.id); return next; })} /></td>
              <td className="row-no">{index + 1}</td>
              <td className="product-code">{editing ? <div className="product-picker"><div className="input-with-icon"><input ref={codeInput} aria-label="产品编码" value={line.code} placeholder="输入产品编码" onFocus={() => setPickerOpen(true)} onChange={(event) => updateLine(line.id, { code: event.target.value })} /><IconSearch size={15} /></div>{pickerOpen && <div className="product-menu" role="listbox" aria-label="匹配产品"><div className="product-menu-search"><IconSearch size={15} />搜索产品编码 / 名称 / 规格</div>{products.map((product) => <button key={product.code} type="button" role="option" onClick={() => chooseProduct(product)}><strong>{product.code}</strong><span>{product.name} · {product.specification}</span><small>可用库存 <b>{product.stock}</b><i>BOM {product.bom.replace('BOM-', '')}</i></small></button>)}<footer>查看全部匹配结果</footer></div>}</div> : <button className="code-link" type="button" onClick={() => setEditingId(line.id)}>{line.code}</button>}</td>
              <td>{editing ? <input aria-label="产品名称" value={line.name} onChange={(event) => updateLine(line.id, { name: event.target.value })} /> : line.name}</td>
              <td>{editing ? <input aria-label="规格" value={line.specification} onChange={(event) => updateLine(line.id, { specification: event.target.value })} /> : line.specification}</td>
              <td>{editing ? <select aria-label="BOM版本" value={line.bom} onChange={(event) => updateLine(line.id, { bom: event.target.value })}><option value="">选择版本</option><option value="BOM-1.0">BOM-1.0</option><option value="BOM-1.1">BOM-1.1</option></select> : line.bom}</td>
              <td>{editing ? <input className="number-input" aria-label="数量" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} /> : line.quantity}</td>
              <td>{editing ? <select aria-label="单位" value={line.unit} onChange={(event) => updateLine(line.id, { unit: event.target.value })}><option>台</option><option>套</option><option>个</option></select> : line.unit}</td>
              <td>{editing ? <input className="number-input" aria-label="含税单价" type="number" min="0" value={line.price} onChange={(event) => updateLine(line.id, { price: Number(event.target.value) })} /> : line.price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
              <td>{editing ? <select aria-label="税率" value={line.taxRate} onChange={(event) => updateLine(line.id, { taxRate: Number(event.target.value) })}><option value="13">13%</option><option value="9">9%</option><option value="0">0%</option></select> : `${line.taxRate}%`}</td>
              <td className={invalidDate ? 'has-error' : ''}>{editing ? <><input aria-label="交付日期" type="date" value={line.deliveryDate} onChange={(event) => updateLine(line.id, { deliveryDate: event.target.value })} />{invalidDate && <span role="alert">交付日期不能早于订单日期</span>}</> : line.deliveryDate}</td>
              <td>{editing ? <select aria-label="仓库" value={line.warehouse} onChange={(event) => updateLine(line.id, { warehouse: event.target.value })}><option>广州成品仓</option><option>深圳备货仓</option></select> : line.warehouse}</td>
              <td className="amount">{line.price ? currency.format(line.quantity * line.price) : '—'}</td>
              <td className="action-cell"><div>{line.bom && line.bom !== '—' && !editing && <button type="button">查看BOM</button>}<button className="trash-action" type="button" title={line.draft ? '删除空白行' : '删除并可撤销'} aria-label={`删除第 ${index + 1} 行`} onClick={() => removeLine(line.id)}><IconTrash size={16} /></button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className="grid-scroll-hint"><span /></div>
      <div className="order-totals"><div><span>未税金额</span><strong>{currency.format(subtotal)}</strong></div><div><span>税额</span><strong>{currency.format(tax)}</strong></div><div className="grand-total"><span>含税合计</span><strong>{currency.format(subtotal + tax)}</strong></div></div>
    </section>

    <label className="order-note">备注<textarea maxLength={300} placeholder="请输入订单备注信息（选填）" /><span>0/300</span></label>
    <footer className="sales-order-footer"><small>所有修改仅保留在本次演示会话</small><div><button type="button" onClick={() => save(false)}>暂存</button><button className="primary" type="button" onClick={() => save(true)}>保存并提交</button><button className="split-button" type="button" aria-label="展开提交选项"><IconChevronDown size={16} /></button></div></footer>
    {toast && <div className="order-toast" role="status"><span>{toast.message}</span>{toast.removed && <button type="button" onClick={undo}>撤销</button>}<small>{toast.removed ? '8秒' : ''}</small><button className="toast-close" type="button" aria-label="关闭提示" onClick={() => setToast(null)}><IconX size={16} /></button></div>}
  </div>;
}
