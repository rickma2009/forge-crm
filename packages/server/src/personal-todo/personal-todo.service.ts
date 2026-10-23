import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { todoCompleteSchema } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { ActivityAccessService } from '../activity/activity-access.service';
import { ApiException } from '../http/api-exceptions';
import { pageFor,type SalesScope } from '../sales-guidance/sales-facts';
import type { Prisma,SdSalesSuggestion } from '../generated/prisma/client';
@Injectable()
export class PersonalTodoService {
 constructor(private readonly db:DatabaseService,private readonly access:ActivityAccessService){}
 async createFromSuggestion(tx:Prisma.TransactionClient,scope:SalesScope,user:string,row:SdSalesSuggestion,input:{title:string;description:string;dueDate?:string}){
  const dueDate=input.dueDate?new Date(`${input.dueDate}T00:00:00Z`):null;
  if(dueDate&&dueDate.toISOString().slice(0,10)!==input.dueDate)throw new ApiException('BAD_REQUEST',400,'截止日期无效');
  return tx.sysPersonalTodo.upsert({where:{sourceSuggestionId:row.id},update:{},create:{tenantId:scope.tenantId,applicationId:scope.id,ownerUserId:user,createdBy:user,title:input.title,description:input.description,dueDate,contextType:row.opportunityId?'OPPORTUNITY':'CUSTOMER',contextId:row.opportunityId??row.customerId,sourceSuggestionId:row.id}});
 }
 async authorize(code:string,user:string,todo:{sourceSuggestionId:string|null;contextType:string;contextId:string|null}){
  if(!todo.contextId)return;
  const kind=todo.contextType==='CUSTOMER'?'customer':'opportunity';
  await this.access.scope(code,user,kind,todo.contextId!);
  if(todo.sourceSuggestionId&&!await this.access.allowed(code,user,pageFor(kind),'suggestion-view'))throw new ApiException('FORBIDDEN',403,'无权查看建议待办');
 }
 async visibleOpen(code:string,user:string,scope:SalesScope){
  let cursor:string|undefined,total=0;const first:Array<import('../generated/prisma/client').SysPersonalTodo>=[];const allowed=new Map<string,boolean>();
  for(;;){
   const rows=await this.db.sysPersonalTodo.findMany({where:{applicationId:scope.id,tenantId:scope.tenantId,ownerUserId:user,status:'OPEN',...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:'asc'},take:100});
   for(const item of rows){const key=item.contextId?`${item.sourceSuggestionId?'suggestion':'agent'}:${item.contextType}:${item.contextId}`:'unrestricted';
    if(!allowed.has(key)){try{await this.authorize(code,user,item);allowed.set(key,true);}catch(e){if(!(e instanceof ApiException&&[403,404].includes(e.getStatus())))throw e;allowed.set(key,false);}}
    if(!allowed.get(key))continue;total++;first.push(item);first.sort((a,b)=>(a.dueDate?.getTime()??Infinity)-(b.dueDate?.getTime()??Infinity)||b.createdAt.getTime()-a.createdAt.getTime()||a.id.localeCompare(b.id));if(first.length>8)first.pop();
   }
   if(rows.length<100)break;cursor=rows.at(-1)!.id;
  }
  return{items:first,total};
 }
 async complete(code:string,user:string,id:string,raw:unknown){
  const input=todoCompleteSchema.parse(raw),app=await this.db.sysApplication.findFirstOrThrow({where:{applicationCode:code,status:'ACTIVE'}});
  const row=await this.db.sysPersonalTodo.findFirst({where:{id,applicationId:app.id,tenantId:app.tenantId,ownerUserId:user,sourceSuggestionId:{not:null}}});
  if(!row)throw new ApiException('NOT_FOUND',404,'建议待办不存在');
  await this.authorize(code,user,row);
  if(!await this.access.allowed(code,user,pageFor(row.contextType==='CUSTOMER'?'customer':'opportunity'),'suggestion-adopt'))throw new ApiException('FORBIDDEN',403,'无权处理建议待办');
  return this.db.$transaction(async tx=>{
   const current=await tx.sysPersonalTodo.findFirstOrThrow({where:{id,ownerUserId:user,applicationId:app.id}});
   if(current.status===input.status&&current.result===input.result)return {status:current.status};
   if(current.status!=='OPEN'||current.version!==input.version)throw new ApiException('BAD_REQUEST',409,'待办已处理或已被修改，请刷新');
   const changed=await tx.sysPersonalTodo.updateMany({where:{id,version:input.version,status:'OPEN'},data:{status:input.status,result:input.result,version:{increment:1}}});
   if(!changed.count)throw new ApiException('BAD_REQUEST',409,'待办已被修改');
   await tx.sysAuditLog.create({data:{tenantId:app.tenantId,applicationId:app.id,actorUserId:user,requestId:randomUUID(),resourceType:'sales-guidance',resourceId:row.contextId,actionCode:'suggestion.todo.result',afterSnapshot:{title:input.status==='DONE'?'建议待办已完成':'建议待办已取消',reason:input.result,todoId:id,kind:row.contextType==='CUSTOMER'?'customer':'opportunity',recipientId:user}}});
   return {status:input.status};
  });
 }
}
