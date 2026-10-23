import { Inject, Injectable } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { activityWriteSchema,activityUpdateSchema,type TimelineEntry,type TimelinePage } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { ActivityAccessService } from './activity-access.service';
import { OpportunityService } from '../opportunity/opportunity.service';
import { ApiException } from '../http/api-exceptions';
import { RUNTIME_CONFIG,type RuntimeConfig } from '../config/runtime-config';
import { decodeCursor,encodeCursor,timelineFingerprint } from './timeline-cursor';
const querySchema=z.object({type:z.enum(['VISIT','CALL','EMAIL','FOLLOW_UP','NOTE','SYSTEM']).optional(),pageSize:z.coerce.number().int().min(1).max(50).default(20),cursor:z.string().max(2000).optional()});
const hash=(data:unknown)=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const future=(date:string)=>{if(Date.parse(date)>Date.now())throw new ApiException('BAD_REQUEST',400,'活动发生时间不能在未来，请使用待办安排未来计划');};
@Injectable()
export class ActivityService {
 constructor(private readonly db:DatabaseService,private readonly access:ActivityAccessService,private readonly opportunities:OpportunityService,@Inject(RUNTIME_CONFIG)private readonly config:RuntimeConfig){}
 async list(code:string,user:string,kind:string,id:string,raw:Record<string,unknown>):Promise<TimelinePage> {
  const scope=await this.access.scope(code,user,kind,id),query=querySchema.parse(raw);
  const canOpp=kind==='opportunity'||await this.access.allowed(code,user,'opportunity-directory','view');
  let canCreate=false;
  try{await this.access.scope(code,user,kind,id,true);canCreate=true;}catch(e){if(!(e instanceof ApiException&&[403,404].includes(e.getStatus())))throw e;}
  const canOppWrite=canOpp&&await this.access.allowed(code,user,'opportunity-directory','follow-up');
  const canGuidance=await this.access.allowed(code,user,kind==='customer'?'customer-directory':'opportunity-directory','suggestion-view');
  const fingerprint=timelineFingerprint({code,user,kind,id,type:query.type??'',pageSize:query.pageSize,canOpp,canOppWrite,canCreate,canGuidance});
  const cursor=query.cursor?decodeCursor(query.cursor,this.config.sessionSecret,fingerprint):null;
  const snapshot=cursor?.snapshot??new Date().toISOString();
  const parent=scope.opportunityId?Prisma.sql`o.id=${scope.opportunityId}::uuid`:Prisma.sql`o.customer_id=${scope.customerId}::uuid`;
  const activityScope=scope.opportunityId?Prisma.sql`a.opportunity_id=${scope.opportunityId}::uuid AND a.customer_id=${scope.customerId}::uuid`:Prisma.sql`a.customer_id=${scope.customerId}::uuid AND (a.opportunity_id IS NULL OR (${canOpp} AND EXISTS(SELECT 1 FROM parents p WHERE p.id=a.opportunity_id)))`;
  type Row=Omit<TimelineEntry,'canEdit'|'occurredAt'|'recordedAt'> & {occurredAt:Date;recordedAt:Date;creatorId:string|null};
  const rows=await this.db.$queryRaw<Row[]>(Prisma.sql`
  WITH parents AS (SELECT o.id,o.customer_id FROM sd_opp o WHERE o.application_id=${scope.id}::uuid AND o.tenant_id=${scope.tenantId}::uuid AND ${canOpp} AND ${parent}),
  entries AS (
   SELECT 'ACTIVITY:'||a.id::text AS key,'ACTIVITY'::text AS "sourceType",a.id AS "sourceId",a.type,a.title,a.content,a.result,a.next_step AS "nextStep",a.occurred_at AS "occurredAt",a.created_at AS "recordedAt",a.updated_at AS "updatedAt",a.creator_name AS "actorName",a.creator_id AS "creatorId",a.opportunity_id AS "opportunityId",a.version,a.status::text
   FROM sd_sales_activity a WHERE a.application_id=${scope.id}::uuid AND a.tenant_id=${scope.tenantId}::uuid AND ${activityScope}
   UNION ALL
   SELECT 'FOLLOW_UP:'||f.id::text,'FOLLOW_UP',f.id,'FOLLOW_UP',COALESCE(f.activity_title,substring(f.work_item,1,120)),f.work_item,COALESCE(f.result_next,''),COALESCE(f.activity_next_step,''),f.followed_at,f.created_at,f.updated_at,f.follower_name,f.follower_user_id,f.opportunity_id,f.version,f.status::text
   FROM sd_opp_follow_up f JOIN parents p ON p.id=f.opportunity_id
   UNION ALL
   SELECT 'STAGE_EVENT:'||e.id::text,'STAGE_EVENT',e.id,'SYSTEM','阶段变更',e.from_stage_name||' → '||e.to_stage_name,e.reason,'',e.created_at,e.created_at,e.created_at,e.actor,NULL::uuid,e.opportunity_id,e.opportunity_version,'ACTIVE'
   FROM sd_opp_stage_event e JOIN parents p ON p.id=e.opportunity_id WHERE e.application_id=${scope.id}::uuid AND e.tenant_id=${scope.tenantId}::uuid
   UNION ALL
   SELECT 'STATUS_EVENT:'||e.id::text,'STATUS_EVENT',e.id,'SYSTEM','商机状态变更',COALESCE(e.before_snapshot->>'label','')||' → '||COALESCE(e.after_snapshot->>'label',''),COALESCE(e.after_snapshot->>'reason',''),' ',e.created_at,e.created_at,e.created_at,COALESCE(e.after_snapshot->>'actor','系统'),e.actor_user_id,p.id,1,'ACTIVE'
   FROM sys_audit_log e JOIN parents p ON p.id::text=e.resource_id WHERE e.application_id=${scope.id}::uuid AND e.tenant_id=${scope.tenantId}::uuid AND e.resource_type='opportunity' AND e.action_code='opportunity.lifecycle.change'
   UNION ALL
   SELECT 'AMOUNT_EVENT:'||e.id::text,'AMOUNT_EVENT',e.id,'SYSTEM','预计金额变更',COALESCE(e.old_amount::text,'未填写')||' → '||COALESCE(e.new_amount::text,'未填写'),'','',e.created_at,e.created_at,e.created_at,e.actor_id,NULL::uuid,e.opportunity_id,e.opportunity_version,'ACTIVE'
   FROM sd_opp_amount_event e JOIN parents p ON p.id=e.opportunity_id WHERE e.application_id=${scope.id}::uuid AND e.tenant_id=${scope.tenantId}::uuid
   UNION ALL
   SELECT 'GUIDANCE_EVENT:'||e.id::text,'GUIDANCE_EVENT',e.id,'SYSTEM',COALESCE(e.after_snapshot->>'title','销售建议事件'),COALESCE(e.after_snapshot->>'reason',''),'','',e.created_at,e.created_at,e.created_at,'当前用户',e.actor_user_id,CASE WHEN e.after_snapshot->>'kind'='opportunity' THEN e.resource_id::uuid ELSE NULL::uuid END,1,'ACTIVE'
   FROM sys_audit_log e WHERE ${canGuidance} AND e.application_id=${scope.id}::uuid AND e.tenant_id=${scope.tenantId}::uuid AND e.resource_type='sales-guidance' AND e.action_code IN ('suggestion.adopt','suggestion.todo.result') AND e.after_snapshot->>'recipientId'=${user} AND e.resource_id=${id} AND e.after_snapshot->>'kind'=${kind}
  ) SELECT * FROM entries WHERE "occurredAt"<=${new Date(snapshot)} AND "recordedAt"<=${new Date(snapshot)} AND "updatedAt"<=${new Date(snapshot)}
   ${query.type?Prisma.sql`AND type=${query.type}`:Prisma.empty}
   ${cursor?Prisma.sql`AND ("occurredAt"<${new Date(cursor.at)} OR ("occurredAt"=${new Date(cursor.at)} AND key<${cursor.key}))`:Prisma.empty}
   ORDER BY "occurredAt" DESC,key DESC LIMIT ${query.pageSize+1}`);
  const page=rows.slice(0,query.pageSize);
  const items=page.map(({creatorId,...row})=>{
   const {updatedAt:_,...fields}=row as typeof row & {updatedAt:Date};
   return {...fields,occurredAt:row.occurredAt.toISOString(),recordedAt:row.recordedAt.toISOString(),canEdit:row.status==='ACTIVE'&&creatorId===user&&['ACTIVITY','FOLLOW_UP'].includes(row.sourceType)&&(row.opportunityId?canOppWrite:canCreate)};
  });
  const last=items.at(-1);
  return {items,canCreate,snapshotAt:snapshot,nextCursor:rows.length>query.pageSize&&last?encodeCursor({fingerprint,snapshot,at:last.occurredAt,key:last.key},this.config.sessionSecret):null};
 }
 async create(code:string,user:string,account:string,kind:string,id:string,raw:unknown) {
  const scope=await this.access.scope(code,user,kind,id,true),input=activityWriteSchema.parse(raw);future(input.occurredAt);
  if(kind==='opportunity'&&input.type==='FOLLOW_UP') {
   await this.opportunities.createFollowUp(code,id,user,account,{followedAt:input.occurredAt,workItem:input.content,resultNext:input.result,activityTitle:input.title,activityNextStep:input.nextStep,status:'ACTIVE',requestId:input.requestId});
   const row=await this.db.sdOppFollowUp.findUniqueOrThrow({where:{requestId:input.requestId}});return {sourceType:'FOLLOW_UP',sourceId:row.id};
  }
  const requestHash=hash({kind,id,...input});
  return this.db.$transaction(async tx=>{
   // Serialize an actor's requests; this also makes same-key retries safe before insert.
   await tx.$queryRaw`SELECT id FROM sys_user WHERE id=${user}::uuid AND tenant_id=${scope.tenantId}::uuid FOR UPDATE`;
   const prior=await tx.sdSalesActivity.findUnique({where:{applicationId_creatorId_requestId:{applicationId:scope.id,creatorId:user,requestId:input.requestId}}});
   if(prior){if(prior.requestHash!==requestHash)throw new ApiException('BAD_REQUEST',409,'请求号已使用且内容不同');return{sourceType:'ACTIVITY',sourceId:prior.id};}
   if(scope.opportunityId) {
     const parents=await tx.$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM sd_opp WHERE id=${scope.opportunityId}::uuid AND application_id=${scope.id}::uuid AND tenant_id=${scope.tenantId}::uuid FOR SHARE`;
     if(parents[0]?.customer_id!==scope.customerId)throw new ApiException('BAD_REQUEST',409,'商机客户已变化，请刷新后重试');
   }
   const actor=await tx.iamUser.findFirst({where:{id:user,tenantId:scope.tenantId,status:'ACTIVE'}});if(!actor)throw new ApiException('FORBIDDEN',403,'执行人不可用');
   const {requestId,type,title,content,result,nextStep}=input;
   const row=await tx.sdSalesActivity.create({data:{tenantId:scope.tenantId,applicationId:scope.id,systemCode:code,customerId:scope.customerId,opportunityId:scope.opportunityId,type,title,content,result,nextStep,occurredAt:new Date(input.occurredAt),creatorId:user,creatorName:actor.displayName,requestId,requestHash}});
   return {sourceType:'ACTIVITY',sourceId:row.id};
  });
 }
 async update(code:string,user:string,account:string,source:string,id:string,raw:unknown) {
  const input=activityUpdateSchema.parse(raw);future(input.occurredAt);
  if(source==='FOLLOW_UP') {
   const current=await this.access.record(code,user,'OPPORTUNITY_FOLLOW_UP',id,true);
   if(!('opportunityId' in current)||!current.opportunityId)throw new ApiException('NOT_FOUND',404,'跟进不存在');
   await this.opportunities.updateFollowUp(code,current.opportunityId,id,account,{version:input.version,followedAt:input.occurredAt,workItem:input.content,resultNext:input.result,activityTitle:input.title,activityNextStep:input.nextStep,status:input.status,changeReason:input.reason});return {saved:true};
  }
  if(source!=='ACTIVITY')throw new ApiException('FORBIDDEN',403,'系统事件只读');
  await this.access.record(code,user,'SALES_ACTIVITY',id,true);
  const app=await this.db.sysApplication.findFirstOrThrow({where:{applicationCode:code,status:'ACTIVE'}});
  return this.db.$transaction(async tx=>{
   const current=await tx.sdSalesActivity.findFirst({where:{id,applicationId:app.id,creatorId:user,status:'ACTIVE',version:input.version}});
   if(!current)throw new ApiException('BAD_REQUEST',409,'活动已被修改或作废，请刷新');
   const {version,reason,...data}=input;
   const changed=await tx.sdSalesActivity.updateMany({where:{id,applicationId:app.id,version,creatorId:user,status:'ACTIVE'},data:{...data,occurredAt:new Date(input.occurredAt),version:{increment:1}}});
   if(!changed.count)throw new ApiException('BAD_REQUEST',409,'活动已被其他请求修改');
   await tx.sysAuditLog.create({data:{tenantId:app.tenantId,applicationId:app.id,actorUserId:user,resourceType:'sales-activity',resourceId:id,actionCode:input.status==='DISABLED'?'activity.void':'activity.update',requestId:randomUUID(),beforeSnapshot:JSON.parse(JSON.stringify(current)),afterSnapshot:{...input,reason}}});
   return {saved:true};
  });
 }
}
