import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { NumberingService,codeLeader } from './numbering.service';
import { initializeNumbering } from './initialize-numbering';
import { initializeNumberingRules } from './numbering-defaults';
import { CustomerService } from '../customer/customer.service';
import { EmployeeService } from '../organization/employee.service';
import { OpportunityService } from '../opportunity/opportunity.service';
import { QuotationService } from '../quotation/quotation.service';
import { codeRuleListSchema,codeRuleWriteSchema } from '@forge-crm/contracts';
const run=process.env.RUN_NUMBERING_DB_TESTS==='1'?describe:describe.skip;
run('numbering rules actual database and object integration',()=>{
 let app:INestApplication,db:DatabaseService,numbers:NumberingService,actor:string,tenantId:string,applicationId:string;
 let api:ReturnType<typeof request.agent>,csrf:string;
 const system='demo-portal',base='/api/systems/demo-portal/code-rules';
 const definition=(objectCode:string,extra:object={})=>({objectCode,objectName:'测试编码规则',sortNo:999,hasPrefix:true,prefix:'T',hasDate:false,dateType:'NONE',digits:5,startNumber:1,status:'ACTIVE',version:0,...extra});
 const rule=async(objectCode:string)=>db.sysCodeRule.findUniqueOrThrow({where:{applicationId_objectCode:{applicationId,objectCode}}});
 const payload=(r:Awaited<ReturnType<typeof rule>>,extra:object={})=>({...definition(r.objectCode),objectName:r.objectName,sortNo:r.sortNo,hasPrefix:r.hasPrefix,prefix:r.prefix,hasDate:r.hasDate,dateType:r.dateType,digits:r.digits,startNumber:Number(r.startNumber),status:r.status,version:r.version,...extra});
 const write=(path:string,body:object)=>api.post(path).set('Origin','http://localhost:5173').set('X-CSRF-Token',csrf).send(body);
 beforeAll(async()=>{const module=await Test.createTestingModule({imports:[AppModule]}).compile();app=module.createNestApplication();app.use(cookieParser());app.useGlobalFilters(new ApiExceptionFilter());await app.init();db=app.get(DatabaseService);numbers=app.get(NumberingService);const scope=await db.sysApplication.findFirstOrThrow({where:{applicationCode:system}});tenantId=scope.tenantId;applicationId=scope.id;actor=(await db.iamUser.findFirstOrThrow({where:{tenantId,account:'admin'}})).id;await initializeNumbering(db,system);api=request.agent(app.getHttpServer());let res=await api.get('/api/auth/session');csrf=(res.headers['set-cookie'] as unknown as string[]).map(c=>c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)!;res=await write('/api/auth/login',{account:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});expect(res.status).toBe(201);csrf=(res.headers['set-cookie'] as unknown as string[]).map(c=>c.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean)??csrf;},60000);
 afterAll(async()=>{await app?.close();});
 it('initializes exactly twelve definitions; repeated initialization preserves edited and deleted rules',async()=>{
  expect(await db.sysCodeRule.count({where:{applicationId}})).toBe(12);
  const supplier=await rule('SUPPLIER');await numbers.save(system,supplier.id,actor,payload(supplier,{prefix:'SP'}));await numbers.remove(system,supplier.id,actor,{version:supplier.version+1});await initializeNumbering(db,system);expect((await rule('SUPPLIER')).deletedAt).not.toBeNull();expect((await rule('SUPPLIER')).prefix).toBe('SP');
  await numbers.save(system,null,actor,definition('SUPPLIER',{objectName:'供应商',prefix:'S',digits:7}));expect(await db.sysCodeRule.count({where:{applicationId}})).toBe(12);
 });
 it('validates fields and returns filtered stable paginated DTOs without allocating previews',async()=>{
  for(const extra of [{digits:0},{digits:13},{startNumber:0},{digits:2,startNumber:100},{hasDate:true,dateType:'NONE'},{prefix:'*'}])expect(codeRuleWriteSchema.safeParse(definition('X',extra)).success).toBe(false);
  const before=await db.sysCodeIssue.count();const page=await numbers.list(system,{keyword:'客户',pageSize:1});expect(codeRuleListSchema.safeParse(page).success).toBe(true);expect(page.items[0].preview).toBe('C0000001');expect(await db.sysCodeIssue.count()).toBe(before);
 });
 it('allocates concurrently without duplicates; identical request IDs produce exactly one issue',async()=>{
  await numbers.save(system,null,actor,definition('CONCURRENT'));const all=await Promise.all(Array.from({length:24},()=>numbers.allocate(system,'CONCURRENT')));expect(new Set(all).size).toBe(24);expect(all.sort()[0]).toBe('T00001');expect(all.sort().at(-1)).toBe('T00024');
  const key=randomUUID();const retries=await Promise.all(Array.from({length:8},()=>numbers.allocate(system,'CONCURRENT',key)));expect(new Set(retries).size).toBe(1);expect(await db.sysCodeIssue.count({where:{applicationId,objectCode:'CONCURRENT'}})).toBe(25);
 },30000);
 it('uses Shanghai boundaries and resets day/month/year periods; no-date retains its sequence',async()=>{
  for(const [objectCode,dateType] of [['DAY_RULE','DAY'],['MONTH_RULE','MONTH'],['YEAR_RULE','YEAR']] as const){await numbers.save(system,null,actor,definition(objectCode,{hasDate:true,dateType,digits:2,prefix:'' ,hasPrefix:false}));const left=new Date('2026-12-31T15:59:59Z'),right=new Date('2026-12-31T16:00:00Z');const a=await numbers.allocate(system,objectCode,randomUUID(),left),b=await numbers.allocate(system,objectCode,randomUUID(),right);expect(a.endsWith('01')).toBe(true);expect(b.endsWith('01')).toBe(true);expect(b.startsWith('2027')).toBe(true);}
  expect(codeLeader({hasPrefix:true,prefix:'OP',hasDate:true,dateType:'DAY'},new Date('2026-10-04T16:00:00Z')).leader).toBe('OP20261005');
  await numbers.save(system,null,actor,definition('FOREVER'));expect(await numbers.allocate(system,'FOREVER',randomUUID(),new Date('2026-01-01'))).toBe('T00001');expect(await numbers.allocate(system,'FOREVER',randomUUID(),new Date('2027-01-01'))).toBe('T00002');
 });
 it('never rewinds when start/digits/prefix change and old formats return; overflow fails safely',async()=>{
  await numbers.save(system,null,actor,definition('CHANGES',{digits:2,startNumber:98}));expect(await numbers.allocate(system,'CHANGES')).toBe('T98');let r=await rule('CHANGES');await numbers.save(system,r.id,actor,payload(r,{startNumber:1}));expect(await numbers.allocate(system,'CHANGES')).toBe('T99');await expect(numbers.allocate(system,'CHANGES')).rejects.toThrow('耗尽');r=await rule('CHANGES');await numbers.save(system,r.id,actor,payload(r,{digits:3}));expect(await numbers.allocate(system,'CHANGES')).toBe('T100');r=await rule('CHANGES');await numbers.save(system,r.id,actor,payload(r,{prefix:'U'}));expect(await numbers.allocate(system,'CHANGES')).toBe('U001');r=await rule('CHANGES');await numbers.save(system,r.id,actor,payload(r,{prefix:'T'}));expect(await numbers.allocate(system,'CHANGES')).toBe('T101');
 });
 it('protects used rules, immutable object code, stale writes, disabled and missing configuration',async()=>{
  const r=await rule('CHANGES');await expect(numbers.remove(system,r.id,actor,{version:r.version})).rejects.toThrow('只能停用');await expect(numbers.save(system,r.id,actor,payload(r,{objectCode:'WRONG'}))).rejects.toThrow('不可修改');await numbers.save(system,r.id,actor,payload(r,{status:'DISABLED'}));await expect(numbers.save(system,r.id,actor,payload(r))).rejects.toThrow('刷新');await expect(numbers.allocate(system,'CHANGES')).rejects.toThrow('启用');await expect(numbers.allocate(system,'MISSING')).rejects.toThrow('启用');
 });
 it('avoids existing same-format customer codes and leaves all historical codes intact',async()=>{
  const c=await db.crmCustomer.findFirstOrThrow({where:{systemCode:system}});const prior=c.customerCode;await db.crmCustomer.create({data:{systemCode:system,customerCode:'C0000042',customerName:'编码历史42',shortName:'历史42',categoryValue:'direct',statusValue:'active',createdBy:'test',updatedBy:'test'}});expect(await numbers.allocate(system,'CUSTOMER')).toBe('C0000043');expect((await db.crmCustomer.findUniqueOrThrow({where:{id:c.id}})).customerCode).toBe(prior);
 });
 it('allocations survive failed business transactions and DB constraints reject invalid/cross-scope rows',async()=>{
  await numbers.save(system,null,actor,definition('GAPS'));const first=await numbers.allocate(system,'GAPS');await expect(db.$transaction(async()=>{throw new Error('business failed');})).rejects.toThrow('business failed');expect(await numbers.allocate(system,'GAPS')).not.toBe(first);
  await expect(db.$executeRaw`UPDATE sys_code_rule SET digits=0 WHERE object_code='GAPS'`).rejects.toThrow();await expect(db.$executeRaw`UPDATE sys_code_issue SET tenant_id=${randomUUID()}::uuid WHERE object_code='GAPS'`).rejects.toThrow();
 });
 it('isolates apps and shares tenant counters to respect existing employee/document tenant uniqueness',async()=>{
  const a=await db.sysApplication.create({data:{tenantId,applicationCode:'numbering-other',applicationName:'取号隔离'}});await initializeNumberingRules(db,['numbering-other']);const before=(await numbers.list(system,{keyword:'供应商'})).items[0];const n1=await numbers.allocate(system,'SUPPLIER'),n2=await numbers.allocate('numbering-other','SUPPLIER');expect(n1).not.toBe(n2);await expect(numbers.save('numbering-other',before.id,actor,definition('SUPPLIER',{version:before.version}))).rejects.toThrow('不存在');expect(a.id).not.toBe(applicationId);
 });
 it('enforces authenticated management, CSRF, read-only viewer and allocation permission',async()=>{
  expect((await request(app.getHttpServer()).get(base)).status).toBe(401);expect((await api.post(base).send(definition('CSRF'))).status).toBe(403);
  const created=await write(base,definition('HTTP'));expect(created.status).toBe(201);const key=randomUUID();const a=await write(base+'/allocate',{objectCode:'HTTP',requestId:key});expect(a.status).toBe(201);expect((await write(base+'/allocate',{objectCode:'HTTP',requestId:key})).body).toEqual(a.body);
  await write('/api/auth/logout',{});const login=await write('/api/auth/login',{account:'viewer',password:process.env.INITIAL_VIEWER_PASSWORD});expect(login.status).toBe(201);expect((await api.get(base)).status).toBe(403);
 });
 it('creates customer, employee, opportunity and quotation via their real services; edits retain numbers',async()=>{
  const category=await db.sysDictionaryItem.findFirstOrThrow({where:{status:'ACTIVE',dictionary:{systemCode:system,dictCode:'customer_category'}}});
  const customer=await app.get(CustomerService).create(system,'admin',{customerName:'统一编码真实客户',shortName:'真实取号',categoryValue:category.itemValue,statusValue:'active'});expect(customer.customerCode).toMatch(/^C[0-9]{7}$/);const edited=await app.get(CustomerService).update(system,customer.id,'admin',{version:customer.version,shortName:'改名保留编码'});expect(edited.customer.customerCode).toBe(customer.customerCode);
  const employees=app.get(EmployeeService),opts=await employees.options(system);const employee=await employees.create(system,actor,randomUUID(),{employeeName:'取号员工',account:'numbering.employee',initialPassword:'NumberingTest!2026',orgUnitId:opts.organizations[0].id,positionId:opts.positions[0].id,effectiveAt:new Date().toISOString()});expect(employee.employeeNo).toMatch(/^1[0-9]{6}$/);
  await expect(employees.create(system,actor,randomUUID(),{employeeNo:'MANUAL'})).rejects.toThrow();
  const sample=await db.sdOpp.findFirstOrThrow({where:{applicationId}});const opp=await app.get(OpportunityService).createOpportunity(system,actor,'admin',{opportunityName:'统一编码真实商机',customerId:customer.id,ownerUserId:actor,templateId:sample.templateId,stageId:sample.stageId,confidence:30,products:[]});expect(opp.opportunityCode).toMatch(/^OP[0-9]{13}$/);
  const quotation=app.get(QuotationService),key=randomUUID();const quote=await quotation.save(system,actor,null,{mode:'INDEPENDENT',customerId:customer.id,requestKey:key});expect((quote as {quoteCode:string}).quoteCode).toMatch(/^QT[0-9]{13}$/);expect((await quotation.save(system,actor,null,{mode:'INDEPENDENT',customerId:customer.id,requestKey:key}) as {id:string}).id).toBe((quote as {id:string}).id);const quoteId=(quote as {id:string}).id;await db.sdQuotation.update({where:{id:quoteId},data:{status:'SUBMITTED'}});const copied=await quotation.copy(system,actor,quoteId,{version:1,requestKey:randomUUID()}) as {id:string;quoteCode:string};expect(copied.id).not.toBe(quoteId);expect(copied.quoteCode).toMatch(/^QT[0-9]{13}$/);expect(copied.quoteCode).not.toBe((quote as {quoteCode:string}).quoteCode);
 },20000);
});
