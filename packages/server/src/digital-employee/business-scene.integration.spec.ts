import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {AppModule} from '../app.module';
import {DatabaseService} from '../database/database.service';
import {ApiExceptionFilter} from '../http/api-exception.filter';
import {ApiException} from '../http/api-exceptions';
import {AuthorizationService} from '../rbac/authorization.service';
import {AgentService} from '../agent/agent.service';
import {AiAnalysisService} from '../ai/ai-analysis.service';
import {MailAutomationService} from './mail-automation.service';
import {CommodityMarketService} from './commodity-market.service';
const run=process.env.RUN_BUSINESS_SCENE_DB_TESTS==='1'?describe:describe.skip;
run('business scenes isolated API',()=>{
 let app:INestApplication,db:DatabaseService,api:ReturnType<typeof request.agent>,csrf:string;
 const root='/api/systems/demo-portal/digital-employees/business-scenes';
 const post=(path:string,body:object={})=>api.post(path).set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send(body);
 const patch=(path:string,body:object)=>api.patch(path).set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send(body);
 beforeAll(async()=>{
  if(!new URL(process.env.DATABASE_URL!).pathname.startsWith('/sdd_scene_'))throw new Error('ISOLATED_DB_REQUIRED');
  app=(await Test.createTestingModule({imports:[AppModule]}).compile()).createNestApplication();app.use(cookieParser());app.useGlobalFilters(new ApiExceptionFilter());await app.listen(0);
  app.get(AgentService).onModuleDestroy();app.get(AiAnalysisService).onModuleDestroy();app.get(MailAutomationService).onModuleDestroy();app.get(CommodityMarketService).onModuleDestroy();
  db=app.get(DatabaseService);api=request.agent(app.getHttpServer());const session=await api.get('/api/auth/session');csrf=(session.headers['set-cookie'] as unknown as string[]).map(v=>v.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;
  expect((await post('/api/auth/login',{account:'admin',password:process.env.INITIAL_ADMIN_PASSWORD})).status).toBe(201);
 },30000);
 afterAll(async()=>{await app?.close();});
 it('seeds 15 rows per scene, paginates, and preserves operator edits on repeated initialization',async()=>{
  for(const scene of ['SCN-PO','SCN-RMA','SCN-BI']){const result=await api.get(`${root}/${scene}`);expect(result.status).toBe(200);expect(result.body.records).toHaveLength(15);expect(result.body.total).toBe(15);}
  const a=await api.get(`${root}/SCN-PO?pageSize=10`),b=await api.get(`${root}/SCN-PO?pageSize=10&page=2`);expect(a.body.records).toHaveLength(10);expect(b.body.records).toHaveLength(5);expect(a.body.records.map((r:{id:string})=>r.id)).not.toContain(b.body.records[0].id);
  const row=a.body.records[0];const saved=await post(`${root}/SCN-PO/records/${row.id}/actions`,{version:a.body.version,action:'PURCHASE_SAVE',note:'演示核对完整',purchase:{...row.purchase,confirmedQty:row.purchase.orderedQty,confirmedDate:row.purchase.expectedDate,confirmedPriceMinor:row.purchase.priceMinor}});expect(saved.status).toBe(201);expect(saved.body.record.status).toBe('CONFIRMED');
  expect((await patch(`${root}/SCN-PO/config`,{config:a.body.config,version:a.body.version})).status).toBe(409);
  const repeated=await api.get(`${root}/SCN-PO`);expect(repeated.body.records[0].note).toBe('演示核对完整');expect(await db.sysDeSceneWorkspace.count()).toBe(3);
 });
 it('stores API settings without exposing demo rows, credentials or running a request',async()=>{
  const current=(await api.get(`${root}/SCN-PO`)).body;
  const apiMode=await patch(`${root}/SCN-PO/config`,{version:current.version,config:{...current.config,sourceMode:'API',baseUrl:'https://api.example.com',endpoint:'/v1/purchase-orders'}});expect(apiMode.status).toBe(200);expect(apiMode.body.records).toEqual([]);expect(apiMode.body.connectionStatus).toBe('CONFIGURED');
  expect((await api.get(`${root}/SCN-PO/records/${current.records[0].id}`)).status).toBe(404);
  expect((await post(`${root}/SCN-PO/records/${current.records[0].id}/actions`,{version:apiMode.body.version,action:'PURCHASE_DRAFT'})).status).toBe(409);
  expect((await patch(`${root}/SCN-PO/config`,{version:apiMode.body.version,config:{...current.config,connectionCode:'missing-connection'}})).status).toBe(400);
  const restored=await patch(`${root}/SCN-PO/config`,{version:apiMode.body.version,config:current.config});expect(restored.body.records).toHaveLength(15);expect(restored.body.records[0].note).toBe('演示核对完整');
  expect((await patch(`${root}/SCN-PO/config`,{version:restored.body.version,config:{...current.config,baseUrl:'https://admin:secret@example.com'}})).status).toBe(400);
 });
 it('executes quality and analytical review steps and rejects premature closure',async()=>{
  let center=(await api.get(`${root}/SCN-RMA`)).body;let record=center.records[0];let revision=center.version;
  expect((await post(`${root}/SCN-RMA/records/${record.id}/actions`,{version:revision,action:'CLOSE',note:'不能提前关闭'})).status).toBe(409);
  let result=await post(`${root}/SCN-RMA/records/${record.id}/actions`,{version:revision,action:'QUALITY_DRAFT'});expect(result.status).toBe(201);record=result.body.record;revision=result.body.version;
  expect((await post(`${root}/SCN-RMA/records/${record.id}/actions`,{version:revision,action:'QUALITY_DRAFT'})).status).toBe(409);
  result=await post(`${root}/SCN-RMA/records/${record.id}/actions`,{version:revision,action:'QUALITY_SAVE',note:'演示工程验证',quality:{...record.quality,eightD:{...record.quality.eightD,d4:'演示对照试验确认接触失效',d6:'演示验证通过'},rootCauseConfirmed:true,validationResult:'演示复测无失效'}});expect(result.status).toBe(201);
  result=await post(`${root}/SCN-RMA/records/${record.id}/actions`,{version:result.body.version,action:'CLOSE',note:'完成演示核实'});expect(result.body.record.status).toBe('CLOSED');
  center=(await api.get(`${root}/SCN-BI`)).body;expect(center.summary.included).toBe(10);record=center.records[1];result=await post(`${root}/SCN-BI/records/${record.id}/actions`,{version:center.version,action:'ANALYZE'});expect(result.body.record.draft).toContain('尚待核实');result=await post(`${root}/SCN-BI/records/${record.id}/actions`,{version:result.body.version,action:'SAVE_ACTION',actionPlan:'演示跟进预算偏差'});expect(result.body.record.actionPlan).toBe('演示跟进预算偏差');
 });
 it('enforces scene/action permissions, CSRF and scope, with no business-table writes',async()=>{
  const counts=await Promise.all([db.sdSalesOrder.count(),db.scmInventoryEvent.count()]);
  const auth=app.get(AuthorizationService),original=auth.assertAction.bind(auth);const spy=jest.spyOn(auth,'assertAction').mockImplementation((user,code,menu,action)=>menu==='de-scene-po'&&action==='manage'?Promise.reject(new ApiException('FORBIDDEN',403,'模拟禁止配置')):original(user,code,menu,action));
  try{const center=(await api.get(`${root}/SCN-PO`)).body;expect((await patch(`${root}/SCN-PO/config`,{version:center.version,config:center.config})).status).toBe(403);}finally{spy.mockRestore();}
  expect((await api.patch(`${root}/SCN-PO/config`).send({})).status).toBe(403);
  expect((await api.get(`${root}/SCN-RMA/records/DEMO-PO-001`)).status).toBe(404);
  expect((await api.get('/api/systems/not-allowed/digital-employees/business-scenes/SCN-PO')).status).not.toBe(200);
  expect(await Promise.all([db.sdSalesOrder.count(),db.scmInventoryEvent.count()])).toEqual(counts);
 });
});
