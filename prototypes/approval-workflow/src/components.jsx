import React, { useEffect, useRef, useState } from 'react';
import { BusinessDataGrid } from '../../../packages/web/src/common/data-grid/LazyBusinessDataGrid';
import { ListViewSelector } from '../../../packages/web/src/common/ListViewSelector';
import { RecordQueryBar } from '../../../packages/web/src/common/RecordQueryBar';
import { nameOf } from './model.mjs';
export { DetailWorkspace, DetailHeader, DetailTabs, DetailPanel, DetailSection } from '../../../packages/web/src/common/DetailWorkspace';
export { DocumentWorkspace } from '../../../packages/web/src/common/DocumentWorkspace';
export function Badge({ children }) { return <span className={`badge ${/通过|成功|已发布/.test(children) ? 'success' : /失败|拒绝/.test(children) ? 'danger' : /退回|草稿/.test(children) ? 'warning' : 'blue'}`}>{children}</span>; }
export function Modal({ title, children, onClose, onSave, saveLabel = '确定', error }) {
  const ref = useRef(null);
  useEffect(() => { const prev = document.activeElement; ref.current.showModal(); return () => prev?.focus(); }, []);
  return <dialog ref={ref} className="proto-modal" aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }}><form onSubmit={e => { e.preventDefault(); onSave(); }}><header><h2>{title}</h2><button type="button" aria-label="关闭弹窗" onClick={onClose}>×</button></header><div className="modal-content">{error && <p className="notice error" role="alert">{error}</p>}{children}</div><footer><button type="button" onClick={onClose}>取消</button><button className="is-primary" type="submit">{saveLabel}</button></footer></form></dialog>;
}
export function DataList({ id, actor, title, columns, rows, actions, statusOptions = [], typeOptions = [], rowActions }) {
  const key = `forge.prototype.approval.view.${actor}.${id}`;
  const base = { columns: columns.map((c,n) => ({key:c.key,visible:true,width:c.width ?? (n===0?190:150),fixed:n===0?'left':null,align:'left',queryVisible:false,queryCollapsed:false})), filters:{}, pageSize:20, sort:{field:columns[0].key,direction:'asc'} };
  const read = () => { try { const x=JSON.parse(localStorage.getItem(key));return x?.config?.columns ? x : {config:base,choice:'system'}; }catch{return {config:base,choice:'system'};} };
  const listKey=`${key}.query`; const saved=()=>{try{return JSON.parse(sessionStorage.getItem(listKey))||{};}catch{return {};}};
  const [view,setView]=useState(read),[settings,setSettings]=useState(false),[page,setPage]=useState(()=>saved().page||1),[input,setInput]=useState(()=>saved().input||{text:'',status:'',type:''}),[query,setQuery]=useState(()=>saved().query||{text:'',status:'',type:''});
  useEffect(()=>{sessionStorage.setItem(listKey,JSON.stringify({page,input,query}));},[page,input,query,listKey]);
  const config=view.choice==='system'?base:view.config;
  const change = (config,choice='personal') => { const next={config,choice,hasPersonal:true};setView(next);localStorage.setItem(key,JSON.stringify(next));setPage(1); };
  const filtered=rows.filter(r=>(!query.text || columns.some(c=>String(c.value(r)??'').toLowerCase().includes(query.text.toLowerCase())))&&(!query.status||r.status===query.status)&&(!query.type||r.type===query.type));
  const currentPage=Math.min(page,Math.max(1,Math.ceil(filtered.length/config.pageSize)));
  return <div className="list-workspace enterprise-page"><RecordQueryBar onQuery={()=>{setQuery(input);setPage(1);}} onReset={()=>{const q={text:'',status:'',type:''};setInput(q);setQuery(q);setPage(1);}}>
    <label>单号 / 标题 / 名称<input placeholder="输入关键词查询" value={input.text} onChange={e=>setInput({...input,text:e.target.value})}/></label>
    {!!typeOptions.length&&<label>业务类型<select aria-label="查询业务类型" value={input.type} onChange={e=>setInput({...input,type:e.target.value})}><option value="">全部</option>{typeOptions.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>}
    {!!statusOptions.length&&<label>状态<select aria-label="查询状态" value={input.status} onChange={e=>setInput({...input,status:e.target.value})}><option value="">全部</option>{statusOptions.map(n=><option key={n}>{n}</option>)}</select></label>}
  </RecordQueryBar><div className="surface"><div className="table-toolbar"><div className="inline"><strong>{title}</strong>{actions}</div><ListViewSelector value={view.choice} options={[{value:'system',label:'系统 · 标准视图'},...((view.hasPersonal||view.choice==='personal')?[{value:'personal',label:'我的视图'}]:[])]} onChange={v=>{const next={...view,choice:v};setView(next);localStorage.setItem(key,JSON.stringify(next));setPage(1);}} onSettings={()=>setSettings(true)}/></div>
    <BusinessDataGrid name={title} columns={columns} config={config} onConfigChange={c=>change(c)} rows={filtered.slice((currentPage-1)*config.pageSize,currentPage*config.pageSize)} rowKey={r=>r.id} total={filtered.length} page={currentPage} onPageChange={setPage} exportAll={async()=>filtered} rowActions={rowActions} settingsOpen={settings} onSettingsClose={()=>setSettings(false)} onSaveView={async(_name,c)=>change(c)} viewName="我的视图" maxPageSize={100}/>
  </div></div>;
}
export function MiniGrid({ name, columns, rows }) {
  const config={columns:columns.map(c=>({key:c.key,visible:true,width:c.width??180,fixed:null,align:'left',queryVisible:false,queryCollapsed:false})),filters:{},pageSize:20,sort:{field:columns[0].key,direction:'asc'}};
  return <BusinessDataGrid name={name} columns={columns} config={config} onConfigChange={()=>{}} rows={rows} rowKey={r=>r.id} total={rows.length} page={1} onPageChange={()=>{}} exportAll={async()=>rows} showPagination={false} autoHeight/>;
}
export function FlowDiagram({ stages, instance, selected, onSelect, threshold, preview=false }) {
  const [zoom,setZoom]=useState(1), scroll=useRef(null);
  const stateOf = (n) => !instance ? '预计' : n<instance.index ? '已完成' : n>instance.index ? '未执行' : instance.status==='业务执行失败'?'执行失败':instance.status==='已退回'?'已退回':instance.status==='已拒绝'?'已拒绝':'当前节点';
  return <div className="flow-region"><div className="flow-tools"><div className="inline"><strong>{preview?'预计审批路径':'审批进度'}</strong><span className="muted">{preview?'模拟结果，不创建待办':'点击节点查看人员与处理记录'}</span></div><div className="inline"><span className="legend"><i/>当前 <i className="green"/>完成 <i className="gray"/>未执行</span><button aria-label="缩小流程图" onClick={()=>setZoom(Math.max(.7,zoom-.1))}>−</button><button onClick={()=>setZoom(Math.min(1,(scroll.current?.clientWidth||800)/(scroll.current?.firstElementChild?.scrollWidth||800)))}>适配</button><button aria-label="放大流程图" onClick={()=>setZoom(Math.min(1.4,zoom+.1))}>＋</button><button disabled={!instance} onClick={()=>scroll.current?.querySelector('[data-current="true"]')?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})}>定位当前</button></div></div>
    <div className="flow-scroll" ref={scroll}><div className="flow-track" style={{zoom}}><div className="flow-end"><span>●</span>提交</div>{stages.map((node,n)=><React.Fragment key={node.id}>
      {node.id==='director'&&<div className="flow-condition"><span>◇</span>金额 &gt; {Number(threshold).toLocaleString()}<small>条件命中</small></div>}
      <span className="connector" aria-hidden="true">→</span>{node.people.length>1?<div className="parallel-lanes"><span className="parallel-label">并行会审 · 全部通过后汇合</span>{node.people.map(person=>{const current=instance?.index===n&&instance.pending.includes(person)&&instance.status==='审批中';const done=instance&&(n<instance.index||(n===instance.index&&!instance.pending.includes(person)&&instance.history.some(h=>h.user===person&&h.node===node.label&&h.action==='同意')));return <button key={person} className={`flow-node ${done?'complete':''} ${selected===n?'selected':''}`} data-current={current} onClick={()=>onSelect(n)} aria-label={`节点 ${nameOf(person)} ${current?'当前节点':done?'已完成':stateOf(n)}`}><span className="node-kind">人工审批<em>{current?'当前节点':done?'已完成':stateOf(n)}</em></span><strong>{person==='legal'?'法务审批':'财务审批'}</strong><span className="muted">{nameOf(person)}</span></button>;})}</div>:<button className={`flow-node ${selected===n?'selected':''} ${stateOf(n)==='已完成'?'complete':''} ${stateOf(n)==='执行失败'?'failed':''}`} data-current={instance?.index===n} onClick={()=>onSelect(n)} aria-label={`节点 ${node.label} ${stateOf(n)}`}><span className="node-kind">{node.id==='action'?'业务动作':node.people.length>1?'并行会审':'人工审批'}<em>{stateOf(n)}</em></span><strong>{node.label}</strong><span className="muted">{node.people.map(nameOf).join('、')||'系统自动执行'}</span>{node.people.length>1&&<small>{instance?.index===n?`待处理：${instance.pending.map(nameOf).join('、')}`:'全部同意后继续'}</small>}</button>}
    </React.Fragment>)}<span className="connector">→</span><div className={`flow-end ${instance?.status==='已通过'?'done':''}`}><span>◉</span>完成</div></div></div>
    {!stages.some(n=>n.id==='director')&&threshold!==undefined&&<p className="flow-footnote">金额未超过 ¥{Number(threshold).toLocaleString()}：未启用二级部门负责人分支。</p>}
  </div>;
}
