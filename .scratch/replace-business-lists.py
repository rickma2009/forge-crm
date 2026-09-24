from pathlib import Path
p=Path('packages/web/src/showcase/OpportunityPages.tsx');s=p.read_text().replace("import { ActionIcon } from './EnterprisePages';", "import { BusinessDirectory } from '../common/BusinessDirectory';")
a=s.index('export function ProductDirectoryPage');b=s.index('export function OpportunityDetailPage')
s=s[:a]+'''export function ProductDirectoryPage({ systemCode, canManage, gateway, allowedActions = [], onOpen }: { systemCode: string; canManage: boolean; gateway: EnterpriseGateway; allowedActions?: string[]; onOpen?: (item: Product) => void }) {
  const [editor, setEditor] = useState<'new' | null>(null), [refresh, setRefresh] = useState(0);
  const canCreate = allowedActions.includes('create') || (allowedActions.length === 0 && canManage);
  const canUpdate = allowedActions.includes('update') || (allowedActions.length === 0 && canManage);
  const open = (item: Product) => onOpen ? onOpen(item) : void (window.location.hash = `/showcase/products/${item.id}`);
  return <BusinessDirectory objectCode="product-directory" systemCode={systemCode} gateway={gateway} loadRows={gateway.products} rowKey={(item) => item.id} refreshToken={refresh}
    onAdd={canCreate ? () => setEditor('new') : undefined} rowActions={canUpdate ? (item) => <RowActionButton label="修改" aria-label={`修改产品 ${item.productCode}`} onClick={() => open(item)} /> : undefined}
    render={(item, key) => key === 'productCode' ? <a className="record-detail-link" href={`#/showcase/products/${item.id}`} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); open(item); } }}>{item.productCode}</a> : key === 'status' ? <Status value={item.status} /> : key === 'updatedAt' ? new Date(item.updatedAt).toLocaleString('zh-CN') : String(item[key as keyof Product] ?? '—')}>
    {editor && <ProductEditor systemCode={systemCode} gateway={gateway} value={editor} onClose={() => setEditor(null)} onSave={async (input) => { const saved = await gateway.createProduct(systemCode, input); setEditor(null); setRefresh((value) => value + 1); open(saved); }} />}
  </BusinessDirectory>;
}

export function CompetitorDirectoryPage({ systemCode, canManage, gateway }: { systemCode: string; canManage: boolean; gateway: EnterpriseGateway }) {
  const [editor, setEditor] = useState<Competitor | 'new' | null>(null), [detail, setDetail] = useState<Competitor | null>(null), [refresh, setRefresh] = useState(0);
  return <BusinessDirectory objectCode="competitor-directory" systemCode={systemCode} gateway={gateway} loadRows={gateway.competitors} rowKey={(item) => item.id} refreshToken={refresh}
    onAdd={canManage ? () => setEditor('new') : undefined} addLabel="新增竞争对象" keywordPlaceholder="竞争对手名称"
    rowActions={canManage ? (item) => <RowActionButton label="修改" onClick={() => setEditor(item)} /> : undefined}
    render={(item, key) => key === 'competitorName' ? <button type="button" className="customer-code-link" onClick={() => setDetail(item)}>{item.competitorName}</button> : key === 'status' ? <Status value={item.status} /> : key === 'updatedAt' ? new Date(item.updatedAt).toLocaleString('zh-CN') : String(item[key as keyof Competitor] ?? '—')}>
    {detail && <div className="enterprise-modal-backdrop"><section role="dialog" aria-modal="true" aria-label="竞争对手详情" className="enterprise-modal"><header><h2>{detail.competitorName}</h2><button type="button" aria-label="关闭" onClick={() => setDetail(null)}>×</button></header><dl className="modal-body detail-grid">{([['industryPosition', '行业地位'], ['location', '所在地'], ['mainProducts', '主要产品'], ['strengths', '优势'], ['weaknesses', '劣势'], ['remark', '备注']] as const).map(([key, label]) => <Field key={key} label={label} value={detail[key] || '—'} />)}</dl><footer><button type="button" onClick={() => setDetail(null)}>关闭</button></footer></section></div>}
    {editor && <CompetitorEditor value={editor} onClose={() => setEditor(null)} onSave={async (input) => { if (editor === 'new') await gateway.createCompetitor(systemCode, input); else await gateway.updateCompetitor(systemCode, editor.id, { ...input, version: editor.version }); setEditor(null); setRefresh((value) => value + 1); }} />}
  </BusinessDirectory>;
}

export function OpportunityDirectoryPage({ systemCode, allowedActions, gateway, onOpen }: { systemCode: string; allowedActions: string[]; gateway: EnterpriseGateway; onOpen: (item: Opportunity) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]), [templates, setTemplates] = useState<OpportunityTemplate[]>([]), [users, setUsers] = useState<Array<{ id: string; account: string; displayName: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]), [editor, setEditor] = useState(false), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const openEditor = async () => {
    setError('');
    try { const [c, t, u, p] = await Promise.all([gateway.customers(systemCode, new URLSearchParams({ page: '1', pageSize: '100' })), gateway.opportunityTemplates(systemCode), gateway.opportunityUsers(systemCode), gateway.products(systemCode, new URLSearchParams({ page: '1', pageSize: '100' }))]); setCustomers(c.items); setTemplates(t); setUsers(u); setProducts(p.items); setEditor(true); }
    catch (reason) { setError(errorText(reason)); }
  };
  return <BusinessDirectory objectCode="opportunity-directory" systemCode={systemCode} gateway={gateway} loadRows={gateway.opportunities} rowKey={(item) => item.id} refreshToken={refresh}
    keywordPlaceholder="商机编码 / 名称 / 客户" onAdd={allowedActions.includes('create') ? () => void openEditor() : undefined}
    render={(item, key) => key === 'opportunityCode' ? <a className="record-detail-link" href={`#/showcase/opportunities/${item.id}`} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onOpen(item); } }}>{item.opportunityCode}</a> : key === 'status' ? <Status value={item.status} /> : key === 'expectedAmount' ? money(item.expectedAmountExact ?? item.expectedAmount) : key === 'confidence' || key === 'stageProbability' ? `${item[key]}%` : key === 'updatedAt' ? new Date(item.updatedAt).toLocaleString('zh-CN') : String(item[key as keyof Opportunity] ?? '—')}>
    {error && <Alert text={error} />}
    {editor && <OpportunityEditor systemCode={systemCode} gateway={gateway} customers={customers} products={products} templates={templates} users={users} onClose={() => setEditor(false)} onSave={async (input) => { const saved = await gateway.createOpportunity(systemCode, input); setEditor(false); setRefresh((value) => value + 1); onOpen(saved); }} />}
  </BusinessDirectory>;
}

'''+s[b:]
# Remove obsolete wrapper, now all primary lists share BusinessDirectory.
a=s.find('function DirectoryPage(')
if a>=0:
 b=s.find('\nfunction ',a+1)
 if b<0: raise Exception('Locate DirectoryPage end')
 s=s[:a]+s[b:]
