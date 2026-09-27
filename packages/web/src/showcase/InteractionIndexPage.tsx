import { useEffect, useMemo, useRef, useState } from 'react';
import type { InteractionMaturity, StyleSceneDetail, StyleSceneList, StyleSceneSummary, StyleSceneTaxonomy } from '@forge-crm/contracts';
import { DetailHeader, DetailSection, DetailWorkspace } from '../common/DetailWorkspace';
import { RecordQueryBar } from '../common/RecordQueryBar';
import { TreeWorkspace, type WorkspaceTreeNode } from '../common/TreeWorkspace';
import type { EnterpriseGateway } from './gateway';
import './interaction-index.css';

const maturities: InteractionMaturity[] = ['idea', 'candidate', 'implementation-verified', 'interaction-verified', 'project-adopted', 'business-validated', 'released', 'deprecated'];
const pageSize = 20;
type Filters = { keyword: string; category: string; subCategory: string; maturity: string };
const emptyFilters: Filters = { keyword: '', category: '', subCategory: '', maturity: '' };

const message = (reason: unknown) => reason instanceof Error ? reason.message : '服务暂时不可用';
const typeId = (category: string) => `type:${encodeURIComponent(category)}`;
const groupId = (category: string, subCategory: string) => `group:${encodeURIComponent(category)}:${encodeURIComponent(subCategory)}`;

