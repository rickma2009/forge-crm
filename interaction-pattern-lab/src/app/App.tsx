import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { getDemo } from '../catalog/demoRegistry';
import { getPattern, getValidationSlice, listPatterns, resolvePatternId } from '../catalog/patterns';
import type { DemoAvailability, MaturityStatus, PatternDefinition } from '../catalog/types';
import { DemoBoundary } from './DemoBoundary';

type WorkspaceTab = 'demo' | 'summary';

const kindLabels = {
  PAGE: '页面模式', ACT: '操作模式', VIEW: '展示模式', STATE: '状态反馈', SPECIAL: '特殊操作', SCENE: '组合场景',
} as const;

const maturityDescriptions: Record<MaturityStatus, string> = {
  idea: '只有分类问题描述，尚未形成可评审资产。',
  candidate: '已有来源、边界和验收草案，尚未完成实现验证。',
  'implementation-verified': '已在明确环境实现并通过工程检查，尚缺完整交互或跨项目证据。',
  'interaction-verified': '关键交互已在真实浏览器或等价界面验证。',
  'project-adopted': '已被至少一个独立真实项目显式采用。',
  'business-validated': '目标角色已完成业务验收或指标验证。',
  released: '已绑定 Release Gate 和可定位发布点。',
  deprecated: '不再推荐采用，保留迁移与反例信息。',
};

function initialPatternId(): string {
  return resolvePatternId(new URLSearchParams(window.location.search).get('pattern'));
}

