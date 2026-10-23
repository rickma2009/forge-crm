import { showcaseHref } from './domain/routes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCopy, IconExternalLink } from '@tabler/icons-react';
import type { InteractionTemplate, StyleSceneSummary } from '@forge-crm/contracts';
import { DetailBackButton } from '../common/DetailWorkspace';
import { RecordQueryBar } from '../common/RecordQueryBar';
import { TreeWorkspace, type WorkspaceTreeNode } from '../common/TreeWorkspace';
import type { EnterpriseGateway } from './gateway';
import './interaction-index.css';

type Filters = { keyword: string; category: string; availability: string };
const emptyFilters: Filters = { keyword: '', category: '', availability: '' };
const availabilityLabels = { pending: '待提炼', preview: '可预览', interactive: '可交互', reusable: '可复用' } as const;
const feedbackLabels: Record<string, string> = { loading: '加载', processing: '处理中', success: '成功', failure: '失败', empty: '空数据', forbidden: '权限不足' };
const categoryId = (category: string) => `category:${category}`;
const isComponent = (item: StyleSceneSummary) => item.assetCode?.startsWith('CMP-') ?? false;
const availabilityLabel = (item: StyleSceneSummary) => isComponent(item) && item.template?.availability === 'reusable'
  ? '项目内可复用'
  : availabilityLabels[item.template?.availability ?? 'pending'];
const message = (reason: unknown) => reason instanceof Error ? reason.message : '模板库服务暂时不可用';

