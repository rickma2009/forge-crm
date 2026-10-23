import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../rbac/authorization.service';
import { RolePolicyService } from '../role-management/role-policy.service';
import { CustomerService } from '../customer/customer.service';
import { ApiException } from '../http/api-exceptions';
@Injectable()
export class ActivityAccessService {
 constructor(private readonly db:DatabaseService, private readonly auth:AuthorizationService, private readonly policies:RolePolicyService, private readonly customers:CustomerService) {}
 async allowed(code:string,user:string,page:string,action:string) { try { await this.auth.assertAction(user,code,page,action); return true; } catch(e) { if(e instanceof ApiException && e.getStatus()===403)return false; throw e; } }
 async scope(code:string,user:string,kind:string,id:string,write=false) {
  z.enum(['customer','opportunity']).parse(kind); z.string().uuid().parse(id);
  const app=await this.db.sysApplication.findFirst({where:{applicationCode:code,status:'ACTIVE'},select:{id:true,tenantId:true}});
  if(!app)throw new ApiException('NOT_FOUND',404,'系统不存在');
  const page=kind==='customer'?'customer-directory':'opportunity-directory';
  await this.auth.assertAction(user,code,page,'view');
  if(write)await this.auth.assertAction(user,code,page,kind==='customer'?'update':'follow-up');
  if(kind==='customer') {
   await this.customers.assertScopedCustomer(code,id,await this.policies.customerScope(code,user,'read'));
   if(write)await this.customers.assertScopedCustomer(code,id,await this.policies.customerScope(code,user,'update'));
   return {...app,customerId:id,opportunityId:null};
  }
  const opp=await this.db.sdOpp.findFirst({where:{id,applicationId:app.id,tenantId:app.tenantId},select:{id:true,customerId:true}});
  if(!opp)throw new ApiException('NOT_FOUND',404,'商机不存在');
  return {...app,customerId:opp.customerId,opportunityId:opp.id};
 }
 async record(code:string,user:string,type:string,id:string,write=false) {
  z.string().uuid().parse(id);
  const app=await this.db.sysApplication.findFirst({where:{applicationCode:code,status:'ACTIVE'}});
  if(!app)throw new ApiException('NOT_FOUND',404,'系统不存在');
  if(type==='RECORD_COMMENT') {
   const row=await this.db.sdRecordComment.findFirst({where:{id,applicationId:app.id,tenantId:app.tenantId}});
   if(!row)throw new ApiException('NOT_FOUND',404,'评论不存在');
   const kind=row.opportunityId?'opportunity':'customer',page=kind==='customer'?'customer-directory':'opportunity-directory';
   await this.scope(code,user,kind,row.opportunityId??row.customerId!);
   await this.auth.assertAction(user,code,page,'comment-view');
   if(write)await this.auth.assertAction(user,code,page,'comment-create');
   if(!['DRAFT','PUBLISHED'].includes(row.state)||(row.state==='DRAFT'&&(row.authorId!==user||row.expiresAt<=new Date()))||(write&&(row.state!=='DRAFT'||row.authorId!==user)))throw new ApiException('FORBIDDEN',403,'评论附件不可访问或已冻结');
   return row;
  }
  if(type==='SALES_ACTIVITY') {
   const row=await this.db.sdSalesActivity.findFirst({where:{id,applicationId:app.id,tenantId:app.tenantId}});
   if(!row)throw new ApiException('NOT_FOUND',404,'活动不存在');
   await this.scope(code,user,row.opportunityId?'opportunity':'customer',row.opportunityId??row.customerId,write);
   if(write&&(row.creatorId!==user||row.status!=='ACTIVE'))throw new ApiException('FORBIDDEN',403,'只能维护自己创建的有效活动');
   return row;
  }
  if(type==='OPPORTUNITY_FOLLOW_UP') {
   const row=await this.db.sdOppFollowUp.findFirst({where:{id,opportunity:{applicationId:app.id,tenantId:app.tenantId}}});
   if(!row)throw new ApiException('NOT_FOUND',404,'跟进不存在');
   await this.scope(code,user,'opportunity',row.opportunityId,write);
   if(write&&(row.followerUserId!==user||row.status!=='ACTIVE'))throw new ApiException('FORBIDDEN',403,'只能维护自己创建的有效跟进');
   return row;
  }
  throw new ApiException('BAD_REQUEST',400,'活动来源不支持此操作');
 }
}
