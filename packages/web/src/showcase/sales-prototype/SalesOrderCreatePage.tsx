import { useState } from 'react';
import { DeclarativeDataGrid } from '../../common/data-grid/DeclarativeDataGrid';
import { DetailHeader, DetailWorkspace } from '../../common/DetailWorkspace';
import { RecordQueryBar } from '../../common/RecordQueryBar';
import { customers, money, nextNo, sourceLabels, sources, type SalesOrder, type SalesState, type Source } from './model';

const orderBase = '/showcase/sales-orders';
const customerRows = customers.map((name, index) => ({ code: `C202609000${index + 1}`, name, shortName: ['星海智造', '云杉科技', '海岳电子'][index], region: ['华东', '华东', '华南'][index], status: '启用' }));

export function SalesOrderCreatePage({ state, update, onNavigate, canWrite }: { state: SalesState; update: (next: SalesState) => void; onNavigate: (path: string) => void; canWrite: boolean }) {
  const [source, setSource] = useState<Source>('MANUAL');
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const changeSource = (next: Source) => { setSource(next); setInput(''); setKeyword(''); setSelected(''); setError(''); };
  const search = keyword.trim().toLocaleLowerCase();
  const visibleCustomers = customerRows.filter((row) => row.name.toLocaleLowerCase().includes(search));
  const eligibleSources = sources.filter((row) => row.kind === source && (row.kind !== 'QUOTATION' || !state.orders.some((order) => order.sourceNo === row.no && order.status !== 'CANCELLED')));
  const visibleSources = eligibleSources.filter((row) => (source === 'OPPORTUNITY' ? row.name : `${row.customer} ${row.name} ${row.no}`).toLocaleLowerCase().includes(search));
  const create = () => {
    if (!canWrite) return;
    const customer = customerRows.find((row) => row.code === selected);
    const document = eligibleSources.find((row) => row.no === selected);
    if ((source === 'MANUAL' && !customer) || (source !== 'MANUAL' && !document)) { setError(`请从${source === 'MANUAL' ? '客户' : source === 'OPPORTUNITY' ? '商机' : '报价单'}列表选择一条记录`); return; }
    const date = new Date().toISOString().slice(0, 10);
    const order: SalesOrder = {
      id: crypto.randomUUID(), no: nextNo('SO', state.orders.map((row) => row.no)), status: 'DRAFT', source,
      sourceNo: document?.no ?? '', customer: document?.customer ?? customer!.name, date, createdAt: date,
      seller: '周然', organization: '华东销售中心', region: '华东', type: '标准销售', discount: 100, taxRate: 13, remark: '',
      lines: document?.lines.map((line) => ({ ...line, id: crypto.randomUUID() })) ?? [],
    };
    update({ ...state, orders: [...state.orders, order] });
    onNavigate(`${orderBase}/${order.id}/edit`);
  };
  return <DetailWorkspace className="sales-create-page">
    <DetailHeader title="新建销售订单" backLabel="返回销售订单列表" onBack={() => onNavigate(orderBase)} fields={[{ label: '当前来源', value: sourceLabels[source] }, { label: '创建方式', value: '选择记录后生成草稿' }]} />
    <div className="sales-create-options" role="radiogroup" aria-label="订单来源">
      <span className="sales-create-options-title" aria-hidden="true">订单来源</span>
      {(['MANUAL', 'OPPORTUNITY', 'QUOTATION'] as const).map((option) => <label key={option}>
        <input type="radio" name="sales-order-source" value={option} checked={source === option} onChange={() => changeSource(option)} />
        <span>{sourceLabels[option]}</span>
      </label>)}
    </div>
    <section className="sales-create-content">
      <p className="sales-create-help">{source === 'MANUAL' ? '从客户列表选择一位客户，确定后进入订单详情添加产品。' : source === 'OPPORTUNITY' ? '选择进行中的商机；客户和商机产品将带入订单，进入详情后仍可调整产品。' : '选择已接受且仍有效的报价单；客户、产品和价格将作为快照带入订单，进入详情后仍可调整产品。'}</p>
      <RecordQueryBar onQuery={() => { setKeyword(input); setSelected(''); setError(''); }} onReset={() => { setInput(''); setKeyword(''); setSelected(''); setError(''); }}>
        <label className="keyword-field">{source === 'MANUAL' ? '客户名称' : source === 'OPPORTUNITY' ? '商机名称' : '客户或报价说明'}<input value={input} placeholder={source === 'MANUAL' ? '输入客户名称查询' : source === 'OPPORTUNITY' ? '输入商机名称查询' : '输入客户或报价说明查询'} onChange={(event) => setInput(event.target.value)} /></label>
      </RecordQueryBar>
      <div className="sales-create-list-heading"><h2>{source === 'MANUAL' ? '客户列表' : source === 'OPPORTUNITY' ? '可引入商机' : '可引入报价单'}</h2><span>共 {source === 'MANUAL' ? visibleCustomers.length : visibleSources.length} 条 · 单选</span></div>
      <div className="enterprise-table-wrap"><DeclarativeDataGrid key={source} aria-label={source === 'MANUAL' ? '客户列表' : source === 'OPPORTUNITY' ? '商机列表' : '报价单列表'}><thead><tr>
        <th className="sales-create-select-column">选择</th>
        {source === 'MANUAL' ? <><th>客户编码</th><th>客户名称</th><th>客户简称</th><th>所属区域</th><th>状态</th></> : source === 'OPPORTUNITY' ? <><th>商机编码</th><th>商机名称</th><th>客户名称</th><th>商机阶段</th><th>负责人</th><th>预计金额</th><th>状态</th></> : <><th>报价单号</th><th>报价说明</th><th>客户名称</th><th>报价金额</th><th>有效期至</th><th>状态</th></>}
      </tr></thead><tbody>
        {source === 'MANUAL' ? visibleCustomers.map((row) => <tr key={row.code} className={selected === row.code ? 'sales-create-selected' : ''} onClick={() => { setSelected(row.code); setError(''); }}><td><input type="radio" name="sales-source-record" aria-label={`选择客户 ${row.name}`} checked={selected === row.code} onChange={() => { setSelected(row.code); setError(''); }} /></td><td>{row.code}</td><td>{row.name}</td><td>{row.shortName}</td><td>{row.region}</td><td>{row.status}</td></tr>) : visibleSources.map((row) => <tr key={row.no} className={selected === row.no ? 'sales-create-selected' : ''} onClick={() => { setSelected(row.no); setError(''); }}><td><input type="radio" name="sales-source-record" aria-label={`选择${source === 'OPPORTUNITY' ? '商机' : '报价单'} ${row.no}`} checked={selected === row.no} onChange={() => { setSelected(row.no); setError(''); }} /></td><td>{row.no}</td><td>{row.name}</td><td>{row.customer}</td>{source === 'OPPORTUNITY' ? <><td>{row.stage}</td><td>{row.owner}</td><td>{money(row.amount)}</td><td>{row.status}</td></> : <><td>{money(row.amount)}</td><td>{row.validUntil}</td><td>{row.status}</td></>}</tr>)}
        {(source === 'MANUAL' ? visibleCustomers.length : visibleSources.length) === 0 && <tr><td colSpan={source === 'MANUAL' ? 6 : 7} className="empty-cell">暂无符合条件的可选记录</td></tr>}
      </tbody></DeclarativeDataGrid></div>
      {error && <p className="enterprise-alert" role="alert">{error}</p>}
      <div className="sales-create-footer"><span>选择后点击确定，销售订单草稿将生成并打开编辑页面。</span><div><button type="button" onClick={() => onNavigate(orderBase)}>取消</button><button type="button" className="is-primary" disabled={!selected || !canWrite} onClick={create}>确定</button></div></div>
    </section>
  </DetailWorkspace>;
}
