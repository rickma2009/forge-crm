import type {Prisma} from '../../generated/prisma/client';
import {ApiException} from '../../http/api-exceptions';
/** Business-owned mutation; receipt and outgoing result are committed by the calling CRM transaction. */
export async function applySalesApproval(tx:Prisma.TransactionClient,input:{id:string;tenantId:string;applicationId:string;orderId:string;applicantId:string;effectId:string|null},executionId:string,version:number,actorId:string){
 if(input.effectId){if(input.effectId!==executionId)throw new ApiException('BAD_REQUEST',409,'业务执行标识不一致');return;}
 const order=await tx.sdSalesOrder.findFirst({where:{id:input.orderId,tenantId:input.tenantId,applicationId:input.applicationId,status:'SUBMITTED',version},include:{lines:true}});
 if(!order||actorId===input.applicantId)throw new ApiException('BAD_REQUEST',409,'订单状态、版本或审核人不满足审核条件');
 const changed=await tx.sdSalesOrder.updateMany({where:{id:order.id,tenantId:input.tenantId,applicationId:input.applicationId,version,status:'SUBMITTED'},data:{status:'APPROVED',approvedBy:actorId,approvedAt:new Date(),version:{increment:1}}});
 if(changed.count!==1)throw new ApiException('BAD_REQUEST',409,'订单已被其他操作更新');
 await tx.sdSalesEvent.create({data:{tenantId:input.tenantId,applicationId:input.applicationId,documentType:'ORDER',documentId:order.id,action:'approve',actorId,requestKey:input.id,note:'工作流审核生效'}});
 await tx.sysWfApproval.update({where:{id:input.id},data:{effectId:executionId}});
}
