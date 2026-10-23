import { deTaskActionSchema,deTaskSchema,type DeTaskAction } from '@forge-crm/contracts';
import { applyDigitalTaskAction,hydrateDigitalTask,taskAlert } from './digital-employee.service';

const base=deTaskSchema.parse({id:'DE-1',title:'质量预警',employee:'质量数字员工',domain:'质量',object:'批次A',risk:'HIGH',status:'PENDING',due:'今天',owner:'未分配',trigger:'规则命中',output:'处置建议',action:'人工处理',finding:'发现异常',evidence:[],plan:[],requiresApproval:false});

describe('digital employee task monitoring',()=>{
 it('assigns response and resolution deadlines by risk',()=>{
  const task=hydrateDigitalTask(base,new Date('2026-10-08T00:00:00.000Z'));
  expect(task.responseDueAt).toBe('2026-10-08T01:00:00.000Z');
  expect(task.resolutionDueAt).toBe('2026-10-08T08:00:00.000Z');
 });
 it('classifies due soon, overdue and paused tasks',()=>{
  const task=hydrateDigitalTask(base,new Date('2026-10-08T00:00:00.000Z'));
  expect(taskAlert(task,new Date('2026-10-08T00:30:00.000Z'))).toBe('DUE_SOON');
  expect(taskAlert(task,new Date('2026-10-08T01:01:00.000Z'))).toBe('OVERDUE');
  expect(taskAlert({...task,status:'ON_HOLD'},new Date('2026-10-08T03:00:00.000Z'))).toBe('NONE');
 });

 it('applies every task operation and records the resulting state immediately',()=>{
  const actor={id:'00000000-0000-4000-8000-000000000001',account:'admin'},owner={id:'00000000-0000-4000-8000-000000000002',displayName:'张三'};
  const input=(value:Omit<DeTaskAction,'version'>)=>deTaskActionSchema.parse({...value,version:1});
  let task=hydrateDigitalTask(base,new Date('2026-10-08T00:00:00.000Z'));
  task=applyDigitalTaskAction(task,input({action:'ASSIGN',ownerId:owner.id,queue:'质量队列'}),actor,owner,new Date('2026-10-08T00:01:00.000Z'));expect(task).toMatchObject({ownerId:owner.id,owner:'张三',queue:'质量队列'});
  task=applyDigitalTaskAction(task,input({action:'CLAIM'}),actor,null,new Date('2026-10-08T00:02:00.000Z'));expect(task.ownerId).toBe(actor.id);
  task=applyDigitalTaskAction(task,input({action:'STAR',starred:true}),actor,null,new Date('2026-10-08T00:03:00.000Z'));expect(task.starred).toBe(true);
  task=applyDigitalTaskAction(task,input({action:'SET_TAGS',tags:['重点','重点','客户']}),actor,null,new Date('2026-10-08T00:04:00.000Z'));expect(task.tags).toEqual(['重点','客户']);
  task=applyDigitalTaskAction(task,input({action:'ADD_NOTE',note:'已核对客户诉求'}),actor,null,new Date('2026-10-08T00:05:00.000Z'));expect(task.events[0]).toMatchObject({type:'ADD_NOTE',content:'已核对客户诉求'});
  task=applyDigitalTaskAction(task,input({action:'START'}),actor,null,new Date('2026-10-08T00:06:00.000Z'));expect(task.status).toBe('RUNNING');
  task=applyDigitalTaskAction(task,input({action:'HOLD',reason:'等待内部确认'}),actor,null,new Date('2026-10-08T00:07:00.000Z'));expect(task.status).toBe('ON_HOLD');
  task=applyDigitalTaskAction(task,input({action:'RESUME'}),actor,null,new Date('2026-10-08T00:08:00.000Z'));expect(task.status).toBe('RUNNING');
  task=applyDigitalTaskAction(task,input({action:'WAIT_EXTERNAL',note:'等待客户回复'}),actor,null,new Date('2026-10-08T00:09:00.000Z'));expect(task.status).toBe('WAITING_EXTERNAL');
  task=applyDigitalTaskAction(task,input({action:'RESUME'}),actor,null,new Date('2026-10-08T00:10:00.000Z'));expect(task.status).toBe('RUNNING');
  task=applyDigitalTaskAction(task,input({action:'COMPLETE',note:'处理完成',resolutionCode:'HANDLED'}),actor,null,new Date('2026-10-08T00:11:00.000Z'));expect(task).toMatchObject({status:'COMPLETED',resolutionCode:'HANDLED',resolutionNote:'处理完成'});
  task=applyDigitalTaskAction(task,input({action:'REOPEN',reason:'客户补充信息'}),actor,null,new Date('2026-10-08T00:12:00.000Z'));expect(task).toMatchObject({status:'PENDING',completedAt:null,resolutionCode:null});
  task=applyDigitalTaskAction(task,input({action:'IGNORE',reason:'无需处理'}),actor,null,new Date('2026-10-08T00:13:00.000Z'));expect(task).toMatchObject({status:'IGNORED',resolutionCode:'IGNORED',resolutionNote:'无需处理'});
 });

 it('rejects a lifecycle operation that is invalid for the current state',()=>{
  const task=hydrateDigitalTask({...base,status:'COMPLETED'},new Date('2026-10-08T00:00:00.000Z'));
  expect(()=>applyDigitalTaskAction(task,deTaskActionSchema.parse({action:'START',version:1}),{id:'00000000-0000-4000-8000-000000000001',account:'admin'})).toThrow('已结束任务只能关注、添加备注或重新打开');
 });
});
