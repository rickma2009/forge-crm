import type { SessionUser } from '@interaction-pattern-lab/contracts';
import { showcaseRegistry } from './registry/registry';

export function OverviewPage({ user }: { user: SessionUser }) {
  const interactivePageCount = showcaseRegistry.pages.filter((page) => page.coverage === 'interactive-slice').length;
  const descriptionPageCount = showcaseRegistry.pages.filter((page) => page.coverage === 'description-only').length;

  return <div>
    <header className="showcase-page-header"><p>PORTAL OVERVIEW</p><h1>概览</h1><span>使用数据库角色授权结果验证导航、工具栏、多页签和页面权限。</span></header>
    <div className="showcase-metric-grid">
      <article><span>交互页面</span><strong>{interactivePageCount}</strong><small>已接入可交互验证</small></article>
      <article><span>说明页面</span><strong>{descriptionPageCount}</strong><small>已登记说明入口</small></article>
      <article><span>当前账号</span><strong>{user.account}</strong><small>{user.displayName}</small></article>
      <article><span>授权来源</span><strong>RBAC</strong><small>下一请求实时生效</small></article>
    </div>
    <section className="showcase-panel"><h2>开始验证</h2><p>从左侧统一菜单树打开页面。页面会保留为多页签；顶栏工具不会随业务页面切换而消失。</p></section>
  </div>;
}
