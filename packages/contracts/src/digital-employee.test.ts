import { describe,expect,it } from 'vitest';
import { deConnectionWriteSchema,deMailAutomationWriteSchema,deMailRuleWriteSchema,deTaskActionSchema,deTaskSchema } from './digital-employee';

describe('digital employee mail connection contract',()=>{
 it('requires IMAP and SMTP endpoints for an external mailbox',()=>{
  const result=deConnectionWriteSchema.safeParse({name:'外部邮箱',category:'MAIL',provider:'IMAP_SMTP',status:'CONFIGURED',config:{username:'ops@example.com'},version:0});
  expect(result.success).toBe(false);
  if(!result.success)expect(result.error.issues.map(issue=>issue.path.join('.'))).toEqual(expect.arrayContaining(['config.imapHost','config.smtpHost']));
 });
 it('accepts Microsoft Graph metadata without exposing a secret in config',()=>{
  const value=deConnectionWriteSchema.parse({name:'Microsoft 365',category:'MAIL',provider:'MICROSOFT_GRAPH',status:'CONFIGURED',config:{tenantId:'tenant',clientId:'client',mailbox:'sales@example.com'},credential:'secret',version:0});
  expect(value.config).not.toHaveProperty('credential');
 });
 it('requires an endpoint and mailbox for a generic mail API',()=>{
  const result=deConnectionWriteSchema.safeParse({name:'邮箱开放平台',category:'MAIL',provider:'GENERIC_API',status:'CONFIGURED',config:{},version:0});
  expect(result.success).toBe(false);
  if(!result.success)expect(result.error.issues.map(issue=>issue.path.join('.'))).toEqual(expect.arrayContaining(['config.baseUrl','config.mailbox']));
 });
});

describe('digital employee task closure contract',()=>{
 it('adds safe defaults to legacy workspace tasks',()=>{
  const task=deTaskSchema.parse({id:'DE-1',title:'邮件待办',employee:'邮件数字员工',domain:'销售',object:'客户A',risk:'HIGH',status:'PENDING',due:'今天',owner:'未分配',trigger:'收到邮件',output:'摘要',action:'处理',finding:'待确认',evidence:[],plan:[],requiresApproval:false});
  expect(task.queue).toBe('综合队列');expect(task.tags).toEqual([]);expect(task.events).toEqual([]);expect(task.scenarioCode).toBe('SCN-GENERAL');
 });
 it('requires a reason when adding a note, completing or ignoring a task',()=>{
  expect(deTaskActionSchema.safeParse({action:'ADD_NOTE',version:1}).success).toBe(false);
  expect(deTaskActionSchema.safeParse({action:'ADD_NOTE',note:'已联系客户',version:1}).success).toBe(true);
  expect(deTaskActionSchema.safeParse({action:'COMPLETE',version:1}).success).toBe(false);
  expect(deTaskActionSchema.safeParse({action:'COMPLETE',note:'已回复客户',version:1}).success).toBe(true);
 });
});

describe('digital employee mail automation contract',()=>{
 it('rejects an invalid polling interval',()=>{
  const result=deMailAutomationWriteSchema.safeParse({enabled:true,config:{intervalMinutes:0},version:1});
  expect(result.success).toBe(false);
 });
 it('requires a template when a rule creates a reply',()=>{
  const result=deMailRuleWriteSchema.safeParse({code:'RULE_REPLY',name:'自动回复',priority:10,enabled:true,conditions:{},actions:{replyMode:'AUTO'},stopOnMatch:true,version:0});
  expect(result.success).toBe(false);
  if(!result.success)expect(result.error.issues.map(issue=>issue.path.join('.'))).toContain('actions.templateCode');
 });
 it('keeps outbound delivery disabled by default',()=>{
  const value=deMailAutomationWriteSchema.parse({enabled:true,config:{},version:1});
  expect(value.config.intervalMinutes).toBe(5);
  expect(value.config.outboundEnabled).toBe(false);
  expect(value.config.allowedDomains).toEqual([]);
  expect(value.config.taskPolicy.categoryPolicies.find(policy=>policy.category==='质量与客诉')).toMatchObject({queue:'质量与售后队列',priority:'URGENT',completionRule:'QUALITY_RECORD_AND_REPLY'});
 });
});
