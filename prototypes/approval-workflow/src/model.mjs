// Pure demo domain. No HTTP clients or production service dependencies.
export const STORAGE_KEY = 'forge.prototype.approval.v1';
export const USERS = [
  { id: 'applicant', name: '周然', role: '申请人', department: '华南销售部' },
  { id: 'manager', name: '陈经理', role: '部门经理', department: '华南销售部' },
  { id: 'director', name: '王总监', role: '二级部门负责人', department: '营销中心' },
  { id: 'finance', name: '李会计', role: '财务', department: '财务部' },
  { id: 'finance2', name: '孙会计', role: '财务', department: '财务部' },
  { id: 'hr', name: '赵HR', role: '部门HR负责人', department: '人力资源部' },
  { id: 'legal', name: '吴法务', role: '法务', department: '法务部' },
  { id: 'admin', name: '流程管理员', role: '管理员', department: '系统管理' },
];
export const nameOf = (id) => id === 'system' ? '系统' : USERS.find(u => u.id === id)?.name ?? id;
export const TYPES = { expense: '报销审批', leave: '请假审批', quote: '报价申请', sales: '销售订单审批', payment: '付款申请', incident: '异常事件复盘' };
export const uid = () => globalThis.crypto.randomUUID();
export const time = () => new Date().toLocaleString('zh-CN', { hour12: false });
export const money = n => Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clone = x => structuredClone(x);
export function defaults() {
  return Object.entries(TYPES).map(([type, name], i) => ({ id: type, code: `WF-${String(i + 1).padStart(3,'0')}`, name, version: 1, status: '已发布', threshold: 100000, manager: 'manager', finance: 'finance', hr: 'hr', director: 'director', firstLabel: '部门经理审批', publishedAt: '2026/10/05 09:00:00', description: type === 'incident' ? '调查与财务处置完成后关闭关联单据，复盘结案。' : '按申请组织及业务条件确定审批路径。', revisions: [{ version: 1, at: '2026/10/05 09:00:00', by: '流程管理员' }] }));
}
export function validateDefinition(d) {
  if (!d.name?.trim() || !d.firstLabel?.trim()) throw new Error('流程名称和审批节点名称不能为空');
  if (!Number.isFinite(Number(d.threshold)) || Number(d.threshold) < 0 || Number(d.threshold) > 1e9) throw new Error('金额阈值必须在0到10亿元之间');
  for (const k of ['manager','finance','hr','director']) if (!USERS.some(u => u.id === d[k] && u.id !== 'applicant' && u.id !== 'admin')) throw new Error('请为每个职责选择有效审批人');
  return true;
}
export function buildStages(d, doc) {
  validateDefinition(d);
  const stages = [{ id: 'manager', label: d.firstLabel, people: [d.manager], rule: '申请部门 · 部门经理' }];
  if (!['leave','incident'].includes(d.id) && doc.amount > Number(d.threshold)) stages.push({ id: 'director', label: '二级部门负责人审批', people: [d.director], rule: `金额 > ¥${money(d.threshold)} · 营销中心负责人` });
  if (d.id === 'leave') stages.push({ id: 'hr', label: '部门HR确认', people: [d.hr], rule: '申请部门 · HR负责人' });
  else if (d.id === 'quote') stages.push({ id: 'parallel', label: '财务与法务会审', people: [...new Set([d.finance, 'legal'])], rule: '并行会审 · 全部通过' });
  else stages.push({ id: 'finance', label: '财务复核', people: [d.finance], rule: '指定职责 · 财务负责人' });
  stages.push({ id: 'action', label: d.id === 'incident' ? '关闭关联单据' : d.id === 'sales' ? '销售订单审核生效' : d.id === 'payment' ? '形成待支付记录' : d.id === 'leave' ? '登记已批准休假' : d.id === 'quote' ? '报价内部审批生效' : '登记核定报销金额', people: [], rule: '已注册业务动作 · 模拟执行' });
  if (d.id === 'incident') stages.push({ id: 'review', label: '复盘确认', people: [d.manager], rule: '事件负责人确认' });
  return stages;
}
function history(i, user, action, note, node = i.stages[i.index]?.label ?? '申请') {
  i.history.push({ id: uid(), node, user, action, note, at: time() });
}
function notify(s, i, recipient, title) { s.notifications.unshift({ id: uid(), instance: i.id, recipient, title, at: time(), read: false }); }
function enter(s, i) {
  if (i.index >= i.stages.length) { i.status = '已通过'; i.pending = []; notify(s, i, i.applicant, `${i.code} 审批已通过`); return; }
  const node = i.stages[i.index];
  if (node.id === 'action') {
    i.attempts += 1;
    if (i.failAction && i.attempts === 1) {
      i.status = '业务执行失败'; i.pending = [];
      history(i, 'system', '执行失败', '关联单据存在未完成业务，演示模拟失败；请管理员核查后重试。');
      notify(s, i, 'admin', `${i.code} 业务动作执行失败`); return;
    }
    i.effects += 1;
    history(i, 'system', '执行成功', `${node.label}成功（模拟），执行编号 ${i.id.slice(0,8)}，未调用真实接口。`);
    i.index += 1; enter(s, i); return;
  }
  i.pending = [...node.people];
  i.pending.forEach(p => notify(s, i, p, `${i.title} · ${node.label}`));
}
export function submit(state, input, actor = 'applicant', priorId) {
  if (actor !== 'applicant') throw new Error('请切换申请人周然发起申请');
  const s = clone(state), d = s.definitions.find(d => d.id === input.type);
  if (!d || d.status !== '已发布') throw new Error('此流程尚未发布');
  if (!input.title?.trim()) throw new Error('请输入申请标题');
  const amount = Number(input.amount), days = Number(input.days ?? 1);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e9) throw new Error('金额应在0到10亿元之间');
  if (input.type === 'leave' && (!Number.isFinite(days) || days <= 0 || days > 365)) throw new Error('请假天数应大于0且不超过365');
  const prior = priorId ? s.instances.find(i => i.id === priorId) : null;
  if (priorId && (!prior || prior.status !== '已退回' || prior.nextId || prior.applicant !== actor)) throw new Error('该申请不能再次重提');
  const id = uid();
  const i = { id, code: prior?.code ?? `${{sales:'SO',quote:'QT',expense:'BX',leave:'QJ',payment:'FK',incident:'EV'}[input.type]}20261005${String(s.counter++).padStart(5,'0')}`, title: input.title.trim(), type: input.type, amount, days, description: input.description || '', customer: '云杉科技服务有限公司', applicant: actor, department: '华南销售部', version: d.version, snapshot: clone(d), stages: buildStages(d,{amount}), index: 0, pending: [], status: '审批中', history: [], cc: [], round: prior ? prior.round + 1 : 1, priorId: prior?.id, submittedAt: time(), failAction: input.type === 'incident', attempts: 0, effects: 0, nodeNote: '' };
  history(i, actor, prior ? '修改重提' : '提交申请', input.description || '提交单据审批', '申请');
  if (prior) prior.nextId = id;
  s.instances.unshift(i); enter(s,i); return { state:s, id };
}
export function canAct(i, actor) { return i.status === '审批中' && i.pending.includes(actor); }
export function canSee(i, actor) { return actor === 'admin' || actor === i.applicant || i.cc.includes(actor) || i.pending.includes(actor) || i.history.some(h => h.user === actor); }
export function transferTargets(actor) { return USERS.filter(u => u.id !== actor && u.role === USERS.find(x => x.id === actor)?.role); }
export function act(state, id, actor, action, { note = '', target = '' } = {}) {
  const s = clone(state), i = s.instances.find(i => i.id === id);
  if (!i) throw new Error('申请不存在');
  if (action === 'retry') {
    if (actor !== 'admin' || i.status !== '业务执行失败') throw new Error('仅管理员可重试失败动作');
    history(i, actor, '重试', note || '核查后重新执行业务动作'); i.status = '审批中'; enter(s,i); return s;
  }
  if (!canAct(i, actor)) throw new Error('您不是当前承办人，或任务已处理');
  if (['return','reject','transfer'].includes(action) && !note.trim()) throw new Error('请填写处理原因');
  if (action === 'approve') {
    history(i,actor,'同意',note.trim() || '同意'); i.pending = i.pending.filter(x => x !== actor);
    if (!i.pending.length) { i.index += 1; enter(s,i); }
  } else if (action === 'return' || action === 'reject') {
    history(i,actor,action === 'return' ? '退回申请人' : '驳回结束',note);
    i.pending = []; i.status = action === 'return' ? '已退回' : '已拒绝'; notify(s,i,i.applicant,`${i.code} ${i.status}`);
  } else if (action === 'transfer') {
    if (!transferTargets(actor).some(u => u.id === target)) throw new Error('接收人必须为同职责的有效人员');
    history(i,actor,'转交',`${note} → ${nameOf(target)}`); i.pending = i.pending.map(x => x === actor ? target : x); notify(s,i,target,`${i.code} 转交给您处理`);
  } else if (action === 'cc') {
    if (!USERS.some(u => u.id === target) || target === actor) throw new Error('请选择其他收件人');
    if (i.cc.includes(target)) throw new Error('已抄送此人');
    i.cc.push(target); history(i,actor,'抄送',`${nameOf(target)}：${note || '请阅知'}`); notify(s,i,target,`${i.code} 抄送给您`);
  } else throw new Error('不支持此操作');
  return s;
}
export function publish(state, draft, actor) {
  if (actor !== 'admin') throw new Error('仅管理员可发布');
  validateDefinition(draft); const s = clone(state), old = s.definitions.find(d => d.id === draft.id);
  const next = {...clone(draft), status:'已发布', threshold:Number(draft.threshold), version:old.version+1, publishedAt:time(), revisions:[...old.revisions,{version:old.version+1,at:time(),by:nameOf(actor)}]};
  s.definitions = s.definitions.map(d => d.id === draft.id ? next : d); delete s.drafts[draft.id]; return s;
}
export function seed() {
  let s = { schema:1, counter:1, definitions:defaults(), drafts:{}, instances:[], notifications:[] };
  const add = (type,title,amount,steps=[]) => {
    const made = submit(s,{type,title,amount,days:3,description:'演示申请：用于确认审批交互，所有数据均为模拟。'}); s=made.state;
    for(const actor of steps) s=act(s,made.id,actor,'approve');
    return made.id;
  };
  add('expense','华南客户拜访差旅报销',80000);
  add('expense','年度渠道活动费用报销',120000);
  add('leave','国庆后调休申请 · 3天',0,['manager']);
  add('sales','云杉科技 · 智能控制板采购订单',86000);
  add('quote','星海项目 · 非标报价申请',180000,['manager','director']);
  add('incident','交付异常复盘 · 关闭关联订单',26000,['manager','finance']);
  add('payment','供应商首批货款申请',65000,['manager']);
  for(let n=0;n<18;n++) add('sales',`渠道订单审批 · 第${n+1}批`,18000+n*500);
  const done=add('expense','深圳展会物料费用',6000,['manager','finance']);
  const returned=add('expense','研发交流差旅费用',4800); s=act(s,returned,'manager','return',{note:'请补充费用用途与发票说明'});
  const rejected=add('payment','提前支付申请',52000);s=act(s,rejected,'manager','reject',{note:'合同付款条件尚未满足'});
  // Place representative scenarios first while retaining enough tasks to exercise pagination.
  s.instances.sort((a,b)=>Number(a.code.slice(-5))-Number(b.code.slice(-5)));
  void done; return s;
}
