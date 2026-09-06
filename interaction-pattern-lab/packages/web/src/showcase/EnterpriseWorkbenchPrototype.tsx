import { useMemo, useState, type FormEvent } from 'react';
import {
  IconAlertTriangle,
  IconBell,
  IconBolt,
  IconCalendarEvent,
  IconCheck,
  IconChecklist,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconFileInvoice,
  IconFilter,
  IconLink,
  IconMessageCircle,
  IconPackage,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconUser,
} from '@tabler/icons-react';
import './enterprise-workbench.css';

type WorkType = 'approval' | 'follow-up' | 'exception' | 'todo';
type WorkState = 'pending' | 'processing' | 'completed';

interface WorkItem {
  id: string;
  type: WorkType;
  title: string;
  object: string;
  reference: string;
  priority: '紧急' | '高' | '普通';
  due: string;
  owner: string;
  state: WorkState;
  summary: string;
  facts: Array<[string, string]>;
  checkpoints: string[];
  activity: Array<{ time: string; actor: string; text: string }>;
}

const initialItems: WorkItem[] = [
  {
    id: 'approval-order', type: 'approval', title: '销售订单审批', object: '广州精工设备有限公司', reference: 'SO-20260905-018', priority: '紧急', due: '今天 10:30', owner: '陈思远', state: 'pending',
    summary: '订单含税金额 ¥127,803.00；毛利率较标准报价低 2.4%，需要销售负责人确认折扣原因。',
    facts: [['订单金额', '¥127,803.00'], ['要求交付', '2026-09-20'], ['结算条款', '月结 30 天'], ['明细行', '4 项']],
    checkpoints: ['客户信用额度充足', '交付日期满足当前产能', '折扣低于标准报价 2.4%'],
    activity: [{ time: '09:18', actor: '陈思远', text: '提交订单并补充折扣说明' }, { time: '08:45', actor: '系统', text: '完成库存与信用预检查' }],
  },
  {
    id: 'inventory-review', type: 'exception', title: '华南成品仓库存差异复核', object: '精密主轴组件 / PRD-1001', reference: 'INV-CHECK-0921', priority: '高', due: '今天 14:00', owner: '周宁', state: 'pending',
    summary: '盘点数量与系统账面相差 2 台。需要核对昨日调拨记录并决定调整或继续追查。',
    facts: [['账面库存', '38 台'], ['盘点库存', '36 台'], ['差异', '-2 台'], ['最近调拨', 'TR-8892']],
    checkpoints: ['调拨单 TR-8892 已发出未签收', '盘点批次由周宁复核', '库存调整需要主管审批'],
    activity: [{ time: '09:06', actor: '周宁', text: '上传复盘照片与盘点表' }, { time: '昨天', actor: '系统', text: '差异超过阈值，创建复核任务' }],
  },
  {
    id: 'customer-followup', type: 'follow-up', title: '重点客户回访', object: '深圳拓维自动化有限公司', reference: 'CUS-000328', priority: '普通', due: '明天 11:00', owner: '我', state: 'processing',
    summary: '客户近 90 天采购额下降 18%，上次沟通提到新项目延期，需要确认下一季度需求。',
    facts: [['客户等级', 'A'], ['近 90 天销售额', '¥680,000'], ['最近联系', '12 天前'], ['负责人', '陈思远']],
    checkpoints: ['确认新项目排期', '更新预计成交月份', '记录竞争对手信息'],
    activity: [{ time: '昨天', actor: '陈思远', text: '整理最近报价与跟进记录' }],
  },
  {
    id: 'supplier-todo', type: 'todo', title: '补充供应商年度评估材料', object: '华东精密制造有限公司', reference: 'TODO-0917', priority: '普通', due: '周五 17:00', owner: '我', state: 'pending',
    summary: '个人待办，不改变供应商业务状态。完成后只关闭本人的行动提醒。',
    facts: [['待办来源', '个人创建'], ['关联对象', '供应商档案'], ['共享范围', '仅自己'], ['提醒', '周五 15:00']],
    checkpoints: ['上传质量评分', '补充交付达成率', '发送给采购主管'],
    activity: [{ time: '周一', actor: '我', text: '创建个人待办' }],
  },
];

