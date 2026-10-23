import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { codeRuleWriteSchema, codeAllocationSchema } from '@forge-crm/contracts';
import { Prisma, type SysCodeRule } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

type Tx=Prisma.TransactionClient;
const fail=(message:string,status=409):never=>{throw new ApiException('BAD_REQUEST',status,message);};
const querySchema=z.object({keyword:z.string().trim().max(128).optional(),status:z.enum(['ACTIVE','DISABLED']).optional(),page:z.coerce.number().int().positive().default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20)}).strict();
export function codeLeader(rule:Pick<SysCodeRule,'prefix'|'hasPrefix'|'hasDate'|'dateType'>,now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const date=rule.hasDate?(rule.dateType==='YEAR'?part('year'):rule.dateType==='MONTH'?part('year')+part('month'):part('year')+part('month')+part('day')):'';
 return {leader:(rule.hasPrefix?rule.prefix:'')+date,namespace:`${rule.hasPrefix?rule.prefix:''}|${date}`};
}

@Injectable()
export class NumberingService {
 constructor(private readonly db:DatabaseService){}
 private async scope(code:string){const rows=await this.db.sysApplication.findMany({where:{applicationCode:code,status:'ACTIVE',tenant:{status:'ACTIVE'}},take:2});if(rows.length!==1)fail('系统不存在或作用域不明确',404);return rows[0];}
 private lock(tx:Tx,tenantId:string,objectCode:string){return tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`code:${tenantId}:${objectCode}`},0))::text`;}
 // Static trusted adapters only. Never accept table/column names from a request or rule.
 private legacy(tenantId:string,objectCode:string):Prisma.Sql {
  const map:Record<string,[string,string]>={SUPPLIER:['md_supplier','supplier_code'],PURCHASE_ORDER:['scm_purchase_order','order_no'],EMPLOYEE:['org_employment','employee_no'],OPPORTUNITY:['sd_opp','opportunity_code'],QUOTATION:['sd_quotation','quote_code'],SALES_ORDER:['sd_sales_order','order_no'],INBOUND:['scm_inbound_order','order_no'],OUTBOUND:['sd_sales_outbound','outbound_no']};
  if(objectCode==='CUSTOMER')return Prisma.sql`SELECT c.customer_code AS code FROM crm_customer c JOIN sys_application a ON a.application_code=c.system_code WHERE a.tenant_id=${tenantId}::uuid`;
  if(objectCode==='INBOUND')return Prisma.sql`SELECT order_no AS code FROM scm_inbound_order WHERE tenant_id=${tenantId}::uuid UNION ALL SELECT receipt_no AS code FROM scm_purchase_receipt WHERE tenant_id=${tenantId}::uuid`;
  const entry=map[objectCode];if(!entry)return Prisma.sql`SELECT ''::text AS code WHERE false`;
  return Prisma.sql`SELECT ${Prisma.raw(entry[1])} AS code FROM ${Prisma.raw(entry[0])} WHERE tenant_id=${tenantId}::uuid`;
 }
 private async used(tx:Tx,rule:SysCodeRule){const [row]=await tx.$queryRaw<{used:boolean}[]>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM sys_code_issue WHERE tenant_id=${rule.tenantId}::uuid AND object_code=${rule.objectCode}) OR EXISTS(${this.legacy(rule.tenantId,rule.objectCode)}) AS used`);return row.used;}
 async list(code:string,raw:unknown){const app=await this.scope(code),q=querySchema.parse(raw);const where={tenantId:app.tenantId,applicationId:app.id,deletedAt:null,...(q.status?{status:q.status}:{}),...(q.keyword?{OR:[{objectCode:{contains:q.keyword,mode:'insensitive' as const}},{objectName:{contains:q.keyword,mode:'insensitive' as const}}]}:{})};return this.db.$transaction(async tx=>{const [rows,total]=await Promise.all([tx.sysCodeRule.findMany({where,orderBy:[{sortNo:'asc'},{objectCode:'asc'}],take:q.pageSize,skip:(q.page-1)*q.pageSize}),tx.sysCodeRule.count({where})]);return {items:await Promise.all(rows.map(async r=>({id:r.id,objectCode:r.objectCode,objectName:r.objectName,sortNo:r.sortNo,hasPrefix:r.hasPrefix,prefix:r.prefix,hasDate:r.hasDate,dateType:r.dateType,digits:r.digits,startNumber:Number(r.startNumber),status:r.status,version:r.version,used:await this.used(tx,r),preview:codeLeader(r).leader+String(r.startNumber).padStart(r.digits,'0')}))),pagination:{page:q.page,pageSize:q.pageSize,total,totalPages:Math.ceil(total/q.pageSize)}};},{isolationLevel:'RepeatableRead'});}
 async save(code:string,id:string|null,actorId:string,raw:unknown){const app=await this.scope(code),input=codeRuleWriteSchema.parse(raw);if(id)z.string().uuid().parse(id);const {version,...fields}=input;return this.db.$transaction(async tx=>{
  await this.lock(tx,app.tenantId,input.objectCode);
  const old=await tx.sysCodeRule.findFirst({where:{tenantId:app.tenantId,applicationId:app.id,...(id?{id}:{objectCode:input.objectCode})}});
  if(id&&(!old||old.deletedAt))fail('规则不存在',404);
  if(id&&old!.objectCode!==input.objectCode)fail('对象编码创建后不可修改',400);
  if(id&&old!.version!==version)fail('规则已被修改，请刷新后重试');
  if(!id&&old&&!old.deletedAt)fail('该对象已经存在编码规则');
  if(!id&&version!==0)fail('新规则版本必须为0',400);
  const data={...fields,startNumber:BigInt(input.startNumber),deletedAt:null};
  const row=old?await tx.sysCodeRule.update({where:{id:old.id},data:{...data,version:{increment:1}}}):await tx.sysCodeRule.create({data:{...data,tenantId:app.tenantId,applicationId:app.id}});
  await this.audit(tx,app,actorId,row.id,id?'update':'create',old,row);return {id:row.id};
 });}
 async remove(code:string,id:string,actorId:string,raw:unknown){z.string().uuid().parse(id);const {version}=z.object({version:z.number().int().positive()}).strict().parse(raw),app=await this.scope(code);return this.db.$transaction(async tx=>{const row=await tx.sysCodeRule.findFirst({where:{id,tenantId:app.tenantId,applicationId:app.id,deletedAt:null}});if(!row)fail('规则不存在',404);await this.lock(tx,app.tenantId,row!.objectCode);const current=await tx.sysCodeRule.findUniqueOrThrow({where:{id}});if(current.deletedAt||current.version!==version)fail('规则已变化，请刷新');if(await this.used(tx,current))fail('该对象已有编码记录，只能停用规则');const updated=await tx.sysCodeRule.update({where:{id},data:{deletedAt:new Date(),status:'DISABLED',version:{increment:1}}});await this.audit(tx,app,actorId,id,'delete',current,updated);return {deleted:true};});}
 private audit(tx:Tx,app:{id:string;tenantId:string},actorUserId:string,id:string,action:string,before:SysCodeRule|null,after:SysCodeRule){const snapshot=(v:SysCodeRule)=>JSON.parse(JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x));return tx.sysAuditLog.create({data:{tenantId:app.tenantId,applicationId:app.id,actorUserId,requestId:randomUUID(),resourceType:'code-rule',resourceId:id,actionCode:`numbering.${action}`,...(before?{beforeSnapshot:snapshot(before)}:{}),afterSnapshot:snapshot(after)}});}
 /** Independent committed allocation: no business transaction may delete/recycle this issue. */
 async allocate(code:string,objectCode:string,requestId:string=randomUUID(),now=new Date()):Promise<string>{
  codeAllocationSchema.parse({objectCode,requestId});const app=await this.scope(code);
  return this.db.$transaction(async tx=>{
   await this.lock(tx,app.tenantId,objectCode);
   const prior=await tx.sysCodeIssue.findUnique({where:{applicationId_objectCode_requestId:{applicationId:app.id,objectCode,requestId}}});if(prior)return prior.code;
   const rule=await tx.sysCodeRule.findFirst({where:{tenantId:app.tenantId,applicationId:app.id,objectCode,deletedAt:null}});
   if(!rule||rule.status!=='ACTIVE')fail(`对象 ${objectCode} 未配置启用的编码规则`);
   const {leader,namespace}=codeLeader(rule!,now);
   const key={tenantId:app.tenantId,objectCode,namespace};const counter=await tx.sysCodeCounter.findUnique({where:{tenantId_objectCode_namespace:key}});
   // Scan matching legacy/issued format while locked; the persistent counter never moves backwards.
   const pattern=`^${leader}[0-9]{${rule!.digits}}$`;
   const [existing]=await tx.$queryRaw<{maximum:bigint|null}[]>(Prisma.sql`SELECT max(substring(code from ${leader.length+1}::integer)::bigint) AS maximum FROM (${this.legacy(app.tenantId,objectCode)} UNION ALL SELECT code FROM sys_code_issue WHERE tenant_id=${app.tenantId}::uuid AND object_code=${objectCode}) numbers WHERE code ~ ${pattern}`);
   let n=rule!.startNumber;for(const v of [counter?.currentValue??0n,existing.maximum??0n])if(v>=n)n=v+1n;
   if(n>=10n**BigInt(rule!.digits))fail(`对象 ${objectCode} 的流水号已耗尽，请增加流水号位数`);
   const number=leader+String(n).padStart(rule!.digits,'0');
   await tx.sysCodeCounter.upsert({where:{tenantId_objectCode_namespace:key},create:{...key,currentValue:n},update:{currentValue:n}});
   await tx.sysCodeIssue.create({data:{tenantId:app.tenantId,applicationId:app.id,ruleId:rule!.id,objectCode,requestId,code:number,ruleVersion:rule!.version}});
   return number;
  },{maxWait:10000,timeout:15000});
 }
}
