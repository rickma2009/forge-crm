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
import { ActivityService } from '../activity/activity.service';
import { PersonalAgentService } from '../agent/personal-agent.service';
import { WorkbenchService } from '../workbench/workbench.service';
import { SuggestionService } from './suggestion.service';
import { ScoreService } from './score.service';
import { CommentService } from '../record-collaboration/comment.service';
import { NotificationService } from '../notification/notification.service';
import { PersonalTodoService } from '../personal-todo/personal-todo.service';
import { initializeSalesEnhancement } from './initialize-sales-enhancement';
import { scoreRuleConfigSchema,priorityScoreSchema,suggestionPageSchema,commentPageSchema,notificationPageSchema } from '@forge-crm/contracts';
const run=process.env.RUN_SALESX_DB_TESTS==='1'?describe:describe.skip;
run('P4-P6 actual database, HTTP and permission integration',()=>{
 let app:INestApplication,db:DatabaseService,suggestions:SuggestionService,scores:ScoreService,comments:CommentService,notifications:NotificationService,activities:ActivityService,todos:PersonalTodoService;
 let actor:string,viewer:string,customer:string,scope:{id:string;tenantId:string},viewerRole:string,api:ReturnType<typeof request.agent>,csrf:string;
 const base='/api/systems/demo-portal/sales-interaction';
 const old=new Date(Date.now()-20*86400000),future=new Date(Date.now()+20*86400000);
 const write=(path:string,body:object)=>api.post(path).set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send(body);
 async function opportunity(){const sample=await db.sdOpp.findFirstOrThrow({where:{applicationId:scope.id}});const {id:_,...data}=sample;return db.sdOpp.create({data:{...data,id:randomUUID(),opportunityCode:`SX-${randomUUID().slice(0,8)}`,opportunityName:'销售交互测试',customerId:customer,customerName:'交互测试客户',contactId:null,contactName:null,status:'ACTIVE',businessStatus:'FOLLOWING',createdAt:old,expectedSignDate:new Date(Date.now()-86400000),source:null,currencyCode:null,version:1}});}
 async function grant(action:string,enabled=true,menu='opportunity-directory'){const p=await db.sysPermission.findFirstOrThrow({where:{applicationId:scope.id,resourceCode:menu,actionCode:action}});await db.iamRolePermission.upsert({where:{roleId_permissionId:{roleId:viewerRole,permissionId:p.id}},create:{applicationId:scope.id,roleId:viewerRole,permissionId:p.id,status:enabled?'ACTIVE':'DISABLED'},update:{status:enabled?'ACTIVE':'DISABLED'}});}
 const action=(s:{version:number;inputHash:string},a='ADOPT')=>({action:a,version:s.version,inputHash:s.inputHash,requestId:randomUUID(),title:'联系并确认需求',description:'测试建议待办'});
 async function published(opp:string,mentionUserIds:string[]=[],rootCommentId:string|null=null){const draft=await comments.draft('demo-portal',actor,'admin','opportunity',opp,{requestId:randomUUID(),rootCommentId});await comments.publishOrEdit('demo-portal',actor,draft.id,{body:'协作内容 <script>不会执行</script>',version:draft.version,mentionUserIds});return db.sdRecordComment.findUniqueOrThrow({where:{id:draft.id}});}
 beforeAll(async()=>{
  if(!/^\/sdd_salesx_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL!).pathname))throw new Error('ISOLATED_DB_REQUIRED');
  app=(await Test.createTestingModule({imports:[AppModule]}).compile()).createNestApplication();app.use(cookieParser());app.useGlobalFilters(new ApiExceptionFilter());await app.init();
  app.get(AgentService).onModuleDestroy();app.get(AiAnalysisService).onModuleDestroy();app.get(QuotationService).onModuleDestroy();app.get(ScoreService).onModuleDestroy();app.get(SuggestionService).onModuleDestroy();app.get(NotificationService).onModuleDestroy();
  db=app.get(DatabaseService);suggestions=app.get(SuggestionService);scores=app.get(ScoreService);comments=app.get(CommentService);notifications=app.get(NotificationService);activities=app.get(ActivityService);todos=app.get(PersonalTodoService);
  scope=await db.sysApplication.findFirstOrThrow({where:{applicationCode:'demo-portal'}});actor=(await db.iamUser.findFirstOrThrow({where:{tenantId:scope.tenantId,account:'admin'}})).id;viewer=(await db.iamUser.findFirstOrThrow({where:{tenantId:scope.tenantId,account:'viewer'}})).id;viewerRole=(await db.iamRole.findFirstOrThrow({where:{applicationId:scope.id,roleCode:'viewer'}})).id;
  await initializeSalesEnhancement(db,'demo-portal');
  customer=(await db.crmCustomer.create({data:{systemCode:'demo-portal',customerCode:'SX-C',customerName:'交互测试客户',shortName:'交互测试',categoryValue:'direct',statusValue:'active',createdBy:'admin',updatedBy:'admin',createdAt:old}})).id;
  api=request.agent(app.getHttpServer());const session=await api.get('/api/auth/session');csrf=(session.headers['set-cookie']as unknown as string[]).map(c=>c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
  const login=await write('/api/auth/login',{account:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});expect(login.status).toBe(201);csrf=(login.headers['set-cookie']as unknown as string[]).map(c=>c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)??csrf;
 },60000);
 afterAll(async()=>{await app?.close();});
 it('initialization is scoped, repeatable, and preserves human rules and non-admin grants',async()=>{
  const rule=await db.sdScoreRuleSet.findFirstOrThrow({where:{applicationId:scope.id}});await db.sdScoreRuleSet.update({where:{id:rule.id},data:{config:{sourceScores:{manual:7},amountThresholds:{}}}});
  const before=await db.sysPermission.count();await initializeSalesEnhancement(db,'demo-portal');await initializeSalesEnhancement(db,'demo-portal');
  expect(await db.sysPermission.count()).toBe(before);expect((await db.sdScoreRuleSet.findUniqueOrThrow({where:{id:rule.id}})).config).toMatchObject({sourceScores:{manual:7}});
  const opp=await opportunity();await expect(suggestions.list('demo-portal',viewer,'opportunity',opp.id)).rejects.toThrow('无权');await expect(scores.get('demo-portal',viewer,opp.id)).rejects.toThrow('无权');
 });
 it('evaluates R01/R02/R03 and excludes notes and future activity from effective follow-up',async()=>{
  const opp=await opportunity();await activities.create('demo-portal',actor,'admin','opportunity',opp.id,{type:'NOTE',title:'备注',content:'仅备注',result:'',nextStep:'',occurredAt:new Date().toISOString(),requestId:randomUUID()});
  const page=await suggestions.list('demo-portal',actor,'opportunity',opp.id);expect(suggestionPageSchema.safeParse(page).success).toBe(true);expect(page.items.map(s=>s.ruleCode).sort()).toEqual(['R01','R02','R03']);
  await activities.create('demo-portal',actor,'admin','opportunity',opp.id,{type:'CALL',title:'实际电话',content:'已通话',result:'',nextStep:'',occurredAt:new Date().toISOString(),requestId:randomUUID()});
  expect((await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items.find(s=>s.ruleCode==='R01')?.state).toBe('EXPIRED');
 });
 it('adopts concurrently exactly once with one todo and one timeline event',async()=>{
  const opp=await opportunity(),s=(await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items.find(s=>s.ruleCode==='R03')!;
  const input=action(s);const results=await Promise.all([suggestions.action('demo-portal',actor,s.id,input),suggestions.action('demo-portal',actor,s.id,input)]);expect(results[0]).toEqual(results[1]);
  expect(await db.sysPersonalTodo.count({where:{sourceSuggestionId:s.id}})).toBe(1);expect(await db.sysAuditLog.count({where:{resourceId:opp.id,actionCode:'suggestion.adopt'}})).toBe(1);
  const timeline=await activities.list('demo-portal',actor,'opportunity',opp.id,{});expect(timeline.items.some(r=>r.sourceType==='GUIDANCE_EVENT'&&!r.canEdit)).toBe(true);
 });
 it('rejects stale adoption, expires closed records, and restores ignored/snoozed conditions',async()=>{
  const opp=await opportunity();let s=(await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items[0];await db.sdOpp.update({where:{id:opp.id},data:{version:{increment:1}}});await expect(suggestions.action('demo-portal',actor,s.id,action(s))).rejects.toThrow('变化');
  s=(await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items[0];await suggestions.action('demo-portal',actor,s.id,action(s,'IGNORE'));expect((await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items.find(x=>x.id===s.id)?.state).toBe('IGNORED');
  await db.sdSalesSuggestion.update({where:{id:s.id},data:{resumeAt:old}});s=(await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items.find(x=>x.id===s.id)!;expect(s.state).toBe('ACTIVE');await suggestions.action('demo-portal',actor,s.id,{...action(s,'SNOOZE'),resumeAt:future.toISOString()});
  await db.sdOpp.update({where:{id:opp.id},data:{businessStatus:'LOST',version:{increment:1}}});expect((await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items.every(x=>x.state==='EXPIRED')).toBe(true);
 });
 it('creates a new trigger cycle after a resolved condition returns, and refreshes scheduled reminders',async()=>{
  const opp=await opportunity();const first=(await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items.find(s=>s.ruleCode==='R02')!;await suggestions.action('demo-portal',actor,first.id,action(first));
  await db.sdOpp.update({where:{id:opp.id},data:{expectedSignDate:future,version:{increment:1}}});await suggestions.list('demo-portal',actor,'opportunity',opp.id);
  await db.sdOpp.update({where:{id:opp.id},data:{expectedSignDate:opp.expectedSignDate,version:{increment:1}}});const again=(await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items.find(s=>s.ruleCode==='R02'&&s.state==='ACTIVE')!;expect(again.id).not.toBe(first.id);
  await suggestions.action('demo-portal',actor,again.id,action(again,'SNOOZE'));await db.sdSalesSuggestion.update({where:{id:again.id},data:{resumeAt:old}});
  for(let i=0;i<5;i++)await suggestions.tick();expect((await db.sdSalesSuggestion.findUniqueOrThrow({where:{id:again.id}})).state).toBe('ACTIVE');
 });
 it('requires actual results on both todo endpoints and preserves cancellation history',async()=>{
  const opp=await opportunity(),s=(await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items[0],created=await suggestions.action('demo-portal',actor,s.id,action(s));
  await expect(app.get(PersonalAgentService).setTodoStatus('demo-portal',actor,created.todoId!,{status:'DONE'})).rejects.toThrow();
  await todos.complete('demo-portal',actor,created.todoId!,{status:'CANCELLED',result:'客户要求暂缓',version:1});
  expect((await db.sysPersonalTodo.findUniqueOrThrow({where:{id:created.todoId!}})).status).toBe('CANCELLED');
  await expect(todos.complete('demo-portal',viewer,created.todoId!,{status:'DONE',result:'盗用',version:1})).rejects.toThrow('不存在');
 });
 it('customer suggestions use only visible opportunity activity and enforce isolated recipients',async()=>{
  await grant('suggestion-view',true,'customer-directory');await grant('view',false);
  const before=await suggestions.list('demo-portal',viewer,'customer',customer);expect(before.basis).toContain('当前可见');expect(before.items.some(s=>s.ruleCode==='R01'&&s.state==='ACTIVE')).toBe(true);
  await grant('view',true);const after=await suggestions.list('demo-portal',viewer,'customer',customer);expect(after.items.every(s=>s.state==='EXPIRED')).toBe(true);
  const opp=await opportunity();const s=(await suggestions.list('demo-portal',actor,'opportunity',opp.id)).items[0];await expect(suggestions.action('demo-portal',viewer,s.id,action(s))).rejects.toThrow('不存在');
 });
 it('calculates explained scores with exact currency thresholds and excludes comments/notes',async()=>{
  const newRule=await scores.createRule('demo-portal',actor,{config:{sourceScores:{referral:20},amountThresholds:{CNY:['100.00','1000.00','10000.00']}}});await scores.ruleAction('demo-portal',actor,newRule.id,{state:'PUBLISHED',version:1});
  const opp=await opportunity();const contact=await db.crmCustomerContact.create({data:{systemCode:'demo-portal',customerId:customer,name:'联系人',createdBy:'admin',updatedBy:'admin'}});const product=await db.mdItem.findFirstOrThrow({where:{tenantId:scope.tenantId,status:'ACTIVE'}});
  await db.sdOpp.update({where:{id:opp.id},data:{contactId:contact.id,ownerUserId:actor,source:'referral',expectedSignDate:future,currencyCode:'CNY',expectedAmount:'10000.00',version:{increment:1}}});
  await db.sdOppProduct.create({data:{tenantId:scope.tenantId,opportunityId:opp.id,productId:product.id,productCode:product.itemCode,productName:product.itemName,quantity:1,unitPrice:10000,expectedAmount:10000,requirement:'明确规格需求',createdBy:'admin',updatedBy:'admin'}});
  await activities.create('demo-portal',actor,'admin','opportunity',opp.id,{type:'VISIT',title:'拜访',content:'已完成',result:'',nextStep:'',occurredAt:new Date().toISOString(),requestId:randomUUID()});
  const score=await scores.get('demo-portal',actor,opp.id);expect(priorityScoreSchema.safeParse(score).success).toBe(true);expect(score.systemScore).toBe(100);expect(score.dimensions.map(x=>x.score)).toEqual([30,20,20,30]);
  const count=await db.sdOppScore.count({where:{opportunityId:opp.id}});await scores.get('demo-portal',actor,opp.id);expect(await db.sdOppScore.count({where:{opportunityId:opp.id}})).toBe(count);
  await db.sdOpp.update({where:{id:opp.id},data:{expectedAmount:'9999.99',version:{increment:1}}});expect((await scores.get('demo-portal',actor,opp.id)).systemScore).toBe(90);
 });
 it('leaves missing currency/source unassessed and publishes immutable rule versions',async()=>{
  const opp=await opportunity(),score=await scores.get('demo-portal',actor,opp.id);expect(score.dimensions.find(x=>x.code==='amount')).toMatchObject({score:0});expect(score.dimensions.find(x=>x.code==='amount')!.reasons[0]).toContain('不可评估');
  expect(scoreRuleConfigSchema.safeParse({sourceScores:{x:21},amountThresholds:{}}).success).toBe(false);expect(scoreRuleConfigSchema.safeParse({sourceScores:{},amountThresholds:{CNY:['100','100','10']}}).success).toBe(false);
  const rule=(await scores.rules('demo-portal',actor)).find(r=>r.state==='PUBLISHED')!;await expect(scores.ruleAction('demo-portal',actor,rule.id,{state:'PUBLISHED',version:rule.version})).rejects.toThrow('草稿');
 });
 it('serializes manual overrides, separates system score and expires/restores with an audit',async()=>{
  const opp=await opportunity(),score=await scores.get('demo-portal',actor,opp.id);const input={score:88,reason:'紧急重点项目',inputHash:score.inputHash,currentOverrideId:null,requestId:randomUUID()};
  const result=await Promise.allSettled([scores.override('demo-portal',actor,opp.id,input),scores.override('demo-portal',actor,opp.id,{...input,requestId:randomUUID(),score:90})]);expect(result.filter(x=>x.status==='fulfilled')).toHaveLength(1);
  let current=await scores.get('demo-portal',actor,opp.id);expect(current.systemScore).toBe(score.systemScore);expect([88,90]).toContain(current.effectiveScore);
  await db.sdScoreOverride.update({where:{id:current.override!.id},data:{expiresAt:old}});current=await scores.get('demo-portal',actor,opp.id);expect(current.override).toBeNull();expect(current.effectiveScore).toBe(score.systemScore);expect(await db.sysAuditLog.count({where:{actionCode:'score.override.expire'}})).toBeGreaterThan(0);
  await scores.override('demo-portal',actor,opp.id,{...input,requestId:randomUUID()});current=await scores.get('demo-portal',actor,opp.id);await scores.override('demo-portal',actor,opp.id,{...input,score:null,requestId:randomUUID(),currentOverrideId:current.override!.id});expect((await scores.get('demo-portal',actor,opp.id)).override).toBeNull();
 });
 it('freezes closed opportunity scoring and makes failed recomputation explicitly stale',async()=>{
  const opp=await opportunity();await scores.get('demo-portal',actor,opp.id);const count=await db.sdOppScore.count({where:{opportunityId:opp.id}});await db.sdOpp.update({where:{id:opp.id},data:{businessStatus:'SIGNED'}});expect((await scores.get('demo-portal',actor,opp.id)).closed).toBe(true);expect(await db.sdOppScore.count({where:{opportunityId:opp.id}})).toBe(count);
  const another=await opportunity();const before=await scores.get('demo-portal',actor,another.id);const spy=jest.spyOn(scores,'calculate').mockRejectedValueOnce(new Error('transient'));const stale=await scores.get('demo-portal',actor,another.id);expect(stale.stale).toBe(true);expect(stale.systemScore).toBe(before.systemScore);spy.mockRestore();
 });
 it('rechecks mention access; author drafts, publish retries and outbox are idempotent',async()=>{
  const opp=await opportunity();await expect(comments.draft('demo-portal',viewer,'viewer','opportunity',opp.id,{requestId:randomUUID()})).rejects.toThrow('无权');
  const v={requestId:randomUUID()};const drafts=await Promise.all([comments.draft('demo-portal',actor,'admin','opportunity',opp.id,v),comments.draft('demo-portal',actor,'admin','opportunity',opp.id,v)]);expect(drafts[0]).toEqual(drafts[1]);
  await expect(comments.publishOrEdit('demo-portal',actor,drafts[0].id,{body:'提及',version:1,mentionUserIds:[viewer]})).rejects.toThrow('无权');
  await grant('comment-view');const input={body:'协作评论',version:1,mentionUserIds:[viewer]};await comments.publishOrEdit('demo-portal',actor,drafts[0].id,input);await comments.publishOrEdit('demo-portal',actor,drafts[0].id,input);
  expect(await db.sysEventOutbox.count({where:{commentId:drafts[0].id}})).toBe(1);await Promise.all([notifications.deliver(),notifications.deliver()]);expect(await db.sysNotification.count({where:{commentId:drafts[0].id}})).toBe(1);
 });
 it('edits only own comments, notifies only newly added mentions and preserves withdrawn replies',async()=>{
  const opp=await opportunity(),root=await published(opp.id,[viewer]);await grant('comment-edit-own');
  await expect(comments.publishOrEdit('demo-portal',viewer,root.id,{body:'改他人',version:root.version,reason:'非法'})).rejects.toThrow('作者');
  const reply=await published(opp.id,[],root.id);await expect(comments.draft('demo-portal',actor,'admin','opportunity',opp.id,{requestId:randomUUID(),rootCommentId:reply.id})).rejects.toThrow('根评论');
  await comments.publishOrEdit('demo-portal',actor,root.id,{body:'修改后',version:root.version,reason:'补充',mentionUserIds:[viewer]});expect(await db.sysEventOutbox.count({where:{commentId:root.id}})).toBe(1);
  await comments.state('demo-portal',actor,root.id,{action:'WITHDRAW',reason:'撤回重复内容',version:root.version+1});const page=await comments.list('demo-portal',actor,'opportunity',opp.id,{});expect(commentPageSchema.safeParse(page).success).toBe(true);expect(page.items[0].body).toContain('已撤回');expect((await comments.list('demo-portal',actor,'opportunity',opp.id,{rootCommentId:root.id})).items[0].id).toBe(reply.id);
  expect(await db.sdCommentRevision.count({where:{commentId:root.id}})).toBe(3);
 });
 it('notifications are recipient-only, re-authorize their content, and support own all-read',async()=>{
  const opp=await opportunity(),root=await published(opp.id,[viewer]);await notifications.deliver();let page=await notifications.list('demo-portal',viewer,{});expect(notificationPageSchema.safeParse(page).success).toBe(true);const n=page.items.find(x=>x.body.includes('不会执行'))!;expect(n.available).toBe(true);
  await notifications.read('demo-portal',actor,{ids:[n.id]});expect((await db.sysNotification.findUniqueOrThrow({where:{id:n.id}})).readAt).toBeNull();
  await grant('comment-view',false);page=await notifications.list('demo-portal',viewer,{});expect(page.items.find(x=>x.id===n.id)).toMatchObject({available:false,path:null});expect(page.items.find(x=>x.id===n.id)!.body).not.toContain('不会执行');
  await notifications.read('demo-portal',viewer,{all:true});expect((await notifications.list('demo-portal',viewer,{})).unread).toBe(0);await grant('comment-view');
 });
 it('draft attachments bind safely; published files freeze and revoked sources cannot download',async()=>{
  const opp=await opportunity(),draft=await comments.draft('demo-portal',actor,'admin','opportunity',opp.id,{requestId:randomUUID()});
  const upload=await api.post('/api/systems/demo-portal/attachments').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).field('ownerType','RECORD_COMMENT').field('ownerId',draft.id).attach('file',Buffer.from('comment evidence'),'proof.txt');expect(upload.status).toBe(201);
  await comments.publishOrEdit('demo-portal',actor,draft.id,{body:'附有文件',version:1});const again=await api.post('/api/systems/demo-portal/attachments').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).field('ownerType','RECORD_COMMENT').field('ownerId',draft.id).attach('file',Buffer.from('extra'),'later.txt');expect(again.status).toBe(403);
  expect((await api.get(`/api/systems/demo-portal/attachments/${upload.body.id}/download`)).status).toBe(200);await comments.state('demo-portal',actor,draft.id,{action:'WITHDRAW',version:2,reason:'撤回'});expect((await api.get(`/api/systems/demo-portal/attachments/${upload.body.id}/download`)).status).toBe(403);
 });
 it('expires abandoned draft uploads and prevents sending expired drafts',async()=>{
  const opp=await opportunity(),draft=await comments.draft('demo-portal',actor,'admin','opportunity',opp.id,{requestId:randomUUID()});
  const upload=await api.post('/api/systems/demo-portal/attachments').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).field('ownerType','RECORD_COMMENT').field('ownerId',draft.id).attach('file',Buffer.from('temporary'),'temporary.txt');expect(upload.status).toBe(201);
  await db.sdRecordComment.update({where:{id:draft.id},data:{expiresAt:old}});await notifications.cleanDrafts();expect(await db.sysAttachment.count({where:{ownerId:draft.id}})).toBe(0);await expect(comments.publishOrEdit('demo-portal',actor,draft.id,{body:'已过期',version:1})).rejects.toThrow('变化');
 });
 it('enforces real database subject/root/scope, score bounds and active override uniqueness',async()=>{
  const opp=await opportunity(),root=await published(opp.id);const another=await opportunity();await expect(comments.draft('demo-portal',actor,'admin','opportunity',another.id,{rootCommentId:root.id,requestId:randomUUID()})).rejects.toThrow('根评论');
  await expect(db.$executeRaw`UPDATE sd_record_comment SET customer_id=${customer}::uuid WHERE id=${root.id}::uuid`).rejects.toThrow();
  await expect(db.$executeRaw`UPDATE sd_record_comment SET application_id=${randomUUID()}::uuid WHERE id=${root.id}::uuid`).rejects.toThrow();
  const score=await scores.get('demo-portal',actor,opp.id);await expect(scores.override('demo-portal',actor,opp.id,{score:101,reason:'越界',inputHash:score.inputHash,currentOverrideId:null,requestId:randomUUID()})).rejects.toThrow();
  const saved=await db.sdOppScore.findFirstOrThrow({where:{opportunityId:opp.id}});await expect(db.$executeRaw`UPDATE sd_opp_score SET system_score=101 WHERE id=${saved.id}::uuid`).rejects.toThrow();
 });
 it('rolls back comment changes if delivery event persistence fails, and requires separate moderation permission',async()=>{
  const opp=await opportunity(),draft=await comments.draft('demo-portal',actor,'admin','opportunity',opp.id,{requestId:randomUUID()});
  await grant('comment-view');
  // Reject outbox rows in an isolated DB to exercise the full transaction rollback.
  await db.$executeRawUnsafe("ALTER TABLE sys_event_outbox ADD CONSTRAINT sx_test_reject CHECK (event_key NOT LIKE 'comment:"+draft.id+":%')");
  try{await expect(comments.publishOrEdit('demo-portal',actor,draft.id,{body:'原子提交',version:1,mentionUserIds:[viewer]})).rejects.toThrow();expect((await db.sdRecordComment.findUniqueOrThrow({where:{id:draft.id}})).state).toBe('DRAFT');expect(await db.sdCommentMention.count({where:{commentId:draft.id}})).toBe(0);}finally{await db.$executeRawUnsafe('ALTER TABLE sys_event_outbox DROP CONSTRAINT sx_test_reject');}
  await comments.publishOrEdit('demo-portal',actor,draft.id,{body:'原子提交',version:1,mentionUserIds:[viewer]});
  await expect(comments.state('demo-portal',viewer,draft.id,{action:'HIDE',reason:'无管理权限',version:2})).rejects.toThrow('无权');
  await comments.state('demo-portal',actor,draft.id,{action:'HIDE',reason:'不合适内容',version:2});expect((await comments.list('demo-portal',viewer,'opportunity',opp.id,{})).items[0].body).toContain('隐藏');
 });
 it('filters mention search by exact record permissions and protects paginated comment cursors',async()=>{
  const opp=await opportunity();await grant('comment-view',false);expect((await comments.members('demo-portal',actor,'opportunity',opp.id,{q:'viewer'})).items).toHaveLength(0);await grant('comment-view');expect((await comments.members('demo-portal',actor,'opportunity',opp.id,{q:'viewer'})).items.map(x=>x.id)).toContain(viewer);
  const {id:sampleId,...sample}=await published(opp.id);void sampleId;await db.sdRecordComment.createMany({data:Array.from({length:20},()=>({...sample,id:randomUUID(),requestId:randomUUID()}))});
  const p=await comments.list('demo-portal',actor,'opportunity',opp.id,{});expect(p.items).toHaveLength(20);expect(p.nextCursor).not.toBeNull();const next=await comments.list('demo-portal',actor,'opportunity',opp.id,{cursor:p.nextCursor});expect(next.items).toHaveLength(1);expect(p.items.some(x=>x.id===next.items[0].id)).toBe(false);
  await expect(comments.list('demo-portal',actor,'opportunity',opp.id,{cursor:p.nextCursor+'tamper'})).rejects.toThrow('游标');
 });
 it('exposes strict HTTP contracts, CSRF protection and anonymous denial',async()=>{
  const opp=await opportunity();expect((await request(app.getHttpServer()).get(`${base}/scores/${opp.id}`)).status).toBe(401);
  expect((await api.get(`${base}/scores/${opp.id}`)).status).toBe(200);expect((await api.post(`${base}/score-rules`).send({config:{sourceScores:{},amountThresholds:{}}})).status).toBe(403);
  expect((await write(`${base}/records/opportunity/${opp.id}/comment-drafts`,{requestId:randomUUID(),authorId:viewer})).status).toBe(400);
 });
 it('removes revoked guidance todos from existing agent and workbench summaries',async()=>{
  await grant('suggestion-view');await grant('suggestion-adopt');const opp=await opportunity();const s=(await suggestions.list('demo-portal',viewer,'opportunity',opp.id)).items[0];const created=await suggestions.action('demo-portal',viewer,s.id,action(s));
  expect((await app.get(PersonalAgentService).todos('demo-portal',viewer)).some(t=>t.id===created.todoId)).toBe(true);await grant('view',false);
  expect((await app.get(PersonalAgentService).todos('demo-portal',viewer)).some(t=>t.id===created.todoId)).toBe(false);const wb=await app.get(WorkbenchService).get('demo-portal',viewer);expect(wb.agentTodos.items.some(t=>t.id===created.todoId)).toBe(false);await grant('view',true);
 });
});