export function App() {
  const initialId = initialPatternId();
  const initialPattern = getPattern(initialId) ?? listPatterns()[0];
  const [query, setQuery] = useState('');
  const [maturity, setMaturity] = useState<MaturityStatus | 'all'>('all');
  const [demoAvailability, setDemoAvailability] = useState<DemoAvailability>('all');
  const [activePatternId, setActivePatternId] = useState(initialId);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('summary');
  const [activeDemoId, setActiveDemoId] = useState(initialPattern.demos[0]?.demoId ?? '');
  const [resetVersion, setResetVersion] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [openKinds, setOpenKinds] = useState<Set<string>>(() => new Set([initialPattern.kind]));
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([initialPattern.category]));
  const [isNarrow, setIsNarrow] = useState(false);
  const catalogTriggerRef = useRef<HTMLButtonElement>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);

  const visiblePatterns = useMemo(() => listPatterns({ query, maturity, demoAvailability }), [query, maturity, demoAvailability]);
  const groupedPatterns = useMemo(() => {
    const kinds = new Map<string, Map<string, PatternDefinition[]>>();
    for (const pattern of visiblePatterns) {
      const groups = kinds.get(pattern.kind) ?? new Map<string, PatternDefinition[]>();
      groups.set(pattern.category, [...(groups.get(pattern.category) ?? []), pattern]);
      kinds.set(pattern.kind, groups);
    }
    return kinds;
  }, [visiblePatterns]);

  const activePattern = getPattern(activePatternId) ?? listPatterns()[0];
  const activeDemoRef = activePattern.demos.find((demo) => demo.demoId === activeDemoId) ?? activePattern.demos[0] ?? null;
  const Demo = getDemo(activeDemoRef?.demoId);
  const filtersActive = Boolean(query.trim() || maturity !== 'all' || demoAvailability !== 'all');

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('pattern', activePatternId);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [activePatternId]);

  useEffect(() => {
    setOpenKinds((current) => current.has(activePattern.kind) ? current : new Set([...current, activePattern.kind]));
    setOpenGroups((current) => current.has(activePattern.category) ? current : new Set([...current, activePattern.category]));
  }, [activePattern.kind, activePattern.category]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!catalogOpen) return undefined;
    catalogSearchRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCatalogOpen(false);
        catalogTriggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [catalogOpen]);

  const selectPattern = (patternId: string) => {
    const pattern = getPattern(patternId);
    if (!pattern) return;
    setActivePatternId(patternId);
    setActiveDemoId(pattern.demos[0]?.demoId ?? '');
    setActiveTab('summary');
    setResetVersion((value) => value + 1);
    setStatusMessage('');
    setCatalogOpen(false);
    window.setTimeout(() => catalogTriggerRef.current?.focus(), 0);
  };

  const clearFilters = () => {
    setQuery('');
    setMaturity('all');
    setDemoAvailability('all');
  };

  const resetDemo = () => {
    setResetVersion((value) => value + 1);
    setStatusMessage('已恢复预置状态');
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => setter((current) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  });

  return (
    <div className={`ipl-app${catalogOpen ? ' is-catalog-open' : ''}${railCollapsed ? ' is-rail-collapsed' : ''}`}>
      <header className="ipl-product-bar">
        <button ref={catalogTriggerRef} className="ipl-mobile-catalog-trigger" type="button" aria-expanded={catalogOpen} aria-controls="pattern-catalog" onClick={() => setCatalogOpen((value) => !value)}>
          <span aria-hidden="true">☰</span>{catalogOpen ? '关闭导航' : '打开导航'}
        </button>
        <div className="ipl-mobile-brand"><strong>企业交互模式验证场</strong><span>分类资产</span></div>
        <div className="ipl-product-context">
          <span>分类资产 / <b>{kindLabels[activePattern.kind]}</b> / <b>{activePattern.category}</b></span>
          <span className="ipl-context-divider" aria-hidden="true" />
          <span><b>103</b> 个分类项</span>
          <span className="ipl-context-divider" aria-hidden="true" />
          <span>静态 Demo · 无业务写入</span>
        </div>
      </header>

      <aside id="pattern-catalog" className="ipl-catalog" aria-label="交互模式平台导航" data-collapsed={railCollapsed} aria-hidden={isNarrow && !catalogOpen ? true : undefined} inert={isNarrow && !catalogOpen ? true : undefined}>
        <div className="ipl-rail-brand">
          <span className="ipl-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div><strong>企业交互验证场</strong><span>分类 · 证据 · 演示</span></div>
          <button type="button" aria-label={railCollapsed ? '展开平台导航' : '折叠平台导航'} onClick={() => setRailCollapsed((value) => !value)}>{railCollapsed ? '›' : '‹'}</button>
        </div>

        <div className="ipl-catalog-controls">
          <label className="ipl-catalog-search">
            <span aria-hidden="true">⌕</span>
            <input ref={catalogSearchRef} type="search" aria-label="搜索分类项" placeholder="名称、编号、分组或定义" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label><span>成熟度</span><select aria-label="成熟度筛选" value={maturity} onChange={(event) => setMaturity(event.target.value as MaturityStatus | 'all')}>
            <option value="all">全部</option><option value="idea">idea</option><option value="candidate">candidate</option><option value="implementation-verified">implementation-verified</option><option value="interaction-verified">interaction-verified</option>
          </select></label>
          <label><span>Demo</span><select aria-label="Demo 可用性筛选" value={demoAvailability} onChange={(event) => setDemoAvailability(event.target.value as DemoAvailability)}>
            <option value="all">全部</option><option value="available">有 Demo</option><option value="none">无 Demo</option>
          </select></label>
        </div>

        <nav className="ipl-pattern-list" aria-label="分类项目录">
          {[...groupedPatterns.entries()].map(([kind, groups]) => {
            const kindOpen = filtersActive || openKinds.has(kind);
            return <section className="ipl-pattern-group" key={kind}>
              <button type="button" className="ipl-category-item" aria-expanded={kindOpen} onClick={() => toggle(setOpenKinds, kind)}>
                <span className="ipl-category-marker" aria-hidden="true">{kind[0]}</span><strong>{kindLabels[kind as keyof typeof kindLabels]}</strong><span className="ipl-category-count">{[...groups.values()].flat().length}</span><span aria-hidden="true">›</span>
              </button>
              {kindOpen && [...groups.entries()].map(([group, patterns]) => {
                const groupOpen = filtersActive || openGroups.has(group);
                return <div className="ipl-subgroup" key={`${kind}-${group}`}>
                  <button type="button" className="ipl-subgroup-button" aria-expanded={groupOpen} onClick={() => toggle(setOpenGroups, group)}><span>{group}</span><small>{patterns.length}</small></button>
                  {groupOpen && <div className="ipl-pattern-children">{patterns.map((pattern) => <PatternCatalogItem key={pattern.id} pattern={pattern} active={pattern.id === activePatternId} onSelect={() => selectPattern(pattern.id)} />)}</div>}
                </div>;
              })}
            </section>;
          })}
          {visiblePatterns.length === 0 && <div className="ipl-empty-catalog"><span>0 RESULTS</span><strong>没有匹配的分类项</strong><p>当前搜索和筛选条件已保留。</p><button type="button" onClick={clearFilters}>清空全部条件</button></div>}
        </nav>
        <footer className="ipl-catalog-footer"><span className="ipl-status-dot" />成熟度与覆盖关系独立展示</footer>
      </aside>

      <main className="ipl-main" inert={isNarrow && catalogOpen ? true : undefined}>
        <section className="ipl-pattern-header" aria-labelledby="active-pattern-title">
          <div><div className="ipl-pattern-kicker"><code>{activePattern.id}</code><span>{kindLabels[activePattern.kind]} · {activePattern.category}</span></div><h1 id="active-pattern-title">{activePattern.name}</h1><p>{activePattern.summary.problem}</p></div>
          <div className="ipl-pattern-actions"><span className={`ipl-validation-badge is-${activePattern.maturity}`}><i />{activePattern.maturity}</span>{activePattern.demos.length > 0 && <button type="button" onClick={resetDemo} aria-label="重置当前 Demo">重置 Demo</button>}</div>
        </section>

        {activePattern.demos.length > 1 && <label className="ipl-demo-selector"><span>验证案例</span><select aria-label="选择验证案例" value={activeDemoRef?.demoId ?? ''} onChange={(event) => { setActiveDemoId(event.target.value); setResetVersion((value) => value + 1); }}>
          {activePattern.demos.map((demo) => <option key={demo.validationId} value={demo.demoId}>{demo.validationId} · {demo.label}</option>)}
        </select></label>}

        <div className="ipl-workspace-tabs" role="tablist" aria-label="分类项内容">
          <button type="button" role="tab" aria-selected={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>分类说明</button>
          <button type="button" role="tab" aria-selected={activeTab === 'demo'} disabled={activePattern.demos.length === 0} onClick={() => setActiveTab('demo')}>交互演示</button>
          <span className="ipl-live-status" role="status" aria-live="polite">{statusMessage}</span>
        </div>

        <section className="ipl-workspace" aria-label={activeTab === 'demo' ? '交互演示' : '分类说明'}>
          {activeTab === 'summary' ? <PatternSummaryView pattern={activePattern} /> : <DemoView pattern={activePattern} Demo={Demo} demoId={activeDemoRef?.demoId} resetVersion={resetVersion} onRetry={resetDemo} />}
        </section>
      </main>
      {catalogOpen && <button type="button" className="ipl-catalog-scrim" aria-label="关闭分类目录遮罩" onClick={() => { setCatalogOpen(false); catalogTriggerRef.current?.focus(); }} />}
    </div>
  );
}