p.write_text(s)
p=Path('packages/web/src/showcase/QuotationPages.tsx');s=p.read_text().replace("import type { EnterpriseGateway } from './gateway';", "import { httpNavigationGateway, type EnterpriseGateway } from './gateway';\nimport { BusinessDirectory } from '../common/BusinessDirectory';")
a=s.index('export function QuotationListPage');b=s.index('export function QuotationDetailPage',a)
s=s[:a]+'''export function QuotationListPage({ systemCode, allowedActions, customerId, opportunityId, gateway = httpNavigationGateway }: { systemCode: string; allowedActions: string[]; customerId?: string; opportunityId?: string; gateway?: EnterpriseGateway }) {
  return <BusinessDirectory objectCode="quotation-directory" systemCode={systemCode} gateway={gateway} loadRows={quotationApi.list} rowKey={(item) => item.id}
    statusOptions={statusNames} keywordPlaceholder="报价单号 / 标题" fixedFilters={{ ...(customerId ? { customerId } : {}), ...(opportunityId ? { opportunityId } : {}) }}
    addLabel="新建报价" onAdd={allowedActions.includes('create') ? () => { const query = new URLSearchParams({ ...(customerId ? { customerId } : {}), ...(opportunityId ? { opportunityId } : {}) }); openQuote('new' + (query.size ? '?' + query : '')); } : undefined}
    render={(item, key) => key === 'quoteCode' ? <a className="record-detail-link" href={`#/showcase/quotations/${item.id}`}>{item.quoteCode}</a> : key === 'status' ? <span className="status-pill">{statusNames[item.status]}</span> : key === 'updatedAt' ? new Date(item.updatedAt).toLocaleString('zh-CN') : String(item[key as keyof QuotationRecord] ?? '—')} />;
}

'''+s[b:];p.write_text(s)
