import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TreeWorkspace } from './TreeWorkspace';
import './host.css';

// Synthetic data: no CRM imports, API calls, permission service or persistence.
const nodes = [
  { id: 'hardware', parentId: null, label: '硬件', searchText: 'HW' },
  { id: 'boards', parentId: 'hardware', label: '板卡', searchText: 'PCB' },
  { id: 'control', parentId: 'boards', label: '控制板', searchText: 'CTRL' },
  { id: 'sensor', parentId: 'hardware', label: '传感器', searchText: 'SENSOR' },
  { id: 'service', parentId: null, label: '服务', searchText: 'SVC' },
];

function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState('normal');
  const [action, setAction] = useState('尚无操作');
  const [refreshes, setRefreshes] = useState(0);
  const current = nodes.find(node => node.id === selected);
  return <main>
    <h1>树形工作区接入演练</h1>
    <p>合成分类数据；节点动作只回显回调，不执行新增、修改或删除。</p>
    <label className="scenario">场景<select value={mode} onChange={event => setMode(event.target.value)}>
      <option value="normal">可维护</option><option value="readonly">只读</option>
      <option value="loading">加载中</option><option value="empty">空树</option>
    </select></label>
    <TreeWorkspace title="分类" nodes={mode === 'empty' ? [] : nodes}
      selectedId={selected} onSelect={setSelected} loading={mode === 'loading'}
      onRefresh={() => setRefreshes(count => count + 1)}
      onCreate={mode === 'normal' ? () => setAction('新增根分类') : undefined}
      actions={mode === 'normal' ? node => [
        { key: 'child', label: '新增子分类', run: () => setAction(`新增子分类：${node.label}`) },
        { key: 'edit', label: '编辑', run: () => setAction(`编辑：${node.label}`) },
        { key: 'move', label: '移动 / 排序', run: () => setAction(`移动 / 排序：${node.label}`) },
        { key: 'delete', label: '删除', danger: true, disabled: node.id === 'hardware', run: () => setAction(`删除：${node.label}`) },
      ] : undefined}>
      <section className="detail-content" aria-label="分类详情">
        <h2>{current?.label ?? '请选择分类'}</h2>
        <p>分类编码：{current?.id ?? '—'}</p>
        <p>父分类：{nodes.find(node => node.id === current?.parentId)?.label ?? '—'}</p>
        <output aria-live="polite">最近动作：{action}；刷新次数：{refreshes}</output>
      </section>
    </TreeWorkspace>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
