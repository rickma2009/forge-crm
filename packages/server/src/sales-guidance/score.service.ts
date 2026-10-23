import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { scoreRuleConfigSchema,scoreRuleWriteSchema,scoreRuleStateSchema,scoreOverrideSchema,type PriorityScore,type ScoreDimension } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { ActivityAccessService } from '../activity/activity-access.service';
import { ApiException } from '../http/api-exceptions';
import { salesFacts,scoreDimensions,hash,json,isOpen,type SalesScope } from './sales-facts';
import type { Prisma } from '../generated/prisma/client';
@Injectable()
export class ScoreService implements OnModuleInit,OnModuleDestroy {
 private timer?:ReturnType<typeof setInterval>;private running=false;private cursor='';private logger=new Logger(ScoreService.name);
 constructor(private readonly db:DatabaseService,private readonly access:ActivityAccessService){}
 onModuleInit(){this.timer=setInterval(()=>void this.tick(),60000);this.timer.unref();}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 async tick(){if(this.running)return;this.running=true;try{
  const rows=await this.db.sdOpp.findMany({where:{status:'ACTIVE',businessStatus:{in:['INITIAL','FOLLOWING']},...(this.cursor?{id:{gt:this.cursor}}:{})},orderBy:{id:'asc'},take:30});
  for(const row of rows){try{await this.calculate({id:row.applicationId,tenantId:row.tenantId},row.systemCode,row.id);}catch{this.logger.warn('评分重算失败，将在下一轮重试');}}
  this.cursor=rows.length===30?rows.at(-1)!.id:'';
 }catch{this.logger.warn('评分调度暂时不可用');}finally{this.running=false;}}
 private async permission(code:string,user:string,action:string){if(!await this.access.allowed(code,user,'opportunity-directory',action))throw new ApiException('FORBIDDEN',403,'无权使用此评分操作');}
 private async expire(tx:Prisma.TransactionClient,scope:SalesScope,id:string){
  const rows=await tx.sdScoreOverride.findMany({where:{applicationId:scope.id,opportunityId:id,state:'ACTIVE',expiresAt:{lte:new Date()}}});
  for(const row of rows){await tx.sdScoreOverride.update({where:{id:row.id},data:{state:'EXPIRED',version:{increment:1}}});await tx.sysAuditLog.create({data:{tenantId:scope.tenantId,applicationId:scope.id,requestId:randomUUID(),resourceType:'score-override',resourceId:row.id,actionCode:'score.override.expire',afterSnapshot:{opportunityId:id}}});}
 }
 async calculate(scope:SalesScope,code:string,id:string){
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sd_opp WHERE id=${id}::uuid AND application_id=${scope.id}::uuid FOR UPDATE`;
   await this.expire(tx,scope,id);
   const facts=await salesFacts(tx,scope,code,'opportunity',id,true);
   if(!isOpen(facts.opp!))return;
   const rule=await tx.sdScoreRuleSet.findFirst({where:{applicationId:scope.id,tenantId:scope.tenantId,state:'PUBLISHED'}});if(!rule)return;
   const config=scoreRuleConfigSchema.parse(rule.config),dimensions=scoreDimensions(facts,config);
   const inputSummary={...facts.basis,source:facts.opp!.source,currency: facts.opp!.currencyCode,amount:facts.opp!.expectedAmount?.toFixed(2)??null};
   const inputHash=hash({inputSummary,rule:rule.id});
   await tx.sdOppScore.upsert({where:{opportunityId_ruleSetId_inputHash:{opportunityId:id,ruleSetId:rule.id,inputHash}},update:{},create:{tenantId:scope.tenantId,applicationId:scope.id,systemCode:code,opportunityId:id,ruleSetId:rule.id,inputHash,systemScore:dimensions.reduce((sum,d)=>sum+d.score,0),breakdown:json(dimensions),inputSummary:json(inputSummary)}});
  });
 }
 async get(code:string,user:string,id:string):Promise<PriorityScore>{
  const scope=await this.access.scope(code,user,'opportunity',id);await this.permission(code,user,'score-view');
  let failed=false;try{await this.calculate(scope,code,id);}catch{failed=true;}
  const opp=await this.db.sdOpp.findFirstOrThrow({where:{id,applicationId:scope.id,tenantId:scope.tenantId}});
  const rule=await this.db.sdScoreRuleSet.findFirst({where:{applicationId:scope.id,state:'PUBLISHED'}});
  const row=await this.db.sdOppScore.findFirst({where:{applicationId:scope.id,opportunityId:id},orderBy:[{calculatedAt:'desc'},{id:'desc'}]});
  const usedRule=row?await this.db.sdScoreRuleSet.findFirst({where:{id:row.ruleSetId,applicationId:scope.id}}):null;
  const override=await this.db.sdScoreOverride.findFirst({where:{applicationId:scope.id,opportunityId:id,state:'ACTIVE',expiresAt:{gt:new Date()}}});
  const operator=override?await this.db.iamUser.findFirst({where:{id:override.operatorId,tenantId:scope.tenantId},select:{displayName:true}}):null;
  return{systemScore:row?.systemScore??null,effectiveScore:override?.score??row?.systemScore??null,dimensions:(row?.breakdown??[]) as ScoreDimension[],ruleVersion:usedRule?.ruleVersion??null,calculatedAt:row?.calculatedAt.toISOString()??null,stale:failed||(!rule&&isOpen(opp)),closed:!isOpen(opp),message:failed?'计算暂时失败，显示上次结果，待更新':!isOpen(opp)?'商机已关闭或停用，保留历史评分':!rule?'暂无已发布评分规则，待配置':'跟进优先级，不代表成交概率',inputHash:row?.inputHash??null,override:override&&override.score!==null?{id:override.id,score:override.score,reason:override.reason,expiresAt:override.expiresAt.toISOString(),version:override.version,operatorName:operator?.displayName??'原操作人'}:null,canOverride:await this.access.allowed(code,user,'opportunity-directory','score-override'),canManageRules:await this.access.allowed(code,user,'opportunity-directory','score-rule-manage')};
 }
 async override(code:string,user:string,id:string,raw:unknown){
  const input=scoreOverrideSchema.parse(raw),scope=await this.access.scope(code,user,'opportunity',id);await this.permission(code,user,'score-view');await this.permission(code,user,'score-override');
  await this.calculate(scope,code,id);const requestHash=hash({id,...input});
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sys_user WHERE id=${user}::uuid FOR UPDATE`;
   await tx.$queryRaw`SELECT id FROM sd_opp WHERE id=${id}::uuid AND application_id=${scope.id}::uuid FOR UPDATE`;
   const prior=await tx.sdScoreOverride.findUnique({where:{applicationId_operatorId_requestId:{applicationId:scope.id,operatorId:user,requestId:input.requestId}}});
   if(prior){if(prior.requestHash!==requestHash)throw new ApiException('BAD_REQUEST',409,'请求号已用于不同操作');return{saved:true};}
   const opp=await tx.sdOpp.findFirstOrThrow({where:{id,applicationId:scope.id}});if(!isOpen(opp))throw new ApiException('BAD_REQUEST',409,'关闭商机不能修改评分');
   await this.expire(tx,scope,id);
   const latest=await tx.sdOppScore.findFirst({where:{applicationId:scope.id,opportunityId:id},orderBy:[{calculatedAt:'desc'},{id:'desc'}]});
   const active=await tx.sdScoreOverride.findFirst({where:{applicationId:scope.id,opportunityId:id,state:'ACTIVE'}});
   const facts=await salesFacts(tx,scope,code,'opportunity',id,true);
   const rule=await tx.sdScoreRuleSet.findFirst({where:{applicationId:scope.id,state:'PUBLISHED'}});
   const inputSummary={...facts.basis,source:facts.opp!.source,currency:facts.opp!.currencyCode,amount:facts.opp!.expectedAmount?.toFixed(2)??null};
   if(!rule||hash({inputSummary,rule:rule.id})!==input.inputHash)throw new ApiException('BAD_REQUEST',409,'评分依据已变化，请刷新');

   if(latest?.inputHash!==input.inputHash||(active?.id??null)!==input.currentOverrideId)throw new ApiException('BAD_REQUEST',409,'评分或覆盖已变化，请刷新');
   const expiresAt=input.expiresAt?new Date(input.expiresAt):new Date(Date.now()+30*86400000);
   if(input.score!==null&&(expiresAt<=new Date()||expiresAt.getTime()>Date.now()+366*86400000))throw new ApiException('BAD_REQUEST',400,'覆盖有效期必须在未来一年内');
   if(active)await tx.sdScoreOverride.update({where:{id:active.id},data:{state:'RESTORED',version:{increment:1}}});
   const created=await tx.sdScoreOverride.create({data:{tenantId:scope.tenantId,applicationId:scope.id,systemCode:code,opportunityId:id,score:input.score,reason:input.reason,operatorId:user,expiresAt,state:input.score===null?'RESTORED':'ACTIVE',requestId:input.requestId,requestHash}});
   await tx.sysAuditLog.create({data:{tenantId:scope.tenantId,applicationId:scope.id,actorUserId:user,requestId:input.requestId,resourceType:'score-override',resourceId:created.id,actionCode:input.score===null?'score.override.restore':'score.override.set',afterSnapshot:{opportunityId:id,score:input.score,reason:input.reason,expiresAt:expiresAt.toISOString()}}});return{saved:true};
  });
 }
 async rules(code:string,user:string){await this.permission(code,user,'score-rule-manage');const app=await this.db.sysApplication.findFirstOrThrow({where:{applicationCode:code,status:'ACTIVE'}});return(await this.db.sdScoreRuleSet.findMany({where:{applicationId:app.id,tenantId:app.tenantId},orderBy:{ruleVersion:'desc'},take:50})).map(r=>({id:r.id,ruleVersion:r.ruleVersion,state:r.state,config:r.config,version:r.version,createdAt:r.createdAt.toISOString()}));}
 async createRule(code:string,user:string,raw:unknown){
  await this.permission(code,user,'score-rule-manage');const {config}=scoreRuleWriteSchema.parse(raw),app=await this.db.sysApplication.findFirstOrThrow({where:{applicationCode:code,status:'ACTIVE'}});
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sys_application WHERE id=${app.id}::uuid FOR UPDATE`;
   const last=await tx.sdScoreRuleSet.findFirst({where:{applicationId:app.id},orderBy:{ruleVersion:'desc'}});
   const row=await tx.sdScoreRuleSet.create({data:{tenantId:app.tenantId,applicationId:app.id,systemCode:code,ruleVersion:(last?.ruleVersion??0)+1,config:json(config),creatorId:user}});return{id:row.id};
  });
 }
 async ruleAction(code:string,user:string,id:string,raw:unknown){
  z.string().uuid().parse(id);await this.permission(code,user,'score-rule-manage');const input=scoreRuleStateSchema.parse(raw),app=await this.db.sysApplication.findFirstOrThrow({where:{applicationCode:code,status:'ACTIVE'}});
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sys_application WHERE id=${app.id}::uuid FOR UPDATE`;
   const row=await tx.sdScoreRuleSet.findFirst({where:{id,applicationId:app.id,tenantId:app.tenantId}});
   if(!row||row.version!==input.version)throw new ApiException('BAD_REQUEST',409,'规则已被修改');
   if(input.state==='PUBLISHED'&&row.state!=='DRAFT')throw new ApiException('BAD_REQUEST',409,'仅草稿可以发布；已发布版本不可更改');
   if(input.state==='PUBLISHED')await tx.sdScoreRuleSet.updateMany({where:{applicationId:app.id,state:'PUBLISHED'},data:{state:'DISABLED',version:{increment:1}}});
   await tx.sdScoreRuleSet.update({where:{id},data:{state:input.state,...(input.state==='PUBLISHED'?{publishedAt:new Date()}:{}),version:{increment:1}}});
   await tx.sysAuditLog.create({data:{tenantId:app.tenantId,applicationId:app.id,actorUserId:user,requestId:randomUUID(),resourceType:'score-rule',resourceId:id,actionCode:`score.rule.${input.state.toLowerCase()}`,afterSnapshot:{ruleVersion:row.ruleVersion}}});return{saved:true};
  });
 }
}