const typeLabels: Record<WorkType, string> = { approval: '待审批', 'follow-up': '待跟进', exception: '异常', todo: '个人待办' };

export function EnterpriseWorkbenchPrototype({ variant }: { variant: 'personal' | 'master-detail' }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<'all' | WorkType>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialItems[0].id);
  const [detailTab, setDetailTab] = useState<'summary' | 'process' | 'collaboration'>('summary');
  const [feedback, setFeedback] = useState('');
  const [newTodo, setNewTodo] = useState('');

  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const normalized = query.trim().toLocaleLowerCase();
    return matchesFilter && (!normalized || `${item.title} ${item.object} ${item.reference}`.toLocaleLowerCase().includes(normalized));
  }), [filter, items, query]);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const pending = items.filter((item) => item.state !== 'completed').length;
  const dueToday = items.filter((item) => item.state !== 'completed' && item.due.startsWith('今天')).length;
  const exceptions = items.filter((item) => item.state !== 'completed' && item.type === 'exception').length;
  const completed = items.filter((item) => item.state === 'completed').length + 24;

  const completeSelected = () => {
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, state: 'completed' } : item));
    setFeedback(`已完成：${selected.title}`);
  };
  const startSelected = () => {
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, state: 'processing' } : item));
    setFeedback(`已开始处理：${selected.title}`);
  };
  const addTodo = (event: FormEvent) => {
    event.preventDefault();
    const title = newTodo.trim();
    if (!title) { setFeedback('请输入待办标题'); return; }
    const item: WorkItem = { id: `personal-${items.length + 1}`, type: 'todo', title, object: '未关联业务对象', reference: `TODO-${String(items.length + 1).padStart(4, '0')}`, priority: '普通', due: '今天 18:00', owner: '我', state: 'pending', summary: '这是个人行动提醒，不会直接改变任何业务对象状态。', facts: [['待办来源', '个人创建'], ['共享范围', '仅自己'], ['业务状态影响', '无'], ['默认提醒', '今天 17:30']], checkpoints: ['补充关联对象（可选）', '完成后关闭个人待办'], activity: [{ time: '刚刚', actor: '我', text: '创建个人待办' }] };
    setItems((current) => [item, ...current]); setSelectedId(item.id); setNewTodo(''); setFeedback(`已创建个人待办：${title}`);
  };

  return <div className="ew-page" data-variant={variant}>
    <WorkbenchHeader variant={variant} pending={pending} />
    {variant === 'personal' && <>
      <section className="ew-metrics" aria-label="工作指标">
        <Metric icon={<IconChecklist />} label="待我处理" value={pending} note="来自当前工作队列" tone="blue" />
        <Metric icon={<IconClock />} label="今天到期" value={dueToday} note="其中 1 项紧急" tone="orange" />
        <Metric icon={<IconAlertTriangle />} label="业务预警" value={exceptions} note="规则异常，不等于待办" tone="red" />
        <Metric icon={<IconCircleCheck />} label="本周完成" value={completed} note="比上周同期 +6" tone="green" />
      </section>
      <section className="ew-overview-grid">
        <section className="ew-card ew-work-list-card">
          <CardTitle icon={<IconChecklist />} title="我的工作" meta={`${visibleItems.length} 项`} />
          <TaskToolbar query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} />
          <TaskList items={visibleItems} selectedId={selectedId} onSelect={setSelectedId} />
        </section>
        <aside className="ew-overview-side">
          <ReminderPanel onFeedback={setFeedback} />
          <section className="ew-card ew-quick-card"><CardTitle icon={<IconBolt />} title="快捷开始" meta="常用操作" /><div className="ew-quick-grid"><Quick icon={<IconFileInvoice />} label="新建销售订单" /><Quick icon={<IconPackage />} label="库存查询" /><Quick icon={<IconUser />} label="新增客户" /><Quick icon={<IconChecklist />} label="发起审批" /></div></section>
          <form className="ew-card ew-new-todo" onSubmit={addTodo}><CardTitle icon={<IconPlus />} title="记一个待办" meta="只影响个人队列" /><label><span>待办标题</span><div><input aria-label="新待办标题" value={newTodo} onChange={(event) => setNewTodo(event.target.value)} placeholder="例如：确认下周交付计划" /><button type="submit" aria-label="添加个人待办"><IconPlus size={16} /></button></div></label></form>
        </aside>
      </section>
      <section className="ew-selected-preview ew-card"><div><span>当前选择</span><strong>{selected.title}</strong><small>{selected.object} · {selected.reference}</small></div><button type="button" onClick={startSelected}>进入处理 <IconChevronRight size={15} /></button></section>
    </>}
    {variant === 'master-detail' && <section className="ew-master-layout">
      <aside className="ew-master ew-card">
        <CardTitle icon={<IconChecklist />} title="工作队列" meta={`${visibleItems.length} / ${items.length}`} />
        <TaskToolbar query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} compact />
        <TaskList items={visibleItems} selectedId={selected.id} onSelect={setSelectedId} />
      </aside>
      <main className="ew-detail ew-card">
        <header className="ew-detail-head"><div><span>{typeLabels[selected.type]} · {selected.reference}</span><h2>{selected.title}</h2><p>{selected.object}</p></div><div className="ew-detail-actions"><button type="button" onClick={startSelected}><IconPlayerPlay size={15} />开始处理</button><button className="is-primary" type="button" onClick={completeSelected}><IconCheck size={15} />标记完成</button></div></header>
        <nav className="ew-detail-tabs" aria-label="任务详情视图">{([['summary', '摘要'], ['process', '流程'], ['collaboration', '协作']] as const).map(([id, label]) => <button key={id} type="button" aria-selected={detailTab === id} onClick={() => setDetailTab(id)}>{label}</button>)}</nav>
        {detailTab === 'summary' && <div className="ew-detail-body"><p className="ew-summary">{selected.summary}</p><dl className="ew-facts">{selected.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><section className="ew-checkpoints"><h3>处理检查点</h3>{selected.checkpoints.map((line, index) => <p key={line}><span data-ok={index < 2}><IconCheck size={13} /></span>{line}</p>)}</section></div>}
        {detailTab === 'process' && <Timeline item={selected} />}
        {detailTab === 'collaboration' && <div className="ew-collaboration"><IconMessageCircle size={30} /><h3>在对象上下文中协作</h3><p>评论、@成员和附件应绑定当前对象；本原型只演示入口，不发送真实消息。</p><button type="button" onClick={() => setFeedback('协作入口为演示状态，未发送消息')}>添加评论</button></div>}
      </main>
      <aside className="ew-context">
        <section className="ew-card ew-context-card"><CardTitle icon={<IconBell />} title="行动上下文" meta="随选择切换" /><div className="ew-context-block"><span>负责人</span><strong><IconUser size={14} />{selected.owner}</strong></div><div className="ew-context-block"><span>截止时间</span><strong className={selected.priority === '紧急' ? 'is-urgent' : ''}><IconClock size={14} />{selected.due}</strong></div><button type="button" className="ew-remind" onClick={() => setFeedback(`已将“${selected.title}”延后提醒 30 分钟`)}><IconBell size={15} />30 分钟后提醒</button></section>
        <section className="ew-card ew-context-card"><CardTitle icon={<IconLink />} title="关联信息" meta="不替代对象详情" /><a href="#showcase/templates/edit-form"><IconFileInvoice size={15} />打开关联业务对象<IconChevronRight size={14} /></a><a href="#showcase/system/logs"><IconRefresh size={15} />查看操作记录<IconChevronRight size={14} /></a></section>
        <Timeline item={selected} compact />
      </aside>
    </section>}
    <p className="ew-feedback" role="status" aria-live="polite">{feedback || '演示数据仅保留在当前浏览器会话'}</p>
  </div>;
}