export function InteractionIndexPage({ systemCode, gateway }: { systemCode: string; gateway: EnterpriseGateway }) {
  const [taxonomy, setTaxonomy] = useState<StyleSceneTaxonomy>({ types: [] });
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState('');
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const [form, setForm] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [result, setResult] = useState<StyleSceneList>({ items: [], pagination: { page: 1, pageSize, total: 0, totalPages: 0 } });
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [listVersion, setListVersion] = useState(0);
  const listRequest = useRef(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StyleSceneDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailVersion, setDetailVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setTaxonomyLoading(true); setTaxonomyError('');
    gateway.styleSceneTaxonomy(systemCode).then((value) => { if (active) setTaxonomy(value); }).catch((reason) => { if (active) { setTaxonomy({ types: [] }); setTaxonomyError(message(reason)); } }).finally(() => { if (active) setTaxonomyLoading(false); });
    return () => { active = false; };
  }, [gateway, systemCode, taxonomyVersion]);

  useEffect(() => {
    const request = ++listRequest.current;
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (applied.keyword) query.set('keyword', applied.keyword);
    if (applied.category) query.set('category', applied.category);
    if (applied.subCategory) query.set('subCategory', applied.subCategory);
    if (applied.maturity) query.set('maturity', applied.maturity);
    setListLoading(true); setListError('');
    gateway.styleScenes(systemCode, query).then((value) => { if (request === listRequest.current) setResult(value); }).catch((reason) => {
      if (request === listRequest.current) { setResult({ items: [], pagination: { page, pageSize, total: 0, totalPages: 0 } }); setListError(message(reason)); }
    }).finally(() => { if (request === listRequest.current) setListLoading(false); });
  }, [applied, gateway, listVersion, page, systemCode]);

  useEffect(() => {
    if (!detailId) return;
    let active = true;
    setDetail(null); setDetailLoading(true); setDetailError('');
    gateway.styleSceneDetail(systemCode, detailId).then((value) => { if (active) setDetail(value); }).catch((reason) => { if (active) setDetailError(message(reason)); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [detailId, detailVersion, gateway, systemCode]);

  const { nodes, nodeFilters } = useMemo(() => {
    const values: WorkspaceTreeNode[] = [];
    const filters = new Map<string, Pick<Filters, 'category' | 'subCategory'>>();
    for (const type of taxonomy.types) {
      const parent = typeId(type.category);
      values.push({ id: parent, parentId: null, label: `${type.category}（${type.count}）`, searchText: type.category });
      filters.set(parent, { category: type.category, subCategory: '' });
      for (const group of type.groups) {
        const id = groupId(type.category, group.subCategory);
        values.push({ id, parentId: parent, label: `${group.subCategory}（${group.count}）`, searchText: `${type.category} ${group.subCategory}` });
        filters.set(id, { category: type.category, subCategory: group.subCategory });
      }
    }
    return { nodes: values, nodeFilters: filters };
  }, [taxonomy]);
  const groups = useMemo(() => {
    const types = form.category ? taxonomy.types.filter((type) => type.category === form.category) : taxonomy.types;
    return [...new Set(types.flatMap((type) => type.groups.map((group) => group.subCategory)))];
  }, [form.category, taxonomy]);
  const selectNode = (id: string) => {
    const selected = nodeFilters.get(id);
    if (!selected) return;
    const next = { ...form, ...selected };
    setSelectedNode(id); setForm(next); setApplied(next); setPage(1);
  };
  const reset = () => { setForm(emptyFilters); setApplied(emptyFilters); setSelectedNode(null); setPage(1); };

  if (detailId) return <InteractionDetail detail={detail} loading={detailLoading} error={detailError} onRetry={() => setDetailVersion((value) => value + 1)} onBack={() => { setDetailId(null); setDetail(null); setDetailError(''); }} />;

  return <main className="enterprise-page interaction-catalog-page">
    <h1 className="sr-only">交互案例索引</h1>
    <RecordQueryBar onQuery={() => { setApplied({ ...form, keyword: form.keyword.trim() }); setPage(1); }} onReset={reset}>
      <label>关键词<input aria-label="关键词" value={form.keyword} onChange={(event) => setForm({ ...form, keyword: event.target.value })} placeholder="案例编码 / 名称 / 定义" /></label>
      <label>类型<select aria-label="类型" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value, subCategory: '' })}><option value="">全部</option>{taxonomy.types.map((type) => <option key={type.category} value={type.category}>{type.category}</option>)}</select></label>
      <label>分组<select aria-label="分组" value={form.subCategory} onChange={(event) => setForm({ ...form, subCategory: event.target.value })}><option value="">全部</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
      <label>成熟度<select aria-label="成熟度" value={form.maturity} onChange={(event) => setForm({ ...form, maturity: event.target.value })}><option value="">全部</option>{maturities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </RecordQueryBar>
    {taxonomyError && <div className="enterprise-alert interaction-taxonomy-error" role="alert">{taxonomyError}<button type="button" onClick={() => setTaxonomyVersion((value) => value + 1)}>重试分类</button></div>}
    <TreeWorkspace title="交互案例分类" nodes={nodes} selectedId={selectedNode} onSelect={selectNode} onRefresh={() => setTaxonomyVersion((value) => value + 1)} loading={taxonomyLoading} total={taxonomy.types.reduce((sum, type) => sum + type.count, 0)} tools={<button type="button" onClick={reset}>全部分类</button>}>
      <section className="enterprise-card interaction-catalog-grid">
        <div className="table-toolbar"><strong>交互案例</strong><span>共 {result.pagination.total} 条</span></div>
        {listError && <div className="enterprise-alert" role="alert">{listError}<button type="button" onClick={() => setListVersion((value) => value + 1)}>重试列表</button></div>}
        <div className="enterprise-table-wrap"><table><thead><tr><th>序号</th><th>案例编码</th><th>案例名称</th><th>类型</th><th>分组</th><th>成熟度</th><th>当前状态</th></tr></thead><tbody>
          {!listLoading && result.items.map((item, index) => <CatalogRow key={item.id} item={item} index={(page - 1) * pageSize + index + 1} onOpen={() => setDetailId(item.id)} />)}
          {listLoading && <tr><td className="empty-cell" colSpan={7} role="status">加载中…</td></tr>}
          {!listLoading && !listError && result.items.length === 0 && <tr><td className="empty-cell" colSpan={7}>没有匹配的交互案例，请调整筛选条件。</td></tr>}
        </tbody></table></div>
        <footer className="interaction-catalog-pagination"><span>第 {result.pagination.totalPages ? page : 0} / {result.pagination.totalPages} 页</span><button type="button" disabled={page <= 1 || listLoading} onClick={() => setPage((value) => value - 1)}>上一页</button><button type="button" disabled={page >= result.pagination.totalPages || listLoading} onClick={() => setPage((value) => value + 1)}>下一页</button></footer>
      </section>
    </TreeWorkspace>
  </main>;
}

