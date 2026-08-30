import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { getDemo } from '../catalog/demoRegistry';
import { getPattern, listPatterns, resolvePatternId } from '../catalog/patterns';
import type { PatternDefinition } from '../catalog/types';
import { DemoBoundary } from './DemoBoundary';

type WorkspaceTab = 'prototype' | 'summary';

function initialPatternId(): string {
  return resolvePatternId(new URLSearchParams(window.location.search).get('pattern'));
}

export function App() {
  const [query, setQuery] = useState('');
  const [activePatternId, setActivePatternId] = useState(initialPatternId);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('prototype');
  const [resetVersion, setResetVersion] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set([getPattern(initialPatternId())?.category ?? '页面结构']));
  const [isNarrow, setIsNarrow] = useState(false);
  const catalogTriggerRef = useRef<HTMLButtonElement>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);
  const visiblePatterns = useMemo(() => listPatterns(query), [query]);
  const patternGroups = useMemo(() => {
    const groups = new Map<string, PatternDefinition[]>();
    visiblePatterns.forEach((pattern) => groups.set(pattern.category, [...(groups.get(pattern.category) ?? []), pattern]));
    return [...groups.entries()];
  }, [visiblePatterns]);
  const activePattern = getPattern(activePatternId) ?? listPatterns()[0];
  const Demo = getDemo(activePattern.demoId);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('pattern', activePatternId);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [activePatternId]);

  useEffect(() => {
    setOpenCategories((current) => current.has(activePattern.category) ? current : new Set([...current, activePattern.category]));
  }, [activePattern.category]);

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
    setActivePatternId(patternId);
    setActiveTab('prototype');
    setResetVersion((value) => value + 1);
    setStatusMessage('');
    setCatalogOpen(false);
    window.setTimeout(() => catalogTriggerRef.current?.focus(), 0);
  };

  const resetDemo = () => {
    setResetVersion((value) => value + 1);
    setStatusMessage('已恢复预置状态');
  };

  const toggleCategory = (category: string) => {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  };

  return (
    <div className={`ipl-app${catalogOpen ? ' is-catalog-open' : ''}${railCollapsed ? ' is-rail-collapsed' : ''}`}>
      <header className="ipl-product-bar">
        <button
          ref={catalogTriggerRef}
          className="ipl-mobile-catalog-trigger"
          type="button"
          aria-expanded={catalogOpen}
          aria-controls="pattern-catalog"
          onClick={() => setCatalogOpen((value) => !value)}
        ><span aria-hidden="true">☰</span>{catalogOpen ? '关闭导航' : '打开导航'}</button>
        <div className="ipl-mobile-brand"><strong>企业交互模式工作台</strong><span>模式资产</span></div>
        <div className="ipl-product-context">
          <span>模式资产 / <b>{activePattern.category}</b></span>
          <span className="ipl-context-divider" aria-hidden="true" />
          <span><b>{listPatterns().length}</b> 个已验证模式</span>
          <span className="ipl-context-divider" aria-hidden="true" />
          <span>静态 Demo · 无业务写入</span>
        </div>
      </header>

      <aside
        id="pattern-catalog"
        className="ipl-catalog"
        aria-label="交互模式平台导航"
        data-collapsed={railCollapsed}
        aria-hidden={isNarrow && !catalogOpen ? true : undefined}
        inert={isNarrow && !catalogOpen ? true : undefined}
      >
        <div className="ipl-rail-brand">
          <span className="ipl-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div><strong>交互模式工作台</strong><span>发现 · 体验 · 评审</span></div>
          <button type="button" aria-label={railCollapsed ? '展开平台导航' : '折叠平台导航'} title={railCollapsed ? '展开平台导航' : '折叠平台导航'} onClick={() => {
            setRailCollapsed((value) => {
              if (!value) setOpenCategories(new Set([activePattern.category]));
              return !value;
            });
          }}>{railCollapsed ? '›' : '‹'}</button>
        </div>
        <label className="ipl-catalog-search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={catalogSearchRef}
            type="search"
            aria-label="搜索交互模式"
            placeholder="名称、编号、分类或关键词"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && <button type="button" aria-label="清除目录搜索词" onClick={() => setQuery('')}>×</button>}
        </label>

        <nav className="ipl-pattern-list" aria-label="模式分类与页面">
          {patternGroups.map(([category, patterns], index) => {
            const isOpen = query.trim().length > 0 || openCategories.has(category);
            return (
              <section className="ipl-pattern-group" key={category}>
                <button type="button" className="ipl-category-item" aria-expanded={isOpen} aria-controls={`category-${index}`} onClick={() => toggleCategory(category)} title={category}>
                  <span className="ipl-category-marker" aria-hidden="true">{category === '页面结构' ? 'P' : 'S'}</span>
                  <strong>{category}</strong><span className="ipl-category-count">{patterns.length}</span>
                  <span className={`ipl-category-chevron${isOpen ? ' is-open' : ''}`} aria-hidden="true">›</span>
                </button>
                {isOpen && <div id={`category-${index}`} className={`ipl-pattern-children${railCollapsed ? ' is-flyout' : ''}`}>
                  {railCollapsed && <strong className="ipl-flyout-title">{category}</strong>}
                  {patterns.map((pattern) => <PatternCatalogItem key={pattern.id} pattern={pattern} active={pattern.id === activePatternId} onSelect={() => selectPattern(pattern.id)} />)}
                </div>}
              </section>
            );
          })}
          {visiblePatterns.length === 0 && (
            <div className="ipl-empty-catalog">
              <span>0 RESULTS</span>
              <strong>没有匹配的模式</strong>
              <p>保留了当前搜索词，调整关键词或恢复完整目录。</p>
              <button type="button" onClick={() => setQuery('')}>清空搜索</button>
            </div>
          )}
        </nav>
        <footer className="ipl-catalog-footer"><span className="ipl-status-dot" />仅展示有证据的模式状态</footer>
      </aside>

      <main className="ipl-main" inert={isNarrow && catalogOpen ? true : undefined}>
        <section className="ipl-pattern-header" aria-labelledby="active-pattern-title">
          <div>
            <div className="ipl-pattern-kicker"><code>{activePattern.id}</code><span>{activePattern.category}</span></div>
            <h1 id="active-pattern-title">{activePattern.name}</h1>
            <p>{activePattern.summary.problem}</p>
          </div>
          <div className="ipl-pattern-actions">
            <span className="ipl-validation-badge"><i />已验证一次</span>
            <button type="button" onClick={resetDemo} aria-label="重置当前 Demo">重置 Demo</button>
          </div>
        </section>

        <div className="ipl-workspace-tabs" role="tablist" aria-label="模式内容">
          <button type="button" role="tab" aria-selected={activeTab === 'prototype'} onClick={() => setActiveTab('prototype')}>交互原型</button>
          <button type="button" role="tab" aria-selected={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>模式说明</button>
          <span className="ipl-live-status" role="status" aria-live="polite">{statusMessage}</span>
        </div>

        <section className="ipl-workspace" aria-label={activeTab === 'prototype' ? '交互原型' : '模式说明'}>
          {activeTab === 'prototype' ? (
            <div className="ipl-prototype-frame">
              <div className="ipl-frame-bar"><span><i /><i /><i /></span><code>demo://{activePattern.demoId}</code><em>仅当前会话</em></div>
              <div className="ipl-demo-stage">
                <DemoBoundary key={`boundary-${activePattern.id}-${resetVersion}`} onRetry={resetDemo}>
                  <Suspense fallback={<div className="ipl-state-panel" role="status"><span className="ipl-state-code">LOADING_ADAPTER</span><h3>正在加载交互案例</h3><p>目录和模式说明仍可使用。</p></div>}>
                    <Demo key={`${activePattern.id}-${resetVersion}`} />
                  </Suspense>
                </DemoBoundary>
              </div>
            </div>
          ) : <PatternSummaryView pattern={activePattern} />}
        </section>
      </main>
      {catalogOpen && <button type="button" className="ipl-catalog-scrim" aria-label="关闭模式目录遮罩" onClick={() => { setCatalogOpen(false); catalogTriggerRef.current?.focus(); }} />}
    </div>
  );
}

