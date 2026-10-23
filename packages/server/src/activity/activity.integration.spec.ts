import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { AgentService } from '../agent/agent.service';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { QuotationService } from '../quotation/quotation.service';
import { OpportunityService } from '../opportunity/opportunity.service';
import { ActivityService } from './activity.service';
import { timelinePageSchema, type ActivityWrite } from '@forge-crm/contracts';
import { resolveEffectiveRoleIds } from '../rbac/role-scope';
const run=process.env.RUN_TIMELINE_DB_TESTS==='1'?describe:describe.skip;
run('P3 actual activity timeline database and authorization',()=>{
 let app:INestApplication,db:DatabaseService,service:ActivityService,opps:OpportunityService;
 let customer:string,opp:string,actor:string,viewerId:string,scope:{id:string;tenantId:string},api:ReturnType<typeof request.agent>,csrf:string;
 const input=(title='拜访纪要'):ActivityWrite=>({type:'VISIT',title,content:'交流产品和交期',result:'需求已确认',nextStep:'安排评审',occurredAt:new Date(Date.now()-3600000).toISOString(),requestId:randomUUID()});
 const update=(v:ActivityWrite,version=1)=>({title:v.title,content:v.content,result:v.result,nextStep:v.nextStep,occurredAt:v.occurredAt,version,status:'ACTIVE',reason:'补充纪要'});
 beforeAll(async()=>{
  if(!/^\/sdd_timeline_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL!).pathname))throw new Error('ISOLATED_DB_REQUIRED');
  app=(await Test.createTestingModule({imports:[AppModule]}).compile()).createNestApplication();app.use(cookieParser());app.useGlobalFilters(new ApiExceptionFilter());await app.init();
  app.get(AgentService).onModuleDestroy();app.get(AiAnalysisService).onModuleDestroy();app.get(QuotationService).onModuleDestroy();
  db=app.get(DatabaseService);service=app.get(ActivityService);opps=app.get(OpportunityService);
  scope=await db.sysApplication.findFirstOrThrow({where:{applicationCode:'demo-portal'}});actor=(await db.iamUser.findFirstOrThrow({where:{tenantId:scope.tenantId,account:'admin'}})).id;viewerId=(await db.iamUser.findFirstOrThrow({where:{tenantId:scope.tenantId,account:'viewer'}})).id;
  customer=(await db.crmCustomer.create({data:{systemCode:'demo-portal',customerCode:'TL-C',customerName:'时间轴测试客户',shortName:'时间轴',categoryValue:'direct',statusValue:'active',createdBy:'admin',updatedBy:'admin'}})).id;
  const sample=await db.sdOpp.findFirstOrThrow({where:{applicationId:scope.id}});const {id:_,...copy}=sample;
  opp=(await db.sdOpp.create({data:{...copy,id:randomUUID(),opportunityCode:'TL-O',opportunityName:'时间轴商机',customerId:customer,customerName:'时间轴测试客户',businessStatus:'INITIAL',expectedSignDate:null,version:1}})).id;
  api=request.agent(app.getHttpServer());const session=await api.get('/api/auth/session');csrf=(session.headers['set-cookie']as unknown as string[]).map(c=>c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
  const login=await api.post('/api/auth/login').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send({account:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});expect(login.status).toBe(201);
  csrf=(login.headers['set-cookie']as unknown as string[]).map(c=>c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)??csrf;
 },60000);
 afterAll(async()=>{await app?.close();});
 it('creates customer and opportunity activities; follow-ups have a single authority and stable shared source key',async()=>{
  await service.create('demo-portal',actor,'admin','customer',customer,input());
  const v={...input('售前沟通'),type:'FOLLOW_UP' as const};const created=await service.create('demo-portal',actor,'admin','opportunity',opp,v);
  const again=await service.create('demo-portal',actor,'admin','opportunity',opp,v);expect(again).toEqual(created);
  expect(await db.sdSalesActivity.count({where:{opportunityId:opp}})).toBe(0);
  const c=await service.list('demo-portal',actor,'customer',customer,{}),o=await service.list('demo-portal',actor,'opportunity',opp,{});
  expect(timelinePageSchema.safeParse(c).success).toBe(true);expect(c.items.find(x=>x.sourceId===created.sourceId)?.key).toBe(o.items[0].key);
  const detail=await opps.detail('demo-portal',opp);expect(detail.followUps.find(f=>f.id===created.sourceId)).toMatchObject({resultNext:v.result,activityNextStep:v.nextStep});
  expect(o.items[0]).toMatchObject({title:'售前沟通',content:v.content,result:v.result,nextStep:v.nextStep,canEdit:true});
 });
 it('uses stable signed keyset pagination and excludes new backdated records from an existing snapshot',async()=>{
  const when=new Date(Date.now()-7200000).toISOString();for(let n=0;n<5;n++)await service.create('demo-portal',actor,'admin','customer',customer,{...input(`分页-${n}`),type:'NOTE',occurredAt:when});
  let page=await service.list('demo-portal',actor,'customer',customer,{pageSize:2,type:'NOTE'});const keys=page.items.map(i=>i.key),cursor=page.nextCursor!;
  const later=await service.create('demo-portal',actor,'admin','customer',customer,{...input('新补录'),type:'NOTE',occurredAt:when});
  while(page.nextCursor){page=await service.list('demo-portal',actor,'customer',customer,{pageSize:2,type:'NOTE',cursor:page.nextCursor});keys.push(...page.items.map(i=>i.key));}
  expect(keys).toHaveLength(5);expect(new Set(keys).size).toBe(5);expect(keys).not.toContain(`ACTIVITY:${later.sourceId}`);
  await expect(service.list('demo-portal',actor,'customer',customer,{pageSize:2,type:'VISIT',cursor})).rejects.toThrow('游标');
  await expect(service.list('demo-portal',actor,'customer',customer,{pageSize:2,type:'NOTE',cursor:cursor+'a'})).rejects.toThrow('游标');
 });
 it('makes activity create retries idempotent and rejects conflicting request payloads',async()=>{
  const v=input('幂等');const responses=await Promise.all([service.create('demo-portal',actor,'admin','customer',customer,v),service.create('demo-portal',actor,'admin','customer',customer,v)]);expect(responses[0]).toEqual(responses[1]);
  await expect(service.create('demo-portal',actor,'admin','customer',customer,{...v,title:'另一个标题'})).rejects.toThrow('请求号');
 });
 it('rejects future dates and forged system types/associations through both activity and original follow-up APIs',async()=>{
  await expect(service.create('demo-portal',actor,'admin','customer',customer,{...input(),occurredAt:new Date(Date.now()+60000).toISOString()})).rejects.toThrow('未来');
  await expect(opps.createFollowUp('demo-portal',opp,actor,'admin',{followedAt:new Date(Date.now()+60000).toISOString(),workItem:'未来'})).rejects.toThrow('未来');
  await expect(service.create('demo-portal',actor,'admin','customer',customer,{...input(),type:'SYSTEM'})).rejects.toThrow();
  await expect(service.create('demo-portal',actor,'admin','customer',customer,{...input(),customerId:randomUUID()})).rejects.toThrow();
 });
 it('revision, void and optimistic concurrency preserve history and system events stay read-only',async()=>{
  const v=input('待修订'),created=await service.create('demo-portal',actor,'admin','customer',customer,v);
  await service.update('demo-portal',actor,'admin','ACTIVITY',created.sourceId,{...update(v),content:'已补充'});
  await expect(service.update('demo-portal',actor,'admin','ACTIVITY',created.sourceId,update(v))).rejects.toThrow('修改');
  await service.update('demo-portal',actor,'admin','ACTIVITY',created.sourceId,{...update(v,2),status:'DISABLED',reason:'重复活动'});
  expect(await db.sysAuditLog.count({where:{resourceId:created.sourceId,resourceType:'sales-activity'}})).toBe(2);
  const row=(await service.list('demo-portal',actor,'customer',customer,{})).items.find(x=>x.sourceId===created.sourceId);expect(row).toMatchObject({status:'DISABLED',canEdit:false});
  await expect(service.update('demo-portal',actor,'admin','STAGE_EVENT',randomUUID(),update(v))).rejects.toThrow('只读');
 });
 it('original follow-up revisions are owner-only, audited and keep long legacy text',async()=>{
  const follow=await db.sdOppFollowUp.create({data:{opportunityId:opp,followedAt:new Date(Date.now()-10000),followerUserId:actor,followerName:'管理员',workItem:'长'.repeat(1000),resultNext:'结'.repeat(2000),createdBy:'admin',updatedBy:'admin'}});
  const row=(await service.list('demo-portal',actor,'opportunity',opp,{})).items.find(x=>x.sourceId===follow.id)!;
  await service.update('demo-portal',actor,'admin','FOLLOW_UP',follow.id,{title:row.title,content:row.content,result:row.result,nextStep:'',occurredAt:row.occurredAt,version:1,status:'ACTIVE',reason:'保留旧内容'});
  expect((await db.sdOppFollowUp.findUniqueOrThrow({where:{id:follow.id}})).workItem).toHaveLength(1000);
  await expect(opps.updateFollowUp('demo-portal',opp,follow.id,'viewer',{version:2,workItem:'越权'})).rejects.toThrow('自己');
  expect(await db.sysAuditLog.count({where:{resourceId:follow.id}})).toBe(1);
 });
 it('records lifecycle transitions in the original transaction and reads them as immutable system events',async()=>{
  const row=await db.sdOpp.findUniqueOrThrow({where:{id:opp}});
  await opps.updateOpportunity('demo-portal',opp,'admin',{version:row.version,businessStatus:'FOLLOWING'});
  const page=await service.list('demo-portal',actor,'opportunity',opp,{type:'SYSTEM'});
  expect(page.items.some(i=>i.sourceType==='STATUS_EVENT'&&i.content.includes('初始')&&i.content.includes('跟进中'))).toBe(true);expect(page.items.every(i=>!i.canEdit)).toBe(true);
 });
 it('enforces DB application/customer/creator scope constraints',async()=>{
  const row=await db.sdSalesActivity.findFirstOrThrow({where:{customerId:customer}});
  await expect(db.sdSalesActivity.create({data:{...row,id:randomUUID(),requestId:randomUUID(),tenantId:randomUUID()}})).rejects.toThrow();
  const other=await db.crmCustomer.create({data:{systemCode:'other-system',customerCode:'TL-OTHER',customerName:'其他系统',shortName:'其他',categoryValue:'direct',statusValue:'active',createdBy:'test',updatedBy:'test'}});
  await expect(db.sdSalesActivity.create({data:{...row,id:randomUUID(),requestId:randomUUID(),customerId:other.id}})).rejects.toThrow();
  await expect(service.list('demo-portal',actor,'customer',other.id,{})).rejects.toThrow();
 });
 it('activity attachments use source permissions, preserve product behavior, and fail after revoking source view',async()=>{
  const created=await service.create('demo-portal',actor,'admin','opportunity',opp,input('附件活动'));
  const upload=await api.post('/api/systems/demo-portal/attachments').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).field('ownerType','SALES_ACTIVITY').field('ownerId',created.sourceId).attach('file',Buffer.from('activity document'),{filename:'note.txt',contentType:'text/plain'});
  expect(upload.status).toBe(201);const fileId=upload.body.id;
  const download=await api.get(`/api/systems/demo-portal/attachments/${fileId}/download`);expect(download.status).toBe(200);expect(download.headers['content-disposition']).toContain('attachment;');
  const product=await db.mdItem.findFirstOrThrow({where:{tenantId:scope.tenantId,itemType:'PRODUCT'}});expect((await api.get(`/api/systems/demo-portal/attachments?ownerType=PRODUCT&ownerId=${product.id}`)).status).toBe(200);
  const roles=await resolveEffectiveRoleIds(db,scope.id,actor);
  const where={roleId:{in:roles},permission:{resourceCode:'opportunity-directory',actionCode:'view'}};
  const grants=await db.iamRolePermission.findMany({where});await db.iamRolePermission.updateMany({where,data:{status:'DISABLED'}});
  try {
   expect((await api.get(`/api/systems/demo-portal/attachments/${fileId}/download`)).status).toBe(403);
   const page=await service.list('demo-portal',actor,'customer',customer,{});expect(page.items.every(i=>i.opportunityId===null)).toBe(true);
  }finally{for(const g of grants)await db.iamRolePermission.update({where:{id:g.id},data:{status:g.status}});}
 });
 it('limits activity attachments and blocks uploading after void without affecting prior files',async()=>{
  const created=await service.create('demo-portal',actor,'admin','customer',customer,input('附件数量'));
  const send=()=>api.post('/api/systems/demo-portal/attachments').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).field('ownerType','SALES_ACTIVITY').field('ownerId',created.sourceId).attach('file',Buffer.from('test'),{filename:'small.txt',contentType:'text/plain'});
  for(let n=0;n<10;n++)expect((await send()).status).toBe(201);
  expect((await send()).status).toBe(400);
  await db.sdSalesActivity.update({where:{id:created.sourceId},data:{status:'DISABLED'}});
  expect((await send()).status).toBe(403);expect(await db.sysAttachment.count({where:{ownerId:created.sourceId}})).toBe(10);
 });
 it('denies anonymous requests and blocks writing another authors record through HTTP',async()=>{
  expect((await request(app.getHttpServer()).get(`/api/systems/demo-portal/activity-timeline/customer/${customer}`)).status).toBe(401);
  const data=input(),created=await service.create('demo-portal',actor,'admin','customer',customer,data);
  await db.sdSalesActivity.update({where:{id:created.sourceId},data:{creatorId:viewerId}});
  const result=await api.patch(`/api/systems/demo-portal/activity-timeline/entries/ACTIVITY/${created.sourceId}`).set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send(update(data));expect(result.status).toBe(403);
 });
});
