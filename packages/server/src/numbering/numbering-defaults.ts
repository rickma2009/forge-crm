import type { Prisma } from '../generated/prisma/client';
export const numberingDefaults = [
 ['CUSTOMER','客户','C',7,'NONE'],['SUPPLIER','供应商','S',7,'NONE'],['EMPLOYEE','员工','1',6,'NONE'],
 ['OPPORTUNITY','商机编码','OP',5,'DAY'],['QUOTATION','报价单','QT',5,'DAY'],['SALES_ORDER','销售订单','SO',5,'DAY'],
 ['PURCHASE_ORDER','采购订单','PO',5,'DAY'],['INBOUND','入库单','IB',5,'DAY'],['OUTBOUND','出库单','OB',5,'DAY'],
 ['SALES_RETURN','销售退货单','SR',5,'DAY'],['PURCHASE_RETURN','采购退货单','PR',5,'DAY'],['TRANSFER','调拨单','TR',5,'DAY'],
] as const;
export async function initializeNumberingRules(tx:Prisma.TransactionClient,codes:string[]){
 const apps=await tx.sysApplication.findMany({where:{applicationCode:{in:codes},status:'ACTIVE'}});
 for(const app of apps)for(const [i,[objectCode,objectName,prefix,digits,dateType]] of numberingDefaults.entries())await tx.sysCodeRule.upsert({where:{applicationId_objectCode:{applicationId:app.id,objectCode}},update:{},create:{tenantId:app.tenantId,applicationId:app.id,objectCode,objectName,prefix,digits,dateType,hasPrefix:true,hasDate:dateType!=='NONE',sortNo:(i+1)*10}});
}