function WorkbenchHeader({ variant, pending }: { variant: 'personal' | 'master-detail'; pending: number }) {
  return <header className="ew-header"><div><p>{variant === 'personal' ? 'PERSONAL OPERATIONS' : 'FOCUS WORKSPACE'}</p><h1>{variant === 'personal' ? '我的工作台' : '主从任务工作区'}</h1><span>{variant === 'personal' ? '早上好，陈思远。今天优先完成到期任务与业务异常。' : '保留工作队列上下文，集中查看并处理当前业务对象。'}</span></div><div className="ew-date"><IconCalendarEvent size={18} /><span>2026 年 9 月 5 日<small>星期六 · {pending} 项待处理</small></span></div></header>;
}

function Metric({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: number; note: string; tone: string }) { return <article className="ew-card ew-metric" data-tone={tone}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>; }
function CardTitle({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) { return <header className="ew-card-title"><div>{icon}<strong>{title}</strong></div><span>{meta}</span></header>; }

function TaskToolbar({ query, filter, onQuery, onFilter, compact = false }: { query: string; filter: 'all' | WorkType; onQuery: (value: string) => void; onFilter: (value: 'all' | WorkType) => void; compact?: boolean }) {
  const compactLabels: Record<'all' | WorkType, string> = { all: '全部', approval: '审批', 'follow-up': '跟进', exception: '异常', todo: '待办' };
  return <div className="ew-task-tools"><label><IconSearch size={15} /><input type="search" aria-label="搜索工作队列" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="搜索标题、对象或编号" /></label><div className="ew-filters" aria-label="工作队列筛选"><IconFilter size={14} />{([['all', '全部'], ['approval', '待审批'], ['follow-up', '待跟进'], ['exception', '异常']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} aria-label={id === 'approval' ? '只看待审批' : `只看${label}`} onClick={() => onFilter(id)}>{compact ? compactLabels[id] : label}</button>)}</div></div>;
}

function TaskList({ items, selectedId, onSelect }: { items: WorkItem[]; selectedId: string; onSelect: (id: string) => void }) {
  if (!items.length) return <div className="ew-empty"><IconSearch size={24} /><strong>没有匹配的工作项</strong><span>调整筛选或搜索条件后重试。</span></div>;
  return <div className="ew-task-list">{items.map((item) => <button key={item.id} type="button" className="ew-task" aria-current={item.id === selectedId} aria-label={`${item.title}，${item.object}`} onClick={() => onSelect(item.id)}><span className="ew-task-icon" data-type={item.type}>{item.type === 'approval' ? <IconFileInvoice /> : item.type === 'exception' ? <IconAlertTriangle /> : item.type === 'follow-up' ? <IconUser /> : <IconChecklist />}</span><span className="ew-task-copy"><strong>{item.title}<i data-priority={item.priority}>{item.priority}</i></strong><small>{item.object}</small><em>{item.reference} · {item.due}</em></span><IconChevronRight className="ew-task-chevron" size={15} /></button>)}</div>;
}

function ReminderPanel({ onFeedback }: { onFeedback: (message: string) => void }) { return <section className="ew-card ew-reminders"><CardTitle icon={<IconCalendarEvent />} title="日程与提醒" meta="今天" /><article><time>10:30</time><div><strong>销售订单折扣审批</strong><span>距离截止还有 48 分钟</span></div><button type="button" onClick={() => onFeedback('销售订单审批已稍后提醒 15 分钟')}>稍后提醒</button></article><article><time>14:00</time><div><strong>库存差异复核</strong><span>华南成品仓 · 线上</span></div><button type="button" onClick={() => onFeedback('已打开库存差异复核上下文')}>查看</button></article><article><time>16:30</time><div><strong>周交付协调会</strong><span>会议室 B · 6 人</span></div><button type="button" onClick={() => onFeedback('已打开会议详情演示')}>详情</button></article></section>; }
function Quick({ icon, label }: { icon: React.ReactNode; label: string }) { return <button type="button">{icon}<span>{label}</span><IconChevronRight size={14} /></button>; }
function Timeline({ item, compact = false }: { item: WorkItem; compact?: boolean }) { return <section className={`ew-timeline ew-card${compact ? ' is-compact' : ''}`}><CardTitle icon={<IconRefresh />} title="最近动态" meta={compact ? '2 条' : item.reference} />{item.activity.map((entry) => <article key={`${entry.time}-${entry.text}`}><span /><div><strong>{entry.actor}</strong><p>{entry.text}</p><time>{entry.time}</time></div></article>)}</section>; }
