import { createHash } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import type { RecordKind, ScoreDimension, ScoreRuleConfig } from '@forge-crm/contracts';
export type SalesScope={id:string;tenantId:string};
export const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export function salesDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export const dayDistance=(a:Date,b:Date)=>Math.floor((Date.parse(salesDay(a))-Date.parse(salesDay(b)))/86400000);
export const pageFor=(kind:string)=>kind==='customer'?'customer-directory':'opportunity-directory';
export const isOpen=(row:{status:string;businessStatus:string})=>row.status==='ACTIVE'&&['INITIAL','FOLLOWING'].includes(row.businessStatus);
export async function salesFacts(tx:Prisma.TransactionClient,scope:SalesScope,code:string,kind:RecordKind,id:string,canOpp:boolean,now=new Date()){
 const opp=kind==='opportunity'?await tx.sdOpp.findFirstOrThrow({where:{id,tenantId:scope.tenantId,applicationId:scope.id},include:{products:true}}):null;
 const customer=kind==='customer'?await tx.crmCustomer.findFirstOrThrow({where:{id,systemCode:code}}):null;
 const parents=opp?[opp.id]:canOpp?(await tx.sdOpp.findMany({where:{customerId:id,tenantId:scope.tenantId,applicationId:scope.id},select:{id:true}})).map(x=>x.id):[];
 const activity=await tx.sdSalesActivity.findFirst({where:{tenantId:scope.tenantId,applicationId:scope.id,status:'ACTIVE',type:{in:['VISIT','CALL','EMAIL','FOLLOW_UP']},occurredAt:{lte:now},...(opp?{opportunityId:id}:{customerId:id,OR:[{opportunityId:null},{opportunityId:{in:parents}}]})},orderBy:[{occurredAt:'desc'},{id:'desc'}]});
 const follow=parents.length?await tx.sdOppFollowUp.findFirst({where:{opportunityId:{in:parents},status:'ACTIVE',followedAt:{lte:now}},orderBy:[{followedAt:'desc'},{id:'desc'}]}):null;
 const latest=[activity?.occurredAt,follow?.followedAt].filter((x):x is Date=>!!x).sort((a,b)=>b.getTime()-a.getTime())[0]??null;
 const contact=opp?.contactId?await tx.crmCustomerContact.findFirst({where:{id:opp.contactId,customerId:opp.customerId,systemCode:code,status:'ACTIVE'}}):null;
 const owner=opp?await tx.iamUser.findFirst({where:{id:opp.ownerUserId,tenantId:scope.tenantId,status:'ACTIVE'}}):null;
 const products=opp?.products??[];
 const activeIds=products.length?(await tx.mdItem.findMany({where:{id:{in:products.map(p=>p.productId)},tenantId:scope.tenantId,status:'ACTIVE'},select:{id:true}})).map(p=>p.id):[];
 const validProducts=products.filter(p=>activeIds.includes(p.productId)&&p.quantity.greaterThan(0));
 const hasRequirement=validProducts.some(p=>!!p.requirement?.trim());
 const missing=[...(!contact?['联系人']:[]),...(!hasRequirement?['需求说明']:[]),...(!validProducts.length?['有效产品']:[])];
 const createdAt=(opp??customer)!.createdAt;
 const basis={day:salesDay(now),kind,id,version:(opp??customer)!.version,canOpp,lastActivity:latest?.toISOString()??null,activityVersion:activity?.version??0,followVersion:follow?.version??0,contact:contact?.updatedAt.toISOString()??null,owner:owner?.updatedAt.toISOString()??null,products:validProducts.map(p=>({id:p.id,version:p.version})),missing};
 const candidates:Array<{ruleCode:string;title:string;reason:string;basisAt:string;cycleKey:string}>=[];
 if(!opp||isOpen(opp)){
  const anchor=latest??createdAt;const age=dayDistance(now,anchor);
  if(age>7)candidates.push({ruleCode:'R01',title:'联系客户并补充跟进',reason:`${latest?'最近有效活动':'创建后尚无有效活动'}已超过${age}个自然日${kind==='customer'?'（基于当前可见记录）':''}`,basisAt:anchor.toISOString(),cycleKey:hash({rule:'R01',anchor:anchor.toISOString()})});
  if(opp?.expectedSignDate&&opp.expectedSignDate.toISOString().slice(0,10)<salesDay(now))candidates.push({ruleCode:'R02',title:'确认签约日期及风险',reason:`预计签约日期 ${opp.expectedSignDate.toISOString().slice(0,10)} 已过期，需人工确认`,basisAt:opp.expectedSignDate.toISOString(),cycleKey:hash({rule:'R02',date:opp.expectedSignDate.toISOString()})});
  if(opp&&missing.length)candidates.push({ruleCode:'R03',title:'完善商机关键信息',reason:`缺少：${missing.join('、')}`,basisAt:opp.updatedAt.toISOString(),cycleKey:hash({rule:'R03',missing})});
 }
 return {opp,customer,latest,contact,owner,validProducts,hasRequirement,basis,inputHash:hash(basis),candidates};
}
export function scoreDimensions(facts:Awaited<ReturnType<typeof salesFacts>>,config:ScoreRuleConfig,now=new Date()):ScoreDimension[]{
 const opp=facts.opp!;
 const checks:[[boolean,string],[boolean,string],[boolean,string],[boolean,string],[boolean,string],[boolean,string]]=[
 [!!opp.customerId,'客户'],[!!facts.contact,'有效联系人'],[facts.hasRequirement,'明确需求'],[!!opp.expectedSignDate&&opp.expectedSignDate.toISOString().slice(0,10)>salesDay(now),'未来预计签约日期'],[!!facts.owner,'有效负责人'],[facts.validProducts.length>0,'有效产品行']];
 const source=opp.source?.trim();const sourceScore=source&&Object.prototype.hasOwnProperty.call(config.sourceScores,source)?config.sourceScores[source]:undefined;
 const age=facts.latest?dayDistance(now,facts.latest):null;
 const thresholds=opp.currencyCode?config.amountThresholds[opp.currencyCode]:undefined;
 let amount=0;let amountReason='未配置币别或该币别金额阈值，不可评估';
 if(thresholds){if(opp.expectedAmount===null)amountReason='预计金额未填写，不可评估';else{thresholds.forEach((t,i)=>{if(opp.expectedAmount!.greaterThanOrEqualTo(t))amount=(i+1)*10;});amountReason=`${opp.currencyCode} ${opp.expectedAmount.toFixed(2)}；阈值 ${thresholds.join(' / ')}`;}}
 return [
 {code:'completeness',label:'信息完整度',score:checks.filter(x=>x[0]).length*5,max:30,reasons:checks.map(([yes,label])=>`${label}：${yes?'已满足 +5':'缺失或不符合 +0'}`)},
 {code:'source',label:'来源质量',score:sourceScore??0,max:20,reasons:[sourceScore===undefined?'来源未配置评分映射，按0分并标记未评估':`${source}：命中已配置规则 +${sourceScore}`]},
 {code:'activity',label:'有效活跃度',score:age===null||age>14?0:age<=7?20:10,max:20,reasons:[age===null?'暂无有效活动；备注、评论、系统事件和待办不计分':`距最近有效活动${age}个自然日`]},
 {code:'amount',label:'金额潜力',score:amount,max:30,reasons:[amountReason]},
 ];
}
