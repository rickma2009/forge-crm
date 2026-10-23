import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ListViewSelector } from './ListViewSelector';
import './host.css';

function App() {
  const [value, setValue] = useState('all');
  const [mode, setMode] = useState('normal');
  const [settingsCount, setSettingsCount] = useState(0);
  return <main>
    <h1>视图选择器接入演练</h1>
    <p>独立宿主只验证组件回调与布局，不连接真实视图或权限服务。</p>
    <label>场景<select value={mode} onChange={event => setMode(event.target.value)}>
      <option value="normal">正常</option><option value="readonly">禁止设置</option>
      <option value="disabled">全部禁用</option><option value="empty">无可用视图</option>
    </select></label>
    <section>
      <ListViewSelector value={mode === 'empty' ? '' : value}
        options={mode === 'empty' ? [] : [{ value: 'all', label: '全部记录' }, { value: 'mine', label: '我的记录' }]}
        onChange={setValue} onSettings={() => setSettingsCount(count => count + 1)}
        disabled={mode === 'disabled'} settingsDisabled={mode === 'readonly'} />
    </section>
    <output aria-live="polite">当前值：{value}；设置回调：{settingsCount}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
