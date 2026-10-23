import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouteTabs, useRouteTabs } from './RouteTabs';
import './host.css';

const pages = [{ path: '/', title: '首页' }, { path: '/devices', title: '设备目录' }, { path: '/schedule', title: '维护计划' }, { path: '/reports', title: '统计报表' }];
function Content({ title }: { title: string }) {
  const [count, setCount] = useState(0);
  return <section aria-label="页面内容"><h2>{title}</h2><button onClick={() => setCount(count + 1)}>页面计数 {count}</button></section>;
}
function Demo() {
  const [path, setPath] = useState('/'), [shellCount, setShellCount] = useState(0);
  const current = pages.find(page => page.path === path)!;
  const { tabs, execute, refreshKey } = useRouteTabs({ home: pages[0], current, activePath: path, onNavigate: setPath });
  return <main>
    <h1>工作区页签独立接入</h1>
    <p>合成页面。导航由宿主管理；切换会卸载内容，不提供草稿保护或页面缓存。</p>
    <nav aria-label="演练页面入口">{pages.slice(1).map(page => <button key={page.path} onClick={() => setPath(page.path)}>打开{page.title}</button>)}</nav>
    <button onClick={() => setShellCount(shellCount + 1)}>宿主计数 {shellCount}</button>
    <output aria-label="当前路径">{path}</output>
    <div className="demo-workspace"><RouteTabs tabs={tabs} activePath={path} onNavigate={setPath} onAction={execute} getHref={tab => `${location.origin}/?route=${encodeURIComponent(tab.path)}`} />
      <Content key={`${path}:${refreshKey}`} title={current.title} />
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Demo />);
