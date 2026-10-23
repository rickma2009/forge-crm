import type { ReactNode } from 'react';
import { activityTypeLabels,type TimelineEntry } from '@forge-crm/contracts';
import './activity-timeline.css';
export function ActivityTimeline({items,expanded,onExpand,renderDetail}:{items:TimelineEntry[];expanded:string|null;onExpand:(key:string)=>void;renderDetail:(entry:TimelineEntry)=>ReactNode}){
 return <ol className="activity-timeline" aria-label="活动时间轴">{items.map(item=><li key={item.key} className={item.status==='DISABLED'?'is-void':''}>
  <div className="activity-time"><time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString('zh-CN',{hour12:false})}</time><span>{activityTypeLabels[item.type]}{item.status==='DISABLED'?' · 已作废':''}</span></div>
  <div className="activity-body"><button type="button" className="activity-title record-detail-link" aria-expanded={expanded===item.key} onClick={()=>onExpand(item.key)}>{item.title}</button>
   <p className="activity-summary">{item.content}</p><div className="activity-meta">执行人：{item.actorName} · 录入时间：{new Date(item.recordedAt).toLocaleString('zh-CN',{hour12:false})}{item.type==='SYSTEM'?' · 系统留痕，只读':''}</div>
   {expanded===item.key&&<div className="activity-expanded">{renderDetail(item)}</div>}
  </div></li>)}</ol>;
}
