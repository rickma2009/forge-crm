export const people=['周然（我）','陈晓峰','林雨晴','刘志远'];
export const objectTypes=[['quotation','报价单','QT'],['sales-order','销售订单','SO'],['sales-outbound','销售出货','OB'],['inbound','手工入库','IB'],['purchase-order','采购订单','PO'],['purchase-receipt','采购入库','IB']];
export const statusNames={PENDING:'待处理',RUNNING:'处理中',ON_HOLD:'暂挂',WAITING_EXTERNAL:'等待外部',COMPLETED:'已完成',IGNORED:'已忽略',APPROVED:'已同意',REJECTED:'已驳回',RETURNED:'已退回',TRANSFERRED:'已转交',DRAFT:'草稿',SUBMITTED:'已提交审核',POSTED:'已过账',REVERSED:'已冲销',CONFIRMED:'已确认',OBSERVE:'观察中',CLOSED:'已关闭',SENT:'已发送',UNKNOWN:'结果待核实',FAILED:'发送失败',NONE:'未回复'};
const customers=['晨光智显','远景电子','华辰科技','启明工业','云杉科技','海岳制造'];
const items=['智能会议控制板','电源模组','触控显示组件','铝合金结构件','连接线束','散热模块'];
const at=(n)=>`2026-10-${String(11-n%8).padStart(2,'0')} ${String(9+n%8).padStart(2,'0')}:30`;
export function createSeed(){
 const docs=objectTypes.flatMap(([type,label,prefix],k)=>Array.from({length:36},(_,i)=>({id:`${type}-${i+1}`,type,label,no:`${prefix}202610${String(11-i%8).padStart(2,'0')}${String(k*100+i+1).padStart(5,'0')}`,party:type.startsWith('purchase')?`${customers[i%6]}供应链（演示）`:`${customers[i%6]}（演示）`,status:['DRAFT','SUBMITTED','APPROVED','POSTED'][i%4],date:at(i).slice(0,10),amount:12000+i*2780,discount:0.95,tax:0.13,warehouse:i%2?'成品仓':'原料仓',legal:'演示科技有限公司',owner:people[i%4],remark:'此为独立原型数据，不对应真实业务单据。',source:`${type==='purchase-receipt'?'PO':'SO'}202610110${String(i+1).padStart(4,'0')}`,history:[{action:'创建单据',actor:people[i%4],at:at(i),note:'演示数据'}],lines:Array.from({length:3+i%5},(_,j)=>({id:`${type}-${i}-line-${j}`,no:j+1,code:`001.002.${String(j+1).padStart(7,'0')}`,name:items[j%6],qty:10+j*5,price:280+j*110,batch:j%2?'':'DEMO-202610-A',received:i%4===3?10:0}))})));
 const approvals=Array.from({length:32},(_,i)=>({id:`a${i+1}`,docId:`sales-order-${i+1}`,title:`${customers[i%6]}年度设备采购订单审批`,status:i<24?'PENDING':i%2?'APPROVED':'REJECTED',owner:people[0],applicant:people[1+i%3],amount:12000+i*2780,version:1,date:at(i),node:'部门负责人',history:[{action:'提交审批',actor:people[1+i%3],at:at(i),note:'请审核订单条款及交付计划'}]}));
 const mails=Array.from({length:36},(_,i)=>({id:`m${i+1}`,title:[`MAXHUB显示模组异常，请协助质量分析`,`关于本周订单交付时间的确认`,`采购价目表更新及确认`,`应收对账单核对`,`售后服务处理进度咨询`,`新项目方案资料补充`][i%6],sender:`${['客户质量部','客户采购部','供应商销售部','财务对账中心','售后联系人','项目负责人'][i%6]} <demo${i+1}@example.com>`,to:'assistant-demo@example.com',party:customers[i%6],status:['PENDING','RUNNING','ON_HOLD','WAITING_EXTERNAL','COMPLETED','PENDING'][i%6],category:i%6===0?'质量与客诉':i%6===1?'交付与物流':'一般邮件',priority:i%6===0?'紧急':i%3===0?'高':'普通',owner:people[0],queue:i%6===0?'质量与售后队列':'综合队列',version:1,date:at(i),due:'2026-10-11 18:00',overdue:i%5===0,star:i%7===0,tags:[],note:'',qualityRecord:'',replyState:'NONE',draft:null,sent:null,resumeAt:'',body:`您好：\n\n${customers[i%6]}希望核实本次订单的${i%6===0?'显示模组异常及技术处理方案':'交付与服务安排'}。请确认负责人、预计完成时间与后续行动。\n\n订单参考：SO202610110000${i%9+1}。附件提供了相关资料，请查收。\n\n感谢配合。\n（以上为模拟邮件，所有地址为example.com）`,history:[{action:'邮件归类',actor:'邮件数字员工（模拟）',at:at(i),note:i%6===0?'质量与客诉：须关联质量记录并回复':'一般业务待办'}]}));
 const opinions=Array.from({length:24},(_,i)=>({id:`o${i+1}`,title:`MAXHUB ${['触控异常投诉','维修周期质量反馈','显示组件售后争议','会议设备质量评价'][i%4]}`,summary:'发现品牌与投诉/质量关键词同时命中的模拟信息，需核验来源、影响和处理结论。',source:['公开论坛','新闻站点','售后社区'][i%3],sentiment:'负面',risk:['高','中','低'][i%3],status:['PENDING','RUNNING','OBSERVE','CLOSED'][i%4],date:at(i),owner:people[i%4],history:[]}));
 const notifications=Array.from({length:48},(_,i)=>({id:`n${i+1}`,kind:i<20?'审批':i<40?'邮件':'预警',target:i<20?`approval/a${i+1}`:i<40?`mail/m${i-19}`:`opinion/o${i-39}`,title:i<20?approvals[i].title:i<40?mails[i-20].title:opinions[i-40].title,date:at(i),read:i>=30}));
 const suppliers=Array.from({length:24},(_,i)=>({id:`s${i+1}`,code:`S${String(i+1).padStart(7,'0')}`,name:`${customers[i%6]}${['电子','结构件','包装','设备'][i%4]}供应商（演示）`,contact:people[i%4],phone:'13800000000',status:i===23?'停用':'启用',lead:7+i%10,term:30,category:['电子','机械','包装','服务'][i%4]}));
 const customersData=Array.from({length:24},(_,i)=>({id:`c${i+1}`,code:`C${String(i+1).padStart(7,'0')}`,name:`${customers[i%6]}${String(i+1).padStart(2,'0')}（演示）`,owner:people[i%4],phone:'13800000000',address:'广东省广州市示范园区',contact:people[(i+1)%4],history:[{action:'电话跟进',actor:people[i%4],at:at(i),note:'已沟通项目交期，等待客户反馈'}]}));
 const opportunities=Array.from({length:24},(_,i)=>({id:`op${i+1}`,code:`OP202610110${String(i+1).padStart(4,'0')}`,name:`${customers[i%6]}会议升级项目${i+1}`,customer:customersData[i].name,stage:['初始线索','需求确认','方案报价','商务谈判'][i%4],probability:[20,45,65,80][i%4],amount:88000+i*2000,owner:people[i%4],signDate:'2026-11-15',history:[{action:'项目跟进',actor:people[i%4],at:at(i),note:'确认交期和技术要求'}]}));
 const inventory=Array.from({length:28},(_,i)=>({id:`stock${i+1}`,code:`001.002.${String(i+1).padStart(7,'0')}`,name:`${items[i%6]} ${i+1}`,large:'电子材料',middle:i%2?'模组':'组件',small:'标准件',rows:Array.from({length:3},(_,j)=>({legal:'演示科技有限公司',warehouse:j%2?'成品仓':'原料仓',batch:i%2?`DEMO-202610-${j+1}`:'',qty:100+i*10+j*20,cost:12000+i*500+j*2000}))}));
 for(const a of approvals){const d=docs.find(d=>d.id===a.docId);d.status=a.status==='PENDING'?'SUBMITTED':a.status==='APPROVED'?'APPROVED':'DRAFT';}
 for(const d of docs){d.amount=d.lines.reduce((n,l)=>n+l.qty*l.price,0);if(['quotation','sales-order','purchase-order'].includes(d.type)&&d.status==='POSTED')d.status='APPROVED';}
 for(const a of approvals)a.amount=docs.find(d=>d.id===a.docId).amount;
 return {docs,approvals,mails,opinions,notifications,suppliers,customers:customersData,opportunities,inventory,log:[],prefs:{defaultTask:'approval'},session:{logged:false,role:'operator'},revision:0};
}
export function counts(s){return {approvals:s.approvals.filter(x=>x.status==='PENDING'&&x.owner===people[0]).length,mails:s.mails.filter(x=>!['COMPLETED','IGNORED'].includes(x.status)&&x.owner===people[0]).length,overdue:s.mails.filter(x=>x.overdue&&!['COMPLETED','IGNORED'].includes(x.status)).length,alerts:s.opinions.filter(x=>x.risk==='高'&&x.status!=='CLOSED').length,unread:s.notifications.filter(x=>!x.read).length};}
function find(list,id){const x=list.find(x=>x.id===id);if(!x)throw new Error('记录不存在');return x;}
export function transition(original,e){const s=structuredClone(original);if(!s.session.logged&&e.type!=='login')throw new Error('请先登录演示账号');if(s.session.role==='viewer'&&['approval','mail','draft','send','verify-send','quality','follow','opinion','basic'].includes(e.type))throw new Error('当前为只读体验账号，无处理权限');const now='2026-10-11 10:36';let row;
 if(e.type==='login')s.session={logged:true,role:e.role||'operator'};
 else if(e.type==='logout')s.session.logged=false;
 else if(e.type==='prefs')s.prefs.defaultTask=e.value;
 else if(e.type==='read')find(s.notifications,e.id).read=true;
 else if(e.type==='approval'){
  row=find(s.approvals,e.id);if(row.status!=='PENDING'||row.owner!==people[0])throw new Error('该审批已处理或已转交，不能再次执行');if(e.version!==row.version)throw new Error('记录已变化，请刷新');if(e.action!=='APPROVED'&&!e.note?.trim())throw new Error('请填写处理原因');if(e.action==='TRANSFERRED'&&!e.target)throw new Error('请选择接收人');row.status=e.action;if(e.target)row.owner=e.target;row.version++;row.history.push({action:statusNames[e.action],actor:people[0],at:now,note:e.note||'同意'});if(['APPROVED','REJECTED'].includes(e.action)){const d=find(s.docs,row.docId);d.status=e.action==='APPROVED'?'APPROVED':'DRAFT';d.history.push(row.history.at(-1));}
 }else if(e.type==='draft'){row=find(s.mails,e.id);row.draft={...e.draft};}
 else if(e.type==='send'){
  row=find(s.mails,e.id);if(row.replyState==='SENT')throw new Error('此回复已经发送，不重复发送');if(row.replyState==='UNKNOWN')throw new Error('请先核实上次发送结果');if(!e.draft?.to?.includes('@')||!e.draft?.subject?.trim()||!e.draft?.body?.trim())throw new Error('请填写有效收件人、主题和正文');row.draft={...e.draft};row.replyState=e.outcome==='unknown'?'UNKNOWN':e.outcome==='failed'?'FAILED':'SENT';if(row.replyState==='SENT')row.sent={...e.draft,at:now};row.history.push({action:row.replyState==='SENT'?'模拟发送成功':statusNames[row.replyState],actor:people[0],at:now,note:'不连接真实邮箱'});row.version++;
 }else if(e.type==='verify-send'){row=find(s.mails,e.id);if(row.replyState!=='UNKNOWN')throw new Error('没有需要核实的发送');row.replyState='SENT';row.sent={...row.draft,at:now};row.history.push({action:'发送结果核实',actor:people[0],at:now,note:'模拟服务确认已经发出，未重复发信'});}
 else if(e.type==='quality'){row=find(s.mails,e.id);if(!e.note?.trim())throw new Error('请填写质量记录编号');row.qualityRecord=e.note;}
 else if(e.type==='mail'){
  row=find(s.mails,e.id);if(e.version!==row.version)throw new Error('记录已变化，请刷新');const terminal=['COMPLETED','IGNORED'].includes(row.status);if(terminal&&!['star','reopen','note'].includes(e.action))throw new Error('任务已结束，请先重新打开');if(['note','hold','wait','complete','ignore'].includes(e.action)&&!e.note?.trim())throw new Error('请填写处理说明');
  if(e.action==='star')row.star=!row.star;
  else if(e.action==='note')row.note=e.note;
  else if(e.action==='hold'){row.status='ON_HOLD';row.resumeAt=e.resumeAt||'手工恢复';}
  else if(e.action==='resume'){if(!['ON_HOLD','WAITING_EXTERNAL'].includes(row.status))throw new Error('当前任务无需恢复');row.status='RUNNING';row.resumeAt='';}
  else if(e.action==='wait')row.status='WAITING_EXTERNAL';
  else if(e.action==='start')row.status='RUNNING';
  else if(e.action==='complete'){if(row.category==='质量与客诉'&&(!row.qualityRecord||row.replyState!=='SENT'))throw new Error('质量与客诉任务必须关联质量记录并完成回复');row.status='COMPLETED';}
  else if(e.action==='ignore')row.status='IGNORED';
  else if(e.action==='reopen')row.status='RUNNING';
  else if(e.action==='assign'){if(!e.target)throw new Error('请选择负责人');row.owner=e.target;}
  else if(e.action==='tags')row.tags=e.tags||[];
  else throw new Error('不支持的任务动作');row.version++;row.history.push({action:{star:row.star?'关注':'取消关注',note:'添加备注',hold:'暂挂',resume:'恢复',wait:'等待外部',start:'开始处理',complete:'完成',ignore:'忽略',reopen:'重新打开',assign:'分派',tags:'更新标签'}[e.action],actor:people[0],at:now,note:e.note||e.target||'状态已更新'});
 }else if(e.type==='follow'){row=find(e.kind==='customer'?s.customers:s.opportunities,e.id);if(!e.note?.trim())throw new Error('请填写跟进内容');row.history.push({action:e.action||'电话跟进',actor:people[0],at:now,note:e.note,next:e.next||''});}
 else if(e.type==='opinion'){row=find(s.opinions,e.id);if(['CLOSED','IGNORED'].includes(e.status)&&!e.note?.trim())throw new Error('请填写结论');row.status=e.status;row.history.push({action:statusNames[e.status],actor:people[0],at:now,note:e.note||'已开始处理'});}
 else if(e.type==='basic'){row=find(s.docs,e.id);if(row.status!=='SUBMITTED')throw new Error('只有已提交单据可以审核');row.status=e.approve?'APPROVED':'DRAFT';row.history.push({action:e.approve?'基础审核通过':'基础审核驳回',actor:people[0],at:now,note:e.note||'P1基础审核演示；未执行过账'});}
 else throw new Error('不支持的演示动作');s.revision++;s.log.unshift({action:e.type,at:now,note:e.action||e.status||'模拟操作已完成'});return s;
}
