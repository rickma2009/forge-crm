import { Inject,Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { recordKindSchema,commentDraftSchema,commentWriteSchema,commentStateSchema,type RecordComment } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { ActivityAccessService } from '../activity/activity-access.service';
import { ApiException } from '../http/api-exceptions';
import { RUNTIME_CONFIG,type RuntimeConfig } from '../config/runtime-config';
import { decodeCursor,encodeCursor,timelineFingerprint } from '../activity/timeline-cursor';
import { hash,json,pageFor,type SalesScope } from '../sales-guidance/sales-facts';
import type { Prisma,SdRecordComment } from '../generated/prisma/client';
@Injectable()
export class CommentService {
 constructor(private readonly db:DatabaseService,private readonly access:ActivityAccessService,@Inject(RUNTIME_CONFIG)private readonly config:RuntimeConfig){}
 async scope(code:string,user:string,kind:string,id:string,action='comment-view'){
  recordKindSchema.parse(kind);const scope=await this.access.scope(code,user,kind,id);
  for(const requested of new Set(['comment-view',action]))if(!await this.access.allowed(code,user,pageFor(kind),requested))throw new ApiException('FORBIDDEN',403,'无权使用记录协作');
  return scope;
 }
 private async record(code:string,user:string,id:string,action='comment-view'){
  z.string().uuid().parse(id);const row=await this.db.sdRecordComment.findFirst({where:{id,systemCode:code}});if(!row)throw new ApiException('NOT_FOUND',404,'评论不存在');
  const kind=row.opportunityId?'opportunity':'customer';const scope=await this.scope(code,user,kind,row.opportunityId??row.customerId!,action);
  if(row.applicationId!==scope.id||row.tenantId!==scope.tenantId)throw new ApiException('NOT_FOUND',404,'评论不存在');
  return{row,kind,scope};
 }
 async members(code:string,user:string,kind:string,id:string,raw:unknown){
  const q=z.object({q:z.string().trim().min(1).max(64),cursor:z.string().uuid().optional()}).parse(raw),scope=await this.scope(code,user,kind,id,'comment-create');
  const rows=await this.db.iamUser.findMany({where:{tenantId:scope.tenantId,status:'ACTIVE',...(q.cursor?{id:{gt:q.cursor}}:{}),OR:[{displayName:{contains:q.q,mode:'insensitive'}},{account:{contains:q.q,mode:'insensitive'}}]},orderBy:{id:'asc'},take:50});
  const items=[];for(const row of rows){try{await this.scope(code,row.id,kind,id);items.push({id:row.id,displayName:row.displayName});}catch(e){if(!(e instanceof ApiException&&[403,404].includes(e.getStatus())))throw e;}}
  return{items,nextCursor:rows.length===50?rows.at(-1)!.id:null};
 }
 async draft(code:string,user:string,account:string,kindRaw:string,id:string,raw:unknown){
  const kind=recordKindSchema.parse(kindRaw),scope=await this.scope(code,user,kind,id,'comment-create'),input=commentDraftSchema.parse(raw);const requestHash=hash({kind,id,...input});
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sys_user WHERE id=${user}::uuid FOR UPDATE`;
   const prior=await tx.sdRecordComment.findUnique({where:{applicationId_authorId_requestId:{applicationId:scope.id,authorId:user,requestId:input.requestId}}});
   if(prior){if(prior.requestHash!==requestHash)throw new ApiException('BAD_REQUEST',409,'请求号已使用');if(prior.state!=='DRAFT'||prior.expiresAt<=new Date())throw new ApiException('BAD_REQUEST',409,'草稿已发送或过期');return{id:prior.id,version:prior.version};}
   if(input.rootCommentId){const root=await tx.sdRecordComment.findFirst({where:{id:input.rootCommentId,applicationId:scope.id,tenantId:scope.tenantId,subjectKey:`${kind}:${id}`,rootCommentId:null,state:{in:['PUBLISHED','WITHDRAWN']}}});if(!root)throw new ApiException('BAD_REQUEST',400,'仅能回复本记录下的根评论');}
   const actor=await tx.iamUser.findFirstOrThrow({where:{id:user,tenantId:scope.tenantId,status:'ACTIVE'}});
   const row=await tx.sdRecordComment.create({data:{tenantId:scope.tenantId,applicationId:scope.id,systemCode:code,customerId:kind==='customer'?id:null,opportunityId:kind==='opportunity'?id:null,subjectKey:`${kind}:${id}`,rootCommentId:input.rootCommentId,authorId:user,authorName:actor.displayName,requestId:input.requestId,requestHash,expiresAt:new Date(Date.now()+86400000)}});
   return{id:row.id,version:row.version};
  });
 }
 private async mentions(code:string,kind:string,id:string,scope:SalesScope,ids:string[]){
  for(const user of new Set(ids)){
   if(!await this.db.iamUser.findFirst({where:{id:user,tenantId:scope.tenantId,status:'ACTIVE'}}))throw new ApiException('BAD_REQUEST',400,'提及成员已停用或不可用，请重新选择');
   try{await this.scope(code,user,kind,id);}catch(e){if(e instanceof ApiException&&[403,404].includes(e.getStatus()))throw new ApiException('BAD_REQUEST',400,'提及成员无权访问该记录，请重新选择');throw e;}
  }
 }
 private async notify(tx:Prisma.TransactionClient,row:SdRecordComment,ids:string[],oldIds:string[],version:number){
  const scope={tenantId:row.tenantId,applicationId:row.applicationId,systemCode:row.systemCode};
  await tx.sdCommentMention.updateMany({where:{commentId:row.id},data:{isActive:false}});
  for(const userId of new Set(ids)){
   await tx.sdCommentMention.upsert({where:{commentId_userId:{commentId:row.id,userId}},update:{isActive:true},create:{...scope,commentId:row.id,userId}});
   if(userId!==row.authorId&&!oldIds.includes(userId))await tx.sysEventOutbox.upsert({where:{applicationId_eventKey:{applicationId:row.applicationId,eventKey:`comment:${row.id}:v${version}:${userId}`}},update:{},create:{...scope,commentId:row.id,recipientId:userId,eventKey:`comment:${row.id}:v${version}:${userId}`}});
  }
 }
 async publishOrEdit(code:string,user:string,id:string,raw:unknown){
  const input=commentWriteSchema.parse(raw),{row,kind,scope}=await this.record(code,user,id);
  const action=row.state==='DRAFT'?'comment-create':'comment-edit-own';await this.scope(code,user,kind,row.opportunityId??row.customerId!,action);
  if(row.authorId!==user)throw new ApiException('FORBIDDEN',403,'仅作者可以修改评论');
  await this.mentions(code,kind,row.opportunityId??row.customerId!,scope,input.mentionUserIds);
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sd_record_comment WHERE id=${id}::uuid FOR UPDATE`;
   const current=await tx.sdRecordComment.findFirstOrThrow({where:{id,applicationId:scope.id,authorId:user}});
   const oldIds=(await tx.sdCommentMention.findMany({where:{commentId:id,isActive:true}})).map(x=>x.userId);
   if(current.state==='PUBLISHED'&&current.version===input.version+1&&current.body===input.body&&JSON.stringify([...new Set(input.mentionUserIds)].sort())===JSON.stringify(oldIds.sort()))return{saved:true};
   if(current.version!==input.version||!['DRAFT','PUBLISHED'].includes(current.state))throw new ApiException('BAD_REQUEST',409,'评论已变化，请刷新后重试');
   if(current.state==='DRAFT'&&current.expiresAt<=new Date())throw new ApiException('BAD_REQUEST',409,'草稿已过期，请重新创建');
   if(current.state==='PUBLISHED'&&!input.reason?.trim())throw new ApiException('BAD_REQUEST',400,'修改评论需要填写原因');
   if(current.rootCommentId&&!await tx.sdRecordComment.findFirst({where:{id:current.rootCommentId,applicationId:scope.id,subjectKey:current.subjectKey,rootCommentId:null,state:{in:['PUBLISHED','WITHDRAWN']}}}))throw new ApiException('BAD_REQUEST',409,'根评论已不可回复');
   await tx.sdCommentRevision.create({data:{tenantId:scope.tenantId,applicationId:scope.id,systemCode:code,commentId:id,version:current.version,body:current.body,state:current.state,reason:input.reason??'首次发表',operatorId:user}});
   await tx.sdRecordComment.update({where:{id},data:{body:input.body,state:'PUBLISHED',publishedAt:current.publishedAt??new Date(),version:{increment:1}}});
   await this.notify(tx,current,input.mentionUserIds,oldIds,current.version+1);
   await tx.sysAuditLog.create({data:{tenantId:scope.tenantId,applicationId:scope.id,actorUserId:user,requestId:randomUUID(),resourceType:'record-comment',resourceId:id,actionCode:current.state==='DRAFT'?'comment.publish':'comment.edit',afterSnapshot:{version:current.version+1,mentionCount:new Set(input.mentionUserIds).size}}});return{saved:true};
  });
 }
 async state(code:string,user:string,id:string,raw:unknown){
  const input=commentStateSchema.parse(raw),{row,kind,scope}=await this.record(code,user,id,input.action==='HIDE'?'comment-moderate':'comment-edit-own');
  if(input.action==='WITHDRAW'&&row.authorId!==user)throw new ApiException('FORBIDDEN',403,'仅作者可以撤回评论');
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM sd_record_comment WHERE id=${id}::uuid FOR UPDATE`;
   const current=await tx.sdRecordComment.findFirstOrThrow({where:{id,applicationId:scope.id}});
   if(current.version!==input.version||current.state!=='PUBLISHED')throw new ApiException('BAD_REQUEST',409,'评论已变化，请刷新');
   await tx.sdCommentRevision.create({data:{tenantId:scope.tenantId,applicationId:scope.id,systemCode:code,commentId:id,version:current.version,body:current.body,state:current.state,reason:input.reason,operatorId:user}});
   await tx.sdRecordComment.update({where:{id},data:{state:input.action==='HIDE'?'HIDDEN':'WITHDRAWN',version:{increment:1}}});
   await tx.sysAuditLog.create({data:{tenantId:scope.tenantId,applicationId:scope.id,actorUserId:user,requestId:randomUUID(),resourceType:'record-comment',resourceId:id,actionCode:`comment.${input.action.toLowerCase()}`,afterSnapshot:{version:current.version+1,reason:input.reason}}});return{saved:true};
  });
 }
 async list(code:string,user:string,kind:string,id:string,raw:unknown){
  const query=z.object({cursor:z.string().max(2000).optional(),rootCommentId:z.string().uuid().optional()}).parse(raw),scope=await this.scope(code,user,kind,id);
  const canCreate=await this.access.allowed(code,user,pageFor(kind),'comment-create'),canEdit=await this.access.allowed(code,user,pageFor(kind),'comment-edit-own'),canModerate=await this.access.allowed(code,user,pageFor(kind),'comment-moderate');
  const fingerprint=timelineFingerprint({code,user,kind,id,root:query.rootCommentId,canCreate,canEdit,canModerate});const cursor=query.cursor?decodeCursor(query.cursor,this.config.sessionSecret,fingerprint):null,snapshot=cursor?.snapshot??new Date().toISOString();
  const rows=await this.db.sdRecordComment.findMany({where:{tenantId:scope.tenantId,applicationId:scope.id,subjectKey:`${kind}:${id}`,rootCommentId:query.rootCommentId??null,state:{in:['PUBLISHED','WITHDRAWN','HIDDEN']},createdAt:{lte:new Date(snapshot)},...(cursor?{OR:[{createdAt:{lt:new Date(cursor.at)}},{createdAt:new Date(cursor.at),id:{lt:cursor.key}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:21});
  const page=rows.slice(0,20),mentions=await this.db.sdCommentMention.findMany({where:{commentId:{in:page.map(r=>r.id)},applicationId:scope.id,isActive:true}});
  const users=await this.db.iamUser.findMany({where:{id:{in:mentions.map(m=>m.userId)},tenantId:scope.tenantId},select:{id:true,displayName:true}});
  const items=page.map((r):RecordComment=>({id:r.id,rootCommentId:r.rootCommentId,authorName:r.authorName,body:r.state==='PUBLISHED'?r.body:r.state==='HIDDEN'?'此评论已被管理员隐藏':'此评论已撤回',state:r.state,version:r.version,createdAt:(r.publishedAt??r.createdAt).toISOString(),canEdit:r.state==='PUBLISHED'&&r.authorId===user&&canEdit,canModerate:r.state==='PUBLISHED'&&canModerate,mentions:r.state==='PUBLISHED'?users.filter(u=>mentions.some(m=>m.commentId===r.id&&m.userId===u.id)):[]}));
  const last=page.at(-1);return{items,canCreate,nextCursor:rows.length>20&&last?encodeCursor({fingerprint,snapshot,at:last.createdAt.toISOString(),key:last.id},this.config.sessionSecret):null};
 }
}