function CatalogRow({ item, index, onOpen }: { item: StyleSceneSummary; index: number; onOpen: () => void }) {
  return <tr><td className="is-index">{index}</td><td>{item.assetCode ? <button className="interaction-catalog-link" type="button" onClick={onOpen}>{item.assetCode}</button> : '—'}</td><td>{item.assetCode ? item.sceneName : <button className="interaction-catalog-link" type="button" onClick={onOpen}>{item.sceneName}</button>}</td><td>{item.category}</td><td>{item.subCategory ?? '—'}</td><td><span className={`interaction-index-maturity maturity-${item.maturity ?? 'unknown'}`}>{item.maturity ?? '—'}</span></td><td>{item.status}</td></tr>;
}

function InteractionDetail({ detail, loading, error, onRetry, onBack }: { detail: StyleSceneDetail | null; loading: boolean; error: string; onRetry: () => void; onBack: () => void }) {
  if (!detail) return <DetailWorkspace className="interaction-catalog-detail"><DetailHeader title="交互案例详情" fields={[]} onBack={onBack} backLabel="返回交互案例目录" />{loading && <div className="interaction-detail-state" role="status">加载中…</div>}{error && <div className="enterprise-alert interaction-detail-state" role="alert">{error}<button type="button" onClick={onRetry}>重试详情</button></div>}</DetailWorkspace>;
  return <DetailWorkspace className="interaction-catalog-detail">
    <DetailHeader title={detail.sceneName} status={<span className={`interaction-index-maturity maturity-${detail.maturity ?? 'unknown'}`}>{detail.maturity ?? '—'}</span>} fields={[{ label: '案例编码', value: detail.assetCode ?? '—' }, { label: '类型', value: detail.category }, { label: '分组', value: detail.subCategory ?? '—' }]} onBack={onBack} backLabel="返回交互案例目录" />
    <DetailSection title="案例定义"><ReferenceList values={detail.definition} /></DetailSection>
    <DetailSection title="来源与产物"><dl className="interaction-detail-grid"><div><dt>定义来源</dt><dd>{detail.definitionRef ? <><code>{detail.definitionRef.path}</code><span>章节：{detail.definitionRef.section}</span></> : '暂无'}</dd></div><div><dt>产物</dt><dd><ReferenceList values={detail.artifacts} /></dd></div></dl></DetailSection>
    <DetailSection title="验证证据"><dl className="interaction-detail-grid"><div><dt>证据</dt><dd><ReferenceList values={detail.evidence} /></dd></div><div><dt>下一步证据</dt><dd>{detail.nextEvidence || '暂无'}</dd></div></dl>{detail.evidenceCards.length ? <div className="interaction-evidence-cards">{detail.evidenceCards.map((card) => <article key={card.evidenceId}><strong>{card.evidenceId}</strong><span>{card.state}</span><p>{card.validation.result}</p><small>{card.validation.unknowns.length ? `未知：${card.validation.unknowns.join('、')}` : '无未决项'}</small></article>)}</div> : <p className="interaction-none">暂无证据卡</p>}</DetailSection>
    <DetailSection title="交互演示"><InteractionAssetDemo category={detail.category} name={detail.sceneName} /></DetailSection>
  </DetailWorkspace>;
}

function ReferenceList({ values }: { values: string[] }) {
  return values.length ? <ul className="interaction-reference-list">{values.map((value) => <li key={value}><code>{value}</code></li>)}</ul> : <span>暂无</span>;
}

function InteractionAssetDemo({ category, name }: { category: string; name: string }) {
  const labels = category === 'STATE' ? ['初始', '成功', '失败'] : category === 'SPECIAL' ? ['预览影响', '确认操作'] : category === 'VIEW' ? ['表格', '详情', '卡片'] : ['入口', '处理中', '完成'];
  const [active, setActive] = useState(0);
  return <div className="interaction-index-demo"><div className="interaction-index-demo-heading"><div><p>可运行演示</p><h3>{name}</h3></div><span>{labels[active]}</span></div><div className="interaction-index-demo-stage"><strong>{active === 0 ? '准备开始' : active === 1 ? '交互已执行' : '当前状态已更新'}</strong><p>这是纯本地确定性演示，不读取业务数据或调用服务端写接口。</p></div><div className="interaction-index-demo-actions">{labels.map((label, index) => <button type="button" key={label} className={index === active ? 'is-active' : undefined} onClick={() => setActive(index)}>{label}</button>)}<button type="button" onClick={() => setActive(0)}>重置演示</button></div></div>;
}