function PatternCatalogItem({ pattern, active, onSelect }: { pattern: PatternDefinition; active: boolean; onSelect: () => void }) {
  return <button type="button" className={`ipl-pattern-item${active ? ' is-active' : ''}`} aria-label={`${pattern.name}，${pattern.id}`} aria-current={active ? 'page' : undefined} onClick={onSelect} title={`${pattern.name} · ${pattern.id}`}>
    <span className="ipl-pattern-bullet" aria-hidden="true" /><span className="ipl-pattern-item-copy"><strong>{pattern.name}</strong><code>{pattern.id}</code></span><span className={`ipl-status-dot is-${pattern.maturity}`} aria-label={pattern.maturity} />
  </button>;
}

function DemoView({ pattern, Demo, demoId, resetVersion, onRetry }: { pattern: PatternDefinition; Demo: ReturnType<typeof getDemo>; demoId?: string; resetVersion: number; onRetry: () => void }) {
  if (!demoId) return <div className="ipl-state-panel"><span className="ipl-state-code">NO_DEMO</span><h3>尚无交互演示</h3><p>{pattern.nextEvidence}</p></div>;
  if (!Demo) return <div className="ipl-state-panel" role="status"><span className="ipl-state-code">ADAPTER_PENDING</span><h3>验证案例尚未接入</h3><p>覆盖关系已登记，但 Demo Adapter 尚未完成实现。</p></div>;
  return <div className="ipl-prototype-frame"><div className="ipl-frame-bar"><span><i /><i /><i /></span><code>demo://{demoId}</code><em>仅当前会话</em></div><div className="ipl-demo-stage">
    <DemoBoundary key={`boundary-${pattern.id}-${demoId}-${resetVersion}`} onRetry={onRetry}><Suspense fallback={<div className="ipl-state-panel" role="status"><span className="ipl-state-code">LOADING_ADAPTER</span><h3>正在加载交互案例</h3></div>}><Demo key={`${pattern.id}-${demoId}-${resetVersion}`} /></Suspense></DemoBoundary>
  </div></div>;
}

function PatternSummaryView({ pattern }: { pattern: PatternDefinition }) {
  const validations = pattern.coveredBy.map((id) => getValidationSlice(id)).filter(Boolean);
  return <article className="ipl-summary">
    <div className="ipl-summary-lead"><p className="demo-eyebrow">TAXONOMY ITEM</p><h2>分类定义</h2><p>{pattern.summary.problem}</p></div>
    <div className="ipl-summary-grid">
      <section><h3>适用线索</h3><ul>{pattern.summary.appliesWhen.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="is-caution"><h3>边界与风险</h3><ul>{pattern.summary.risks.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3>当前成熟度</h3><p><code>{pattern.maturity}</code>：{maturityDescriptions[pattern.maturity]}</p></section>
      <section><h3>下一证据</h3><p>{pattern.nextEvidence}</p>{pattern.demos.length === 0 && <strong className="ipl-no-demo-note">尚无交互演示</strong>}</section>
    </div>
    <section className="ipl-evidence"><div><p className="demo-eyebrow">EVIDENCE</p><h2>来源与覆盖</h2><p>覆盖关系说明验证案例涉及该分类项，不会传播或提升成熟度。</p></div><dl>
      <div><dt>成熟度</dt><dd><span className="ipl-validation-badge"><i />{pattern.maturity}</span></dd></div>
      <div><dt>覆盖关系</dt><dd>{validations.length ? validations.map((validation) => <span key={validation!.validationId}><code>{validation!.validationId}</code> {validation!.label}</span>) : <span>尚无验证切片覆盖</span>}</dd></div>
      <div className="is-wide"><dt>来源位置</dt><dd>{pattern.sources.map((source) => <code key={source}>{source}</code>)}</dd></div>
    </dl></section>
  </article>;
}
