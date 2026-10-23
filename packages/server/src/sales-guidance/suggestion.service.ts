import { Injectable,Logger,OnModuleInit,OnModuleDestroy } from '@nestjs/common';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { suggestionActionSchema,recordKindSchema,type RecordKind,type SalesSuggestion } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { ActivityAccessService } from '../activity/activity-access.service';
import { PersonalTodoService } from '../personal-todo/personal-todo.service';
import { ApiException } from '../http/api-exceptions';
import { salesFacts,pageFor,json,hash,type SalesScope } from './sales-facts';
import type { Prisma } from '../generated/prisma/client';
@Injectable()
export class SuggestionService implements OnModuleInit,OnModuleDestroy {
 private timer?:ReturnType<typeof setInterval>;private running=false;private cursor='';private logger=new Logger(SuggestionService.name);
 onModuleInit(){this.timer=setInterval(()=>void this.tick(),60000);this.timer.unref();}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 async tick(){if(this.running)return;this.running=true;try{
  const rows=await this.db.sdSalesSuggestion.findMany({where:{state:{not:'EXPIRED'},...(this.cursor?{id:{gt:this.cursor}}:{})},orderBy:{id:'asc'},take:20});const seen=new Set<string>();
  for(const row of rows){const key=`${row.applicationId}:${row.recipientId}:${row.subjectKey}`;if(seen.has(key))continue;seen.add(key);try{await this.list(row.systemCode,row.recipientId,row.opportunityId?'opportunity':'customer',row.opportunityId??row.customerId!);}catch(e){if(!(e instanceof ApiException&&[403,404].includes(e.getStatus())))this.logger.warn('建议刷新暂时失败，将自动重试');}}
  this.cursor=rows.length===20?rows.at(-1)!.id:'';
 }catch{this.logger.warn('建议调度暂时不可用');}finally{this.running=false;}}

