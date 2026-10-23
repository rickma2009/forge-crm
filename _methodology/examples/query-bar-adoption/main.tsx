import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RecordQueryBar } from './RecordQueryBar';
import './host.css';

function App() {
  const [layout, setLayout] = useState<'default' | 'singleRow'>('singleRow');
  const [values, setValues] = useState<string[]>(Array(7).fill(''));
  const [submitted, setSubmitted] = useState<string[] | null>(null);
  return <main>
    <h1>查询栏接入演练</h1>
    <p>本页采用独立宿主样式和模拟条件，用于核对组件接入。</p>
    <label className="mode">布局<select value={layout} onChange={event => setLayout(event.target.value as typeof layout)}>
      <option value="default">默认响应式</option><option value="singleRow">条件单行</option>
    </select></label>
    <RecordQueryBar layout={layout} onQuery={() => setSubmitted([...values])}
      onReset={() => { const empty = Array<string>(7).fill(''); setValues(empty); setSubmitted(empty); }}>
      {values.map((value, index) => <label key={index}>条件 {index + 1}<input value={value}
        onChange={event => setValues(values.map((old, position) => position === index ? event.target.value : old))} /></label>)}
    </RecordQueryBar>
    <h2>已提交的条件</h2>
    <output aria-live="polite">{submitted === null ? '尚未查询' : JSON.stringify(submitted)}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
