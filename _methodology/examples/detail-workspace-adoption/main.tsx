import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DetailWorkspace, DetailHeader, DetailTabs, DetailPanel, DetailSection } from './DetailWorkspace';
import './host.css';

function Demo() {
  const [active, setActive] = useState<'info' | 'history'>('info');
  const [name, setName] = useState('示例设备'), [notice, setNotice] = useState('未触发操作');
  const [canReadHistory, setCanReadHistory] = useState(true);
  const tabs = [{ id: 'info' as const, label: '基本信息' }, ...(canReadHistory ? [{ id: 'history' as const, label: '维护记录 (2)' }] : [])];
  return <main>
    <h1>详情容器独立接入</h1>
    <p>合成设备资料；字段、权限及表单状态由宿主负责，操作仅显示回调结果。</p>
    <label className="demo-control"><input type="checkbox" checked={canReadHistory} onChange={event => { setCanReadHistory(event.target.checked); if (!event.target.checked) setActive('info'); }} />显示维护记录</label>
    <DetailWorkspace>
      <DetailHeader title="EQ-001" status={<span className="demo-status">演练</span>} onBack={() => setNotice('返回回调：由宿主决定目的地')} backLabel="返回设备列表" fields={[{ label: '设备名称', value: name }, { label: '负责人', value: null }]} actions={<button type="button" onClick={() => setNotice(`保存回调：${name}`)}>保存示例</button>} />
      <DetailTabs id="equipment" label="设备详情分区" tabs={tabs} active={active} onChange={setActive} />
      <DetailPanel id="equipment" active={active}>
        {active === 'info' ? <DetailSection title="设备资料"><label>设备名称<input value={name} onChange={event => setName(event.target.value)} /></label><p>切换分区后输入仍保留，因为值存储在宿主状态中。</p></DetailSection> : <DetailSection title="维护记录"><ul><li>2026-10-01：例行检查</li><li>2026-10-02：更换耗材</li></ul></DetailSection>}
      </DetailPanel>
    </DetailWorkspace>
    <output aria-live="polite">{notice}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Demo />);
