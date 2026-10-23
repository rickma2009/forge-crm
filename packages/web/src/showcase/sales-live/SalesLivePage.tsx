import { useEffect, useState, type ReactNode } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeclarativeDataGrid } from '../../common/data-grid/DeclarativeDataGrid';
import { RecordQueryBar } from '../../common/RecordQueryBar';
import { ListViewSelector } from '../../common/ListViewSelector';
import { RowActionButton } from '../../common/RowActionButton';
import { FavoriteToggle } from '../Favorites';
import { salesApi, type Order, type Outbound, type Page } from './api';
import { OrderCreatePage, OrderDetailPage } from './SalesOrderPages';
import { OutboundCreatePage, OutboundDetailPage } from './SalesOutboundPages';
import { errorText, fulfillName, money, salesOrderBase, salesOutboundBase, salesStatus, sourceName } from './shared';
import '../sales-prototype/sales-prototype.css';
import './sales-live.css';


type Props = { path: string; systemCode: string; userId: string; allowedActions: string[]; onNavigate: (path: string) => void };
export function SalesLivePage(props: Props) {
  const { path } = props;
  if (path === `${salesOrderBase}/new`) return <OrderCreatePage {...props} />;
  if (path === `${salesOutboundBase}/new`) return <OutboundCreatePage {...props} />;
  const orderId = path.match(/^\/showcase\/sales-orders\/([\w-]+)(?:\/edit)?$/)?.[1];
  if (orderId) return <OrderDetailPage {...props} key={path} id={orderId} editing={path.endsWith('/edit')} />;
  const outboundId = path.match(/^\/showcase\/sales-outbounds\/([\w-]+)(?:\/edit)?$/)?.[1];
  if (outboundId) return <OutboundDetailPage {...props} key={path} id={outboundId} editing={path.endsWith('/edit')} />;
  if (path === salesOutboundBase) return <SalesList<Outbound> {...props} kind="销售出货" columns={['出库单号', '销售订单', '客户名称', '出库日期', '仓库', '出货人', '销售金额', '出库成本', '状态']} load={salesApi.outbounds} render={(row, index) => <tr key={row.id}><td>{index + 1}</td><td className="sales-actions"><RowActionButton label="修改" disabled={row.status !== 'DRAFT' || !props.allowedActions.includes('update')} onClick={() => props.onNavigate(`${salesOutboundBase}/${row.id}/edit`)} /></td><td><button className="sales-text-link" onClick={() => props.onNavigate(`${salesOutboundBase}/${row.id}`)}>{row.outboundNo}</button></td><td>{row.orderNo}</td><td>{row.customerName}</td><td>{row.documentDate}</td><td>{row.warehouseName}</td><td>{row.shipperName}</td><td>{money(row.salesAmount)}</td><td>{money(row.costAmount)}</td><td>{salesStatus(row.status)}</td></tr>} />;
  if (path === salesOrderBase) return <SalesList<Order> {...props} kind="销售订单" columns={['订单号', '客户名称', '订单日期', '来源', '来源单号', '销售金额', '折后总额', '审核状态', '出货进度']} load={salesApi.orders} render={(row, index) => <tr key={row.id}><td>{index + 1}</td><td className="sales-actions"><RowActionButton label="修改" disabled={row.status !== 'DRAFT' || !props.allowedActions.includes('update')} onClick={() => props.onNavigate(`${salesOrderBase}/${row.id}/edit`)} /><FavoriteToggle targetType="SALES_ORDER" targetId={row.id} label={row.orderNo} /></td><td><button className="sales-text-link" onClick={() => props.onNavigate(`${salesOrderBase}/${row.id}`)}>{row.orderNo}</button></td><td>{row.customerName}</td><td>{row.orderDate}</td><td>{sourceName(row.sourceType)}</td><td>{row.sourceNo || '—'}</td><td>{money(row.amount)}</td><td>{money(row.netAmount)}</td><td>{salesStatus(row.status)}</td><td>{fulfillName(row.fulfillmentStatus)}</td></tr>} />;
  return <div className="enterprise-page sales-placeholder"><h1>销售退回</h1><p>销售退回将在下一阶段开发。</p></div>;
}

function SalesList<T extends { id: string }>({ kind, columns, load, render, systemCode, allowedActions, onNavigate }: Props & { kind: '销售订单' | '销售出货'; columns: string[]; load: (code: string, query: URLSearchParams) => Promise<Page<T>>; render: (row: T, index: number) => ReactNode }) {
  const [input, setInput] = useState(''), [keyword, setKeyword] = useState(''), [status, setStatus] = useState(''), [appliedStatus, setAppliedStatus] = useState(''), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  const [view, setView] = useState('all'), [result, setResult] = useState<Page<T> | null>(null), [error, setError] = useState('');
  useEffect(() => { let active = true; const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), ...(keyword ? { keyword } : {}), ...(appliedStatus ? { status: appliedStatus } : {}) }); void load(systemCode, query).then((data) => { if (!active) return; if (page > Math.max(1, data.pagination.totalPages)) { setPage(Math.max(1, data.pagination.totalPages)); return; } setResult(data); setError(''); }).catch((reason) => { if (active) setError(errorText(reason)); }); return () => { active = false; }; }, [systemCode, load, keyword, appliedStatus, page, pageSize]);
  const start = (page - 1) * pageSize;
  const options = kind === '销售订单' ? ['DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED'] : ['DRAFT', 'SUBMITTED', 'APPROVED', 'REVERSED'];
  return <div className="enterprise-page sales-directory"><RecordQueryBar onQuery={() => { setKeyword(input.trim()); setAppliedStatus(status); setPage(1); }} onReset={() => { setInput(''); setKeyword(''); setStatus(''); setAppliedStatus(''); setView('all'); setPage(1); }}><label className="keyword-field">{kind}搜索<input value={input} placeholder="单号 / 客户 / 来源单号" onChange={(event) => setInput(event.target.value)} /></label><label>状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部</option>{options.map((option) => <option key={option} value={option}>{salesStatus(option)}</option>)}</select></label></RecordQueryBar>
    {error && <div className="enterprise-alert" role="alert">{error}</div>}
    <section className="enterprise-card table-card"><div className="table-toolbar customer-list-toolbar"><div>{allowedActions.includes('create') && <button type="button" className="is-primary" onClick={() => onNavigate(kind === '销售订单' ? `${salesOrderBase}/new` : `${salesOutboundBase}/new`)}><IconPlus size={16} />新增{kind}</button>}</div><div className="view-controls"><ListViewSelector value={view} options={[{ value: 'all', label: '系统 · 全部单据' }, { value: 'draft', label: '系统 · 草稿单据' }]} settingsDisabled onChange={(value) => { setView(value); setStatus(value === 'draft' ? 'DRAFT' : ''); setAppliedStatus(value === 'draft' ? 'DRAFT' : ''); setPage(1); }} onSettings={() => undefined} /><span className="record-count">共 <strong>{result?.pagination.total ?? 0}</strong> 条</span></div></div><div className="enterprise-table-wrap"><DeclarativeDataGrid aria-label={`${kind}列表`} pagination={{ page, pageSize, total: result?.pagination.total ?? 0, loading: !result, maxPageSize: 200, onPageChange: setPage, onPageSizeChange: (size) => { setPageSize(size); setPage(1); } }}><thead><tr><th>序号</th><th>操作</th>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{result?.items.map((row, index) => render(row, start + index)) ?? []}{result?.items.length === 0 && <tr><td colSpan={columns.length + 2}>暂无符合条件的记录</td></tr>}</tbody></DeclarativeDataGrid></div></section></div>;
}