export function InteractionIndexPage({ systemCode, gateway, demoPages = new Map() }: {
  systemCode: string; gateway: EnterpriseGateway; demoPages?: ReadonlyMap<string, string>; onOpenDemo?: (path: string) => void;
}) {
  const [records, setRecords] = useState<StyleSceneSummary[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [form, setForm] = useState<Filters>(emptyFilters), [applied, setApplied] = useState<Filters>(emptyFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const detailPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    async function load() {
      const all: StyleSceneSummary[] = [];
      // Fetch every server page so the tree never omits templates beyond the first hundred.
      for (let page = 1, totalPages = 1; page <= totalPages; page++) {
        const result = await gateway.styleScenes(systemCode, new URLSearchParams({ catalog: 'library', page: String(page), pageSize: '100' }));
        if (!active) return;
        all.push(...result.items); totalPages = result.pagination.totalPages;
      }
      if (active) {
        const assets = all.filter((item) => item.assetCode?.startsWith('TPL-') || item.assetCode?.startsWith('CMP-'));
        setRecords(assets);
        if (window.location.hash === '#/showcase/style-scenes') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('interactionComponent') ?? params.get('interactionTemplate'), category = params.get('interactionCategory');
          setSelectedId((current) => current ?? assets.find((item) => item.assetCode === code)?.id ?? (category && assets.some((item) => item.category === category) ? categoryId(category) : null));
        }
      }
    }
    void load().catch((reason) => { if (active) { setError(message(reason)); setRecords([]); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, systemCode, revision]);
  const categories = useMemo(() => [...new Set(records.map((item) => item.category))], [records]);
  const nodes = useMemo<WorkspaceTreeNode[]>(() => categories.flatMap((category) => [
    { id: categoryId(category), parentId: null, label: category },
    ...records.filter((item) => item.category === category).map((item) => ({ id: item.id, parentId: categoryId(category), label: item.sceneName, searchText: `${item.assetCode} ${item.template?.tags.join(' ') ?? ''} ${item.template?.aliases?.join(' ') ?? ''}` })),
  ]), [categories, records]);
  const selected = records.find((item) => item.id === selectedId);
  const selectedCategory = selected?.category ?? categories.find((category) => categoryId(category) === selectedId) ?? '';
  const visible = records.filter((item) => (!selectedCategory || item.category === selectedCategory) && (!applied.category || item.category === applied.category)
    && (!applied.availability || (item.template?.availability ?? 'pending') === applied.availability)
    && (!applied.keyword || [item.assetCode, item.sceneName, item.description, ...(item.template?.tags ?? []), ...(item.template?.aliases ?? [])].join(' ').toLocaleLowerCase().includes(applied.keyword.toLocaleLowerCase())));
  const select = (id: string | null) => {
    setSelectedId(id); setNotice(''); detailPanel.current?.parentElement?.scrollTo?.({ top: 0 });
    if (window.location.hash === '#/showcase/style-scenes') {
      const url = new URL(window.location.href);
      url.searchParams.delete('interactionTemplate'); url.searchParams.delete('interactionComponent'); url.searchParams.delete('interactionCategory');
      const item = records.find((record) => record.id === id);
      if (item?.assetCode) url.searchParams.set(isComponent(item) ? 'interactionComponent' : 'interactionTemplate', item.assetCode);
      else if (id?.startsWith('category:')) url.searchParams.set('interactionCategory', id.slice('category:'.length));
      window.history.replaceState(null, '', url);
    }
  };
  const reset = () => { setForm(emptyFilters); setApplied(emptyFilters); select(null); };
  const query = () => { setApplied({ ...form, keyword: form.keyword.trim() }); select(form.category ? categoryId(form.category) : null); };
  useEffect(() => { if (!loading && !error && selectedId && !nodes.some((node) => node.id === selectedId)) setSelectedId(null); }, [loading, error, nodes, selectedId]);
  return <main className="enterprise-page interaction-catalog-page">
    <h1 className="sr-only">交互模板库</h1>
    <RecordQueryBar onQuery={query} onReset={reset}>
      <label>关键词<input aria-label="关键词" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="模板或组件编码 / 名称 / 用途" /></label>
      <label>资产分类<select aria-label="资产分类" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">全部</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label>可用程度<select aria-label="可用程度" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}><option value="">全部</option>{Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </RecordQueryBar>
    <TreeWorkspace title="模板目录" nodes={nodes} selectedId={selectedId} onSelect={select} loading={loading} onRefresh={() => setRevision((value) => value + 1)} tools={<button type="button" onClick={reset}>全部模板</button>}>
      <section className="template-library-content" ref={detailPanel}>
        {loading ? <p className="template-library-empty" role="status">加载模板库…</p> : error ? <div className="enterprise-alert" role="alert">{error}<button type="button" onClick={() => setRevision((value) => value + 1)}>重试模板库</button></div> : selected ? <TemplateDetail item={selected} records={records} onOpen={select} demoPages={demoPages} notice={notice} onBack={() => select(categoryId(selected.category))} onCopy={async () => {
          try { await navigator.clipboard.writeText(selected.template?.referencePrompt ?? `请参考“${selected.sceneName}”模板（${selected.assetCode}）设计本页面。`); setNotice('参考指令已复制'); }
          catch { setNotice('未能自动复制，请选中下方参考指令复制。'); }
        }} onCopySnippet={async () => {
          try { await navigator.clipboard.writeText(selected.template?.usageSnippet ?? ''); setNotice('接入示例已复制'); }
          catch { setNotice('未能自动复制，请选中下方示例复制。'); }
        }} /> : <>
          <header className="template-library-heading"><div><p className="template-library-breadcrumb">交互模板库{selectedCategory ? ` / ${selectedCategory}` : ''}</p><h2>{selectedCategory || '全部资产'}</h2><p>点击{selectedCategory === '插件组件' ? '组件' : '模板'}查看效果、使用边界和接入方式。共 {visible.length} 个{selectedCategory === '插件组件' ? '组件' : '资产'}</p></div><span className="template-library-badge">{categories.length} 类 · {records.length} 个资产</span></header>
          <div className="template-library-cards">{visible.map((item) => <button type="button" className="template-library-card" key={item.id} aria-label={`查看${isComponent(item) ? '组件' : '模板'}：${item.sceneName}`} onClick={() => select(item.id)}><TemplatePreview template={item.template} name={item.sceneName} /><div className="template-library-card-info"><span>{item.assetCode}</span><h3>{item.sceneName}</h3><p>{item.description}</p><span className="template-library-badge">{availabilityLabel(item)}</span></div></button>)}</div>
          {!visible.length && <p className="template-library-empty">{records.length ? '没有匹配的资产，请调整查询条件。' : '尚未登记模板或组件。'}</p>}
        </>}
      </section>
    </TreeWorkspace>
  </main>;
}

function TemplatePreview({ template, name, showSource = false }: { template: InteractionTemplate | null | undefined; name: string; showSource?: boolean }) {
  return <div className="template-library-preview">{template?.thumbnail ? <><img src={template.thumbnail} alt={`${name}布局${template.previewKind === 'diagram' ? '示意' : '效果'}图`} loading="lazy" /><span>{template.previewKind === 'diagram' ? '布局示意 · 非实际页面截图' : '页面效果图'}</span>{showSource && template.previewSource && <p className="template-library-preview-source">来源：{template.previewSource.name} · 截图更新：{template.previewSource.capturedAt}<br />{template.previewSource.scope}<br /><a href={showcaseHref(template.previewSource.path)} target="_blank" rel="noopener noreferrer">打开实际页面<IconExternalLink size={14} /></a></p>}</> : <p>效果资产待建设</p>}</div>;
}
function TextList({ values }: { values: string[] | undefined }) { return values?.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="template-library-muted">待提炼，尚无完整开发资产。</p>; }
function TemplateDetail({ item, records, onOpen, demoPages, onBack, onCopy, onCopySnippet, notice }: { item: StyleSceneSummary; records: StyleSceneSummary[]; onOpen: (id: string) => void; demoPages: ReadonlyMap<string, string>; onBack: () => void; onCopy: () => void; onCopySnippet: () => void; notice: string }) {
  const template = item.template;
  const component = isComponent(item);
  return <article className="template-library-detail">
    <header className="template-library-detail-heading"><div className="template-library-return"><DetailBackButton label={`返回${item.category}`} onBack={onBack} /><span>返回{item.category}</span></div><p className="template-library-breadcrumb">{item.category} / {item.sceneName}</p><div className="template-library-heading"><div><h2>{item.sceneName}</h2><p>{item.description}</p></div><span className="template-library-badge">{availabilityLabel(item)}</span></div><div className="template-library-tags"><span>{item.assetCode}</span>{template?.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="template-library-actions">{template?.demoPath ? <a className="template-library-demo" href={template.demoPath} target="_blank" rel="noopener noreferrer"><IconExternalLink size={16} />打开示例交互</a> : !component && <span className="template-library-muted">独立演示待建设</span>}<button type="button" onClick={onCopy}><IconCopy size={16} />复制参考指令</button></div>{notice && <p role="status">{notice}</p>}</header>
    <section><h3>效果预览</h3><TemplatePreview template={template} name={item.sceneName} showSource />{template?.demoPath && <p className="template-library-muted">示例仅使用内存数据；正式可复用骨架及接入说明仍待提炼。</p>}</section>
    <section><h3>适用场景</h3><TextList values={template?.suitableFor} /></section>
    {(!component || Boolean(template?.regions.length || template?.steps.length)) && <section className="template-library-columns">{(!component || Boolean(template?.regions.length)) && <div><h3>页面结构</h3><TextList values={template?.regions} /></div>}<div><h3>{component ? '使用步骤' : '主要交互'}</h3><TextList values={template?.steps} /></div></section>}
    <section className="template-library-columns"><div><h3>{component ? '接入配置与边界' : '配置内容'}</h3><TextList values={template?.config} /></div>{(!component || Boolean(template?.components.length)) && <div><h3>{component ? '依赖组件' : '公共组件参考'}</h3><TextList values={template?.components} />{!component && <p className="template-library-muted">组件引用不代表模板骨架已提炼完成。</p>}</div>}</section>
    {component && <><section><h3>源码入口</h3><ul className="template-library-sources">{template?.sourcePaths?.map((path) => <li key={path}><code>{path}</code></li>)}</ul></section>{template?.usageSnippet && <section><div className="template-library-section-heading"><h3>接入示例</h3><button type="button" onClick={onCopySnippet}><IconCopy size={16} />复制示例</button></div><pre className="template-library-code"><code>{template.usageSnippet}</code></pre></section>}</>}
    {template?.behaviorRules && <>
      <section className="template-library-columns"><div><h3>查看与编辑</h3><TextList values={template.behaviorRules.viewEdit} /></div><div><h3>保存与离开保护</h3><TextList values={template.behaviorRules.saving} /></div></section>
      <section><h3>过程反馈</h3><dl className="template-library-feedback">{Object.entries(template.behaviorRules.feedback).map(([state, rule]) => <div key={state}><dt>{feedbackLabels[state]}</dt><dd>{rule}</dd></div>)}</dl></section>
    </>}
    {template?.relatedTemplates.length ? <section><h3>关联模板</h3><div className="template-library-related">{template.relatedTemplates.map((code) => { const related = records.find((record) => record.assetCode === code); return related ? <button key={code} type="button" onClick={() => onOpen(related.id)}>{related.sceneName}（{code}）</button> : <span key={code}>{code}</span>; })}</div></section> : null}
    <section><h3>参考指令</h3><p className="template-library-prompt">{template?.referencePrompt ?? `请参考“${item.sceneName}”模板（${item.assetCode}）设计本页面。`}</p></section>
    <section><h3>应用案例</h3>{template?.applications.length ? <ul>{template.applications.map((app) => <li key={app.path}><a href={showcaseHref(app.path)} target="_blank" rel="noopener noreferrer">{demoPages.get(app.path) ?? app.name}<IconExternalLink size={14} /></a>{app.pageType && <span className="template-library-muted"> · {app.pageType}</span>}</li>)}</ul> : <p className="template-library-muted">尚未登记应用案例。</p>}<p className="template-library-muted">实际业务页面需登录及相应权限。</p></section>
    <section><h3>建设与维护</h3><p>{component ? '组件登记版本' : '模板版本'}：{template?.version ?? '待登记'} · 可用程度：{availabilityLabel(item)}</p><p className="template-library-muted">{component ? `可在本项目内按源码与接口复用；跨项目采用仍需独立项目的接入、回归与边界证据。当前资产成熟度：${item.maturity}。` : '效果图、独立演示、组件骨架和接入说明齐备并验证后，才标为“可复用”。'}</p></section>
  </article>;
}
