import { useEffect,useRef,useState } from 'react';
import { activityTypeLabels,type ActivityWrite,type TimelineEntry,type TimelinePage } from '@forge-crm/contracts';
import { ActivityTimeline } from '../common/ActivityTimeline';
import { RowActionButton } from '../common/RowActionButton';
import { activityApi } from './activity-api';
import { AttachmentPanel } from './AttachmentPanel';
import { GatewayError,type EnterpriseGateway } from './gateway';
export function ActivityPanel({systemCode,kind,recordId,gateway,api=activityApi,onDirtyChange}:{systemCode:string;kind:'customer'|'opportunity';recordId:string;gateway:EnterpriseGateway;api?:typeof activityApi;onDirtyChange?:(dirty:boolean)=>void}){
 const [type,setType]=useState(''),[data,setData]=useState<TimelinePage|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[tick,setTick]=useState(0),[expanded,setExpanded]=useState<string|null>(null),[editor,setEditor]=useState<TimelineEntry|'new'|null>(null);
 const generation=useRef(0),busy=useRef(false),dirty=useRef(onDirtyChange);dirty.current=onDirtyChange;
 useEffect(()=>{dirty.current?.(!!editor);return()=>dirty.current?.(false);},[editor]);
 useEffect(()=>{const g=++generation.current;busy.current=true;setLoading(true);setData(null);setExpanded(null);setError('');
  void api.list(systemCode,kind,recordId,type).then(next=>{if(g===generation.current)setData(next);}).catch(e=>{if(g===generation.current)setError(e.message);}).finally(()=>{if(g===generation.current){setLoading(false);busy.current=false;}});return()=>{generation.current++;};
 },[api,systemCode,kind,recordId,type,tick]);
 const more=async()=>{if(!data?.nextCursor||busy.current)return;const g=generation.current;busy.current=true;setLoading(true);setError('');
  try{const next=await api.list(systemCode,kind,recordId,type,data.nextCursor);if(g!==generation.current)return;setData(old=>old?{...next,items:[...old.items,...next.items.filter(x=>!old.items.some(y=>x.key===y.key))]}:next);}
  catch(e){if(g===generation.current){setError(e instanceof Error?e.message:'加载失败');if(e instanceof GatewayError&&[400,403,404].includes(e.status))setData(null);}}
  finally{if(g===generation.current){busy.current=false;setLoading(false);}}
 };
 return <section className="activity-panel" aria-label="销售活动"><div className="activity-toolbar"><label>活动类型<select value={type} disabled={!!editor} onChange={e=>setType(e.target.value)}><option value="">全部</option>{Object.entries(activityTypeLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><div><button type="button" disabled={loading||!!editor} onClick={()=>setTick(v=>v+1)}>刷新时间轴</button>{data?.canCreate&&<button className="is-primary" type="button" disabled={!!editor} onClick={()=>setEditor('new')}>新增活动</button>}</div></div>
  <p className="activity-meta">记录已发生的销售活动；未来计划请使用待办。修改或新增后刷新快照，系统事件不可编辑。</p>
  {error&&<p role="alert" className="enterprise-alert">{error}</p>}{loading&&!data&&<p role="status">正在加载活动…</p>}{data&&!data.items.length&&<p className="empty-panel">暂无活动记录</p>}
  {data&&<ActivityTimeline items={data.items} expanded={expanded} onExpand={key=>setExpanded(old=>old===key?null:key)} renderDetail={item=><>
   <p><strong>内容：</strong>{item.content}</p>{item.result&&<p><strong>{item.type==='SYSTEM'?'变更说明':'结果'}：</strong>{item.result}</p>}{item.nextStep&&<p><strong>下一步：</strong>{item.nextStep}</p>}
   <p className="activity-meta">来源：{item.opportunityId ? <a className="record-detail-link" href={`#/showcase/opportunities/${item.opportunityId}`}>关联商机</a> : '当前客户'}{item.sourceType==='FOLLOW_UP' ? ' · 跟进记录' : item.type==='SYSTEM' ? ' · 系统变更记录' : ' · 销售活动'}</p>
   {item.canEdit&&<RowActionButton label={`修改活动 ${item.title}`} onClick={()=>setEditor(item)}/>}
   {['ACTIVITY','FOLLOW_UP'].includes(item.sourceType)&&<AttachmentPanel key={item.key} systemCode={systemCode} ownerType={item.sourceType==='ACTIVITY'?'SALES_ACTIVITY':'OPPORTUNITY_FOLLOW_UP'} ownerId={item.sourceId} gateway={gateway} allowedActions={item.canEdit?['attachment-view','attachment-upload','attachment-download','attachment-update','attachment-delete']:['attachment-view','attachment-download']}/>}
  </>}/>}
  {data?.nextCursor&&<div className="activity-pagination"><button type="button" disabled={loading} onClick={()=>void more()}>{loading?'正在加载…':'加载更多活动'}</button></div>}
  {editor&&<ActivityEditor entry={editor==='new'?undefined:editor} onClose={()=>setEditor(null)} onSave={async(form,status,reason)=>{
   if(editor==='new')await api.create(systemCode,kind,recordId,form);
   else {const {requestId:_,type:_type,...fields}=form;await api.update(systemCode,editor.sourceType,editor.sourceId,{...fields,version:editor.version,status,reason});}
   setEditor(null);setTick(v=>v+1);
  }}/>}
 </section>;
}
export const localDateTime=(iso:string)=>{const date=new Date(iso);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
function ActivityEditor({entry,onClose,onSave}:{entry?:TimelineEntry;onClose:()=>void;onSave:(form:ActivityWrite,status:'ACTIVE'|'DISABLED',reason:string)=>Promise<void>}){
 const initialContent=entry?.content??'';
 const [form,setForm]=useState<ActivityWrite>({type:entry&&entry.type!=='SYSTEM'?entry.type:'VISIT',title:entry?.title??'',content:initialContent,result:entry?.result??'',nextStep:entry?.nextStep??'',occurredAt:entry?.occurredAt??new Date().toISOString(),requestId:crypto.randomUUID()});
 const [status,setStatus]=useState<'ACTIVE'|'DISABLED'>('ACTIVE'),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef<HTMLFormElement>(null),submitted=useRef(false);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLElement>('input,select')?.focus();return()=>{previous?.focus();};},[]);
 const close=()=>{if(!busy)onClose();};
 return <div className="enterprise-modal-backdrop"><form ref={dialog} className="enterprise-modal activity-editor" role="dialog" aria-modal="true" aria-label={entry?'修改活动':'新增活动'} onSubmit={e=>{e.preventDefault();if(submitted.current)return;submitted.current=true;setBusy(true);setError('');void onSave(form,status,reason).catch(e=>setError(e.message)).finally(()=>{submitted.current=false;setBusy(false);});}} onKeyDown={e=>{
  if(e.key==='Escape'){e.stopPropagation();close();}
  if(e.key==='Tab'){const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)')??[]);if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0]?.focus();}}
 }}><header><h2>{entry?'修改活动':'新增活动'}</h2></header><div className="modal-body">{error&&<p role="alert" className="enterprise-alert span-2">{error}</p>}
  <label>活动类型<select disabled={busy||!!entry} value={form.type} onChange={e=>setForm({...form,type:e.target.value as ActivityWrite['type']})}>{Object.entries(activityTypeLabels).filter(([key])=>key!=='SYSTEM').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <label>发生时间<input required disabled={busy} type="datetime-local" value={localDateTime(form.occurredAt)} onChange={e=>{if(e.target.value)setForm({...form,occurredAt:new Date(e.target.value).toISOString()});}}/></label>
  <label className="span-2">标题<input required maxLength={120} disabled={busy} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
  <label className="span-2">内容<textarea required maxLength={1000} rows={3} disabled={busy} value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label>
  <label>结果<textarea maxLength={2000} disabled={busy} value={form.result} onChange={e=>setForm({...form,result:e.target.value})}/></label><label>下一步<textarea maxLength={1000} disabled={busy} value={form.nextStep} onChange={e=>setForm({...form,nextStep:e.target.value})}/></label>
  {entry&&<><label>记录状态<select disabled={busy} value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="ACTIVE">有效</option><option value="DISABLED">作废（保留记录）</option></select></label><label>修改原因<input required maxLength={500} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}/></label></>}
  <p className="activity-meta span-2">执行人自动记录为当前用户。保存后可展开记录上传附件。</p>
 </div><footer><button type="button" disabled={busy} onClick={close}>取消</button><button type="submit" className="is-primary" disabled={busy||!form.title.trim()||!form.content.trim()||(!!entry&&!reason.trim())}>{busy?'保存中…':'保存活动'}</button></footer></form></div>;
}
