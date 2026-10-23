import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DrawerWorkspace } from './DrawerWorkspace';
import './host.css';
function Demo() {
  const [open, setOpen] = useState(false), [childOpen, setChildOpen] = useState(false);
  const [dirty, setDirty] = useState(false), [notice, setNotice] = useState('尚未关闭');
  const close = () => { if (dirty) { setNotice('宿主阻止关闭：请先撤销修改'); return; } setOpen(false); setNotice('已关闭'); };
  return <main><h1>抽屉容器独立接入</h1><p>合成内容，无 AI、接口或真实保存。背景刻意保留长页面，用于检查滚动责任。</p>
    <button onClick={() => setOpen(true)}>打开抽屉</button><button>背景操作</button><output>{notice}</output>
    <div className="demo-spacer">长页面背景</div>
    {open && <DrawerWorkspace title="合成任务" subtitle="布局、键盘与宿主关闭守卫" onClose={close} footer={<><button onClick={() => { setDirty(false); setNotice('已撤销修改'); }}>撤销修改</button><button onClick={close}>关闭任务</button><button tabIndex={-1}>仅程序聚焦</button></>}>
      <label>任务说明<input onChange={() => setDirty(true)} /></label>
      <button onClick={() => setChildOpen(true)}>打开子控件</button>
      {childOpen && <div className="demo-child" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setChildOpen(false); } }}><label>子控件输入<input /></label></div>}
      <p>修改说明后，关闭请求由宿主拦截；撤销修改后才能关闭。此守卫仅作演示，不是完整未保存确认。</p>
    </DrawerWorkspace>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Demo />);