 constructor(private readonly db:DatabaseService,private readonly access:ActivityAccessService,private readonly todos:PersonalTodoService){}
 private async scope(code:string,user:string,kind:string,id:string,write=false){
  recordKindSchema.parse(kind);const app=await this.access.scope(code,user,kind,id);
  if(!await this.access.allowed(code,user,pageFor(kind),'suggestion-view')||(write&&!await this.access.allowed(code,user,pageFor(kind),'suggestion-adopt')))throw new ApiException('FORBIDDEN',403,'无权使用销售建议');
  return app;
 }
 private async refresh(tx:Prisma.TransactionClient,scope:SalesScope,code:string,user:string,kind:RecordKind,id:string,canOpp:boolean){
  const facts=await salesFacts(tx,scope,code,kind,id,canOpp);const subjectKey=`${kind}:${id}`;
  const rows=await tx.sdSalesSuggestion.findMany({where:{applicationId:scope.id,tenantId:scope.tenantId,recipientId:user,subjectKey,state:{not:'EXPIRED'}}});
  for(const row of rows)if(!facts.candidates.some(c=>c.ruleCode===row.ruleCode&&c.cycleKey===(row.evidence as {triggerKey?:string}).triggerKey))await tx.sdSalesSuggestion.update({where:{id:row.id},data:{state:'EXPIRED',version:{increment:1}}});
  for(const c of facts.candidates){
   const where={applicationId:scope.id,recipientId:user,subjectKey,ruleCode:c.ruleCode};
   const row=rows.find(r=>r.ruleCode===c.ruleCode&&(r.evidence as {triggerKey?:string}).triggerKey===c.cycleKey);
   const evidence=json({reason:c.reason,basisAt:c.basisAt,triggerKey:c.cycleKey});
   if(!row){
    const last=await tx.sdSalesSuggestion.findFirst({where,orderBy:[{createdAt:'desc'},{id:'desc'}]});
    const cycleKey=hash({trigger:c.cycleKey,previous:last?.id??null});
    await tx.sdSalesSuggestion.create({data:{...where,cycleKey,tenantId:scope.tenantId,systemCode:code,customerId:kind==='customer'?id:null,opportunityId:kind==='opportunity'?id:null,title:c.title,inputHash:facts.inputHash,evidence}});
   } else if(row.inputHash!==facts.inputHash||(['IGNORED','SNOOZED'].includes(row.state)&&row.resumeAt&&row.resumeAt<=new Date())){
    const newState=(['IGNORED','SNOOZED'].includes(row.state)&&row.resumeAt&&row.resumeAt<=new Date())?'ACTIVE':row.state;
    await tx.sdSalesSuggestion.update({where:{id:row.id},data:{inputHash:facts.inputHash,evidence,state:newState,version:{increment:1}}});
   }
  }
  return facts;
 }
 async list(code:string,user:string,kindRaw:string,id:string){
  const kind=recordKindSchema.parse(kindRaw),scope=await this.scope(code,user,kind,id);
  const canOpp=kind==='opportunity'||await this.access.allowed(code,user,'opportunity-directory','view');const canAdopt=await this.access.allowed(code,user,pageFor(kind),'suggestion-adopt');
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sys_user WHERE id=${user}::uuid FOR UPDATE`;
   await this.refresh(tx,scope,code,user,kind,id,canOpp);
   const rows=await tx.sdSalesSuggestion.findMany({where:{applicationId:scope.id,tenantId:scope.tenantId,recipientId:user,subjectKey:`${kind}:${id}`},orderBy:[{createdAt:'desc'},{id:'desc'}],take:30});
   const todos=await tx.sysPersonalTodo.findMany({where:{applicationId:scope.id,ownerUserId:user,sourceSuggestionId:{in:rows.map(r=>r.id)}}});
   return {items:rows.map((r):SalesSuggestion=>{const e=r.evidence as {reason:string;basisAt:string};return{id:r.id,ruleCode:r.ruleCode,ruleVersion:r.ruleVersion,title:r.title,reason:e.reason,basisAt:e.basisAt,state:r.state as SalesSuggestion['state'],version:r.version,inputHash:r.inputHash,resumeAt:r.resumeAt?.toISOString()??null,todoId:todos.find(t=>t.sourceSuggestionId===r.id)?.id??null,canAct:canAdopt&&r.state==='ACTIVE'};}),canAdopt,basis:kind==='customer'?'基于当前可见记录':'基于当前商机及有效活动'};
  });
 }
 async action(code:string,user:string,id:string,raw:unknown){
  z.string().uuid().parse(id);const input=suggestionActionSchema.parse(raw);
  const row=await this.db.sdSalesSuggestion.findFirst({where:{id,systemCode:code,recipientId:user}});if(!row)throw new ApiException('NOT_FOUND',404,'建议不存在');
  const kind=row.opportunityId?'opportunity':'customer',record=row.opportunityId??row.customerId!;
  const scope=await this.scope(code,user,kind,record,true),canOpp=kind==='opportunity'||await this.access.allowed(code,user,'opportunity-directory','view');
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sys_user WHERE id=${user}::uuid FOR UPDATE`;
   const prior=await tx.sysPersonalTodo.findUnique({where:{sourceSuggestionId:id}});
   if(prior&&input.action==='ADOPT')return {todoId:prior.id};
   const current=await tx.sdSalesSuggestion.findFirstOrThrow({where:{id,applicationId:scope.id,recipientId:user}});
   const facts=await salesFacts(tx,scope,code,kind,record,canOpp);
   if(current.state!=='ACTIVE'||current.version!==input.version||facts.inputHash!==input.inputHash||!facts.candidates.some(c=>c.ruleCode===current.ruleCode&&c.cycleKey===(current.evidence as {triggerKey:string}).triggerKey))throw new ApiException('BAD_REQUEST',409,'建议或依据已变化，请刷新后重试');
   if(input.action==='ADOPT'){
    const todo=await this.todos.createFromSuggestion(tx,scope,user,current,{title:input.title??current.title,description:input.description,dueDate:input.dueDate});
    await tx.sdSalesSuggestion.update({where:{id},data:{state:'ADOPTED',version:{increment:1}}});
    await tx.sysAuditLog.create({data:{tenantId:scope.tenantId,applicationId:scope.id,actorUserId:user,requestId:input.requestId,resourceType:'sales-guidance',resourceId:record,actionCode:'suggestion.adopt',afterSnapshot:{title:'已采纳销售建议',reason:current.title,todoId:todo.id,kind,recipientId:user}}});
    return {todoId:todo.id};
   }
   const resumeAt=input.action==='IGNORE'?new Date(Date.now()+7*86400000):input.resumeAt?new Date(input.resumeAt):new Date(Date.now()+86400000);
   if(resumeAt<=new Date()||resumeAt.getTime()>Date.now()+30*86400000)throw new ApiException('BAD_REQUEST',400,'稍后提醒需在未来30天内');
   await tx.sdSalesSuggestion.update({where:{id},data:{state:input.action==='IGNORE'?'IGNORED':'SNOOZED',resumeAt,version:{increment:1}}});
   await tx.sysAuditLog.create({data:{tenantId:scope.tenantId,applicationId:scope.id,actorUserId:user,requestId:input.requestId,resourceType:'sales-suggestion',resourceId:id,actionCode:`suggestion.${input.action.toLowerCase()}`,afterSnapshot:{resumeAt:resumeAt.toISOString()}}});
   return {todoId:null};
  });
 }
 async recordTodos(code:string,user:string,kind:string,id:string){
  const scope=await this.scope(code,user,kind,id);
  const rows=await this.db.sysPersonalTodo.findMany({where:{applicationId:scope.id,tenantId:scope.tenantId,ownerUserId:user,sourceSuggestionId:{not:null},contextType:kind==='customer'?'CUSTOMER':'OPPORTUNITY',contextId:id},orderBy:{createdAt:'desc'},take:50});
  return rows.map(({id,title,description,status,result,dueDate,version})=>({id,title,description,status,result,dueDate:dueDate?.toISOString().slice(0,10)??null,version}));
 }
}
