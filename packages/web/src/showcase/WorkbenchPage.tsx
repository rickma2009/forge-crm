import type { GuidanceTodo } from '@forge-crm/contracts';
import { TodoResultEditor } from './SalesGuidancePanel';
import { salesInteractionApi } from './sales-interaction-api';
import { NotificationPanel } from './NotificationPanel';
import { useEffect, useState } from 'react';
import { IconAlertTriangle, IconChevronRight, IconRefresh } from '@tabler/icons-react';
import { workbenchSchema, type Workbench } from '@forge-crm/contracts';
import { MetricCard, DashboardModule } from '../common/dashboard/Dashboard';
import { call, write } from './gateway';
import './workbench.css';

export function amountInWan(value: string) { return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(Number(value) / 10000); }
export function WorkbenchPage({ systemCode, onNavigate }: { systemCode: string; onNavigate: (path: string) => void }) {
  const [data, setData] = useState<Workbench | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [todoEditor,setTodoEditor]=useState<GuidanceTodo|null>(null);
  const completeTodo = async (id: string) => { try { await write(`/api/systems/${encodeURIComponent(systemCode)}/personal-agent/todos/${id}`, { status: 'DONE' }, 'PATCH'); setRevision((current) => current + 1); } catch { setError('待办状态更新失败，请重试'); } };
  useEffect(() => {
    let active = true; setData(null); setError('');
    call(`/api/systems/${encodeURIComponent(systemCode)}/workbench`).then((r) => r.json()).then((r) => { if (active) setData(workbenchSchema.parse(r)); }).catch(() => { if (active) setError('工作台加载失败，请重试'); });
    return () => { active = false; };
  }, [systemCode, revision]);
  return <div className="my-workbench"><header className="workbench-heading"><div><h1>我的工作台</h1><p>{data ? `${data.month} · 指标按当前授权业务范围统计，待办与预警仅显示本人负责的商机` : '查看业务指标与待处理事项'}</p></div><button className="secondary-button" type="button" onClick={() => setRevision((r) => r + 1)} aria-label="刷新工作台"><IconRefresh size={16} />刷新</button></header>
    {error && <div role="alert" className="dashboard-empty">{error}</div>}
    {!data && !error && <div role="status" className="dashboard-empty">正在加载工作台…</div>}
    {data && <><div className="dashboard-metrics">
      <MetricCard title="跟进商机" value={data.following ? String(data.following.count) : '—'} unit="个" note="初始 / 跟进中 · 本月预计签约">
        <p>预计金额：<b>{data.following ? `${amountInWan(data.following.amount)} 万元` : '无查看权限'}</b></p>{!!data.following?.missingAmount && <small>{data.following.missingAmount} 个商机未维护金额</small>}
      </MetricCard>
      <MetricCard title="本月签约" value={data.signed ? String(data.signed.count) : '—'} unit="个" tone="sky" note="按实际签约日期统计 · 金额取已签约商机金额">
        <p>签约金额：<b>{data.signed ? `${amountInWan(data.signed.amount)} 万元` : '无查看权限'}</b></p>{!!data.signed?.missingAmount && <small>{data.signed.missingAmount} 个商机未维护金额</small>}
      </MetricCard>
      <MetricCard title="库存" value={data.inventory === null ? '—' : amountInWan(data.inventory.find((r) => r.currency === 'CNY')?.amount ?? '0')} unit="万元" tone="teal" note="当前租户库存余额 · 不同币种分别列示">
        <p>{data.inventory === null ? '无查看权限' : '当前库存金额（人民币）'}</p>{data.inventory?.filter((r) => r.currency !== 'CNY').map((r) => <p key={r.currency}>{r.currency}：<b>{amountInWan(r.amount)} 万</b></p>)}
      </MetricCard>
    </div><div className="workbench-modules"><DashboardModule title="待处理事项" count={data.pending.total}>
      {data.agentTodos.total > 0 && <><h3>个人待办（{data.agentTodos.total}）</h3><WorkbenchItems items={data.agentTodos.items} onNavigate={onNavigate} onComplete={async(id)=>{const todo=data.agentTodos.items.find(t=>t.id===id);if(todo?.requiresResult){setTodoEditor({id:todo.id,title:todo.title,description:todo.description,status:'OPEN',result:'',dueDate:todo.date,version:todo.version!});return;}await completeTodo(id);}} empty="" /></>}
      <WorkbenchItems items={data.pending.items} onNavigate={onNavigate} empty={data.opportunityAllowed ? '暂无本人负责的待跟进商机' : '当前账号没有商机查看权限'} />
      {data.pending.total > data.pending.items.length && <p className="workbench-list-note">显示预签日期最早的 {data.pending.items.length} 条，更多记录请在商机管理按负责人查询。</p>}
    </DashboardModule><div className="workbench-side"><DashboardModule title="预警" count={data.warnings.total}><WorkbenchItems items={data.warnings.items} onNavigate={onNavigate} warning empty={data.opportunityAllowed ? '暂无预签逾期的商机' : '当前账号没有商机查看权限'} />{data.warnings.total > data.warnings.items.length && <p className="workbench-list-note">当前显示最早逾期的 {data.warnings.items.length} 条。</p>}</DashboardModule><DashboardModule title="消息"><NotificationPanel systemCode={systemCode} onNavigate={onNavigate}/></DashboardModule></div></div><p className="workbench-list-note">更新时间：{new Date(data.generatedAt).toLocaleString('zh-CN')} · 金额以万为单位四舍五入，不保留小数</p></>}
  {todoEditor&&<TodoResultEditor todo={todoEditor} onClose={()=>setTodoEditor(null)} onSave={async input=>{await salesInteractionApi.complete(systemCode,todoEditor.id,input);setTodoEditor(null);setRevision(x=>x+1);}}/>}</div>;
}
function WorkbenchItems({ items, onNavigate, onComplete, empty, warning = false }: { items: Workbench['pending']['items']; onNavigate: (path: string) => void; onComplete?: (id: string) => Promise<void>; empty: string; warning?: boolean }) {
  if (!items.length) return <div className="dashboard-empty">{empty}</div>;
  return <ul className="workbench-items">{items.map((item) => <li key={item.id}><button type="button" onClick={() => onNavigate(item.path)} data-warning={warning}><span className="workbench-item-mark">{warning ? <IconAlertTriangle size={19} /> : <i />}</span><span className="workbench-item-content"><strong>{item.title}</strong><small>{item.description}</small></span>{item.date && <time dateTime={item.date}>{item.date}</time>}<IconChevronRight size={16} /></button>{onComplete && <button className="workbench-todo-complete" type="button" onClick={() => void onComplete(item.id)}>完成</button>}</li>)}</ul>;
}
