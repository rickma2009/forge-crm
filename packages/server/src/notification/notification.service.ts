import { Injectable,Logger,OnModuleInit,OnModuleDestroy } from '@nestjs/common';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { CommentService } from '../record-collaboration/comment.service';
import { FileStorage } from '../attachment/file-storage';
import { AuthorizationService } from '../rbac/authorization.service';
import { ApiException } from '../http/api-exceptions';
@Injectable()
export class NotificationService implements OnModuleInit,OnModuleDestroy {
 private timer?:ReturnType<typeof setInterval>;private running=false;private logger=new Logger(NotificationService.name);
 constructor(private readonly db:DatabaseService,private readonly comments:CommentService,private readonly files:FileStorage,private readonly auth:AuthorizationService){}
 onModuleInit(){this.timer=setInterval(()=>void this.tick(),30000);this.timer.unref();}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 async tick(){if(this.running)return;this.running=true;try{await this.deliver();await this.cleanDrafts();}catch{this.logger.warn('协作投递或草稿清理失败，将自动重试');}finally{this.running=false;}}
 async deliver(){
  // A short transaction locks only a bounded set. Rollback preserves pending events on failure.
  await this.db.$transaction(async tx=>{
   const rows=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM sys_event_outbox WHERE state='PENDING' AND next_at<=now() ORDER BY next_at,id LIMIT 50 FOR UPDATE SKIP LOCKED`;
   for(const {id} of rows){const row=await tx.sysEventOutbox.findUniqueOrThrow({where:{id}});
    await tx.sysNotification.upsert({where:{outboxId:id},update:{},create:{tenantId:row.tenantId,applicationId:row.applicationId,systemCode:row.systemCode,outboxId:id,commentId:row.commentId,recipientId:row.recipientId}});
    await tx.sysEventOutbox.update({where:{id},data:{state:'DELIVERED',attempts:{increment:1}}});
   }
  });
 }
 async cleanDrafts(){
  await this.db.sdRecordComment.updateMany({where:{state:'DRAFT',expiresAt:{lte:new Date()}},data:{state:'EXPIRED',version:{increment:1}}});
  const files=await this.db.$queryRaw<Array<{id:string;storage_key:string}>>`SELECT a.id,a.storage_key FROM sys_attachment a JOIN sd_record_comment c ON a.owner_id=c.id AND a.application_id=c.application_id WHERE a.owner_type='RECORD_COMMENT' AND c.state='EXPIRED' ORDER BY a.id LIMIT 50`;
  for(const file of files){await this.files.remove(file.storage_key);await this.db.sysAttachment.deleteMany({where:{id:file.id,ownerType:'RECORD_COMMENT'}});}
 }
 private async scope(code:string,user:string){await this.auth.navigation(user,code);return this.db.sysApplication.findFirstOrThrow({where:{applicationCode:code,status:'ACTIVE'}});}
 async list(code:string,user:string,raw:unknown){
  const q=z.object({cursor:z.string().max(200).optional(),unreadOnly:z.enum(['true','false']).optional()}).parse(raw),app=await this.scope(code,user);
  let cursor: { at: string; id: string } | null = null; if(q.cursor){try{cursor=z.object({at:z.string().datetime(),id:z.string().uuid()}).parse(JSON.parse(Buffer.from(q.cursor,'base64url').toString()));}catch{throw new ApiException('BAD_REQUEST',400,'通知游标无效，请刷新');}}
  const rows=await this.db.sysNotification.findMany({where:{applicationId:app.id,tenantId:app.tenantId,recipientId:user,...(q.unreadOnly==='true'?{readAt:null}:{}),...(cursor?{OR:[{createdAt:{lt:new Date(cursor.at)}},{createdAt:new Date(cursor.at),id:{lt:cursor.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:21});
  const items=[];for(const row of rows.slice(0,20)){
   const comment=await this.db.sdRecordComment.findFirst({where:{id:row.commentId,applicationId:app.id,tenantId:app.tenantId}});let available=false;
   if(comment?.state==='PUBLISHED')try{await this.comments.scope(code,user,comment.opportunityId?'opportunity':'customer',comment.opportunityId??comment.customerId!);available=true;}catch(e){if(!(e instanceof ApiException&&[403,404].includes(e.getStatus())))throw e;}
   items.push({id:row.id,createdAt:row.createdAt.toISOString(),readAt:row.readAt?.toISOString()??null,title:available?`${comment!.authorName} 在协作中提及了你`:'协作通知（内容不可用）',body:available?comment!.body.slice(0,200):'记录权限已变化或评论已撤回，无法查看内容',path:available?`/showcase/${comment!.opportunityId?'opportunities':'customers'}/${comment!.opportunityId??comment!.customerId}`:null,available});
  }
  const unread=await this.db.sysNotification.count({where:{applicationId:app.id,recipientId:user,readAt:null}});
  return{items,unread,nextCursor:rows.length>20?Buffer.from(JSON.stringify({at:rows[19].createdAt.toISOString(),id:rows[19].id})).toString('base64url'):null};
 }
 async read(code:string,user:string,raw:unknown){const {ids,all}=z.strictObject({ids:z.array(z.string().uuid()).max(100).default([]),all:z.boolean().default(false)}).parse(raw),app=await this.scope(code,user);await this.db.sysNotification.updateMany({where:{applicationId:app.id,tenantId:app.tenantId,recipientId:user,readAt:null,...(!all?{id:{in:ids}}:{})},data:{readAt:new Date()}});return{saved:true};}
}