function PatternCatalogItem({ pattern, active, onSelect }: { pattern: PatternDefinition; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`ipl-pattern-item${active ? ' is-active' : ''}`} aria-label={`${pattern.name}，${pattern.id}`} aria-current={active ? 'page' : undefined} onClick={onSelect} title={`${pattern.name} · ${pattern.id}`}>
      <span className="ipl-pattern-bullet" aria-hidden="true" />
      <span className="ipl-pattern-item-copy"><strong>{pattern.name}</strong><code>{pattern.id}</code></span>
      <span className="ipl-status-dot" aria-label="已验证一次" />
    </button>
  );
}

function PatternSummaryView({ pattern }: { pattern: PatternDefinition }) {
  const sections: Array<{ title: string; items: string[]; tone?: string }> = [
    { title: '适用边界', items: pattern.summary.appliesWhen },
    { title: '不适用边界', items: pattern.summary.avoidWhen, tone: 'caution' },
    { title: '主要行为', items: pattern.summary.behaviors },
    { title: '关键状态', items: pattern.summary.states },
    { title: '风险与代价', items: pattern.summary.risks, tone: 'caution' },
  ];
  return (
    <article className="ipl-summary">
      <div className="ipl-summary-lead"><p className="demo-eyebrow">PATTERN INTENT</p><h2>解决的问题</h2><p>{pattern.summary.problem}</p></div>
      <div className="ipl-summary-grid">
        {sections.map((section) => <section className={section.tone ? `is-${section.tone}` : ''} key={section.title}><h3>{section.title}</h3><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}
      </div>
      <section className="ipl-evidence">
        <div><p className="demo-eyebrow">EVIDENCE</p><h2>来源与验证</h2><p>状态为“已验证一次”：已在一个真实项目完成组件、构建和浏览器验证，尚不能晋升为跨项目结论。</p></div>
        <dl><div><dt>验证状态</dt><dd><span className="ipl-validation-badge"><i />validated-once</span></dd></div><div><dt>主来源指纹</dt><dd><code>{pattern.sourceFingerprint.sha256.slice(0, 16)}…</code></dd></div><div className="is-wide"><dt>来源位置</dt><dd>{pattern.sources.map((source) => <code key={source}>{source}</code>)}</dd></div></dl>
      </section>
    </article>
  );
}
