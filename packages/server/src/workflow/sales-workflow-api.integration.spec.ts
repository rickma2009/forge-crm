import cookieParser from 'cookie-parser';
import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import request from 'supertest';
import {AppModule} from '../app.module';
import {ApiExceptionFilter} from '../http/api-exception.filter';
import {SalesWorkflowService} from './sales-workflow.service';
import {defaultSalesDesign} from './workflow-definition';
import {randomUUID} from 'node:crypto';
const suite=process.env.RUN_WORKFLOW_DB_TESTS==='1'?describe:describe.skip;
suite('workflow HTTP permissions and CSRF',()=>{
 let app:INestApplication;
 const base='/api/systems/demo-portal/workflows';
 beforeAll(async()=>{const module=await Test.createTestingModule({imports:[AppModule]}).compile();app=module.createNestApplication();app.use(cookieParser());app.useGlobalFilters(new ApiExceptionFilter());await app.init();app.get(SalesWorkflowService).onModuleDestroy();});
 afterAll(async()=>app?.close());
 async function login(account:'admin'|'viewer'){const agent=request.agent(app.getHttpServer());const anon=await agent.get('/api/auth/session');const csrf=(anon.headers['set-cookie'] as unknown as string[]).map(c=>c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;const r=await agent.post('/api/auth/login').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send({account,password:process.env[account==='admin'?'INITIAL_ADMIN_PASSWORD':'INITIAL_VIEWER_PASSWORD']});expect(r.status).toBe(201);return{agent,csrf};}
 it('requires login and explicit workflow grants',async()=>{expect((await request(app.getHttpServer()).get(base+'/approvals')).status).toBe(401);const {agent,csrf}=await login('viewer');expect((await agent.get(base+'/approvals')).status).toBe(403);expect((await agent.get(base+'/configurations')).status).toBe(403);expect((await agent.post(base+'/preview').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send({})).status).toBe(403);});
 it('admin can list and preview, but writes require CSRF; unknown scopes and records stay inaccessible',async()=>{const {agent,csrf}=await login('admin');expect((await agent.get(base+'/approvals')).status).toBe(200);expect((await agent.get(base+'/configurations')).status).toBe(200);expect((await agent.post(base+'/preview').send({})).status).toBe(403);const r=await agent.post(base+'/preview').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send({code:'sales_order',name:'销售订单审批',revision:1,objectCode:'sales_order',design:defaultSalesDesign()});expect(r.status).toBe(201);expect(r.body.nodes).toHaveLength(7);expect((await agent.get('/api/systems/unknown/workflows/approvals')).status).toBe(404);expect((await agent.get(base+'/approvals/00000000-0000-4000-8000-000000000001')).status).toBe(404);});
 it('admin creates and deletes a workflow draft through the settings directory API',async()=>{const {agent,csrf}=await login('admin'),requestKey=randomUUID();expect((await agent.get(base+'/objects')).body.items[0].objectCode).toBe('sales_order');const created=await agent.post(base+'/definitions').set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send({requestKey,workflowName:'接口审批草稿',objectCode:'sales_order'});expect(created.status).toBe(201);expect(created.body.config.design.nodes.map((node:{id:string})=>node.id)).toEqual(['start','end']);expect((await agent.get(base+'/definitions')).body.items.some((row:{id:string})=>row.id===created.body.id)).toBe(true);expect((await agent.delete(base+`/definitions/${created.body.id}`).set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf)).status).toBe(200);});
});
