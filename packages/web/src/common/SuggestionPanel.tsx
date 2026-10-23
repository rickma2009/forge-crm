import type { SalesSuggestion } from '@forge-crm/contracts';
import { RowActionButton } from './RowActionButton';
const labels={ACTIVE:'待处理',ADOPTED:'已采纳',IGNORED:'已忽略',SNOOZED:'稍后提醒',EXPIRED:'已失效'};
export function SuggestionPanel({items,onAction}:{items:SalesSuggestion[];onAction:(item:SalesSuggestion,action:'ADOPT'|'IGNORE'|'SNOOZE')=>void}){
 return <ul className="sales-suggestion-list">{items.map(item=><li key={item.id}><div><strong>{item.title}</strong><span className="status-pill">{labels[item.state]}</span><p>{item.reason}</p><small>规则 {item.ruleCode} · 版本 {item.ruleVersion} · 依据时间 {new Date(item.basisAt).toLocaleString('zh-CN')}{item.resumeAt?` · 再次提醒 ${new Date(item.resumeAt).toLocaleString('zh-CN')}`:''}</small></div>{item.canAct&&<div className="row-actions"><RowActionButton label="确认采纳建议" onClick={()=>onAction(item,'ADOPT')}/><RowActionButton label="暂缓建议" onClick={()=>onAction(item,'SNOOZE')}/><RowActionButton label="忽略建议" onClick={()=>onAction(item,'IGNORE')}/></div>}</li>)}</ul>;
}
