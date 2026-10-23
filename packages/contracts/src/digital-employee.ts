import { z } from 'zod';

export const deTaskStatusSchema = z.enum(['PENDING', 'RUNNING', 'WAITING_EXTERNAL', 'ON_HOLD', 'WAITING_CONFIRMATION', 'COMPLETED', 'IGNORED', 'CANCELLED', 'REJECTED']);
export const deRiskSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const deTaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const deTaskAlertSchema = z.enum(['NONE', 'DUE_SOON', 'OVERDUE']);
export const deEmployeeStatusSchema = z.enum(['PLANNED', 'RUNNING', 'PAUSED']);
export const deMaturitySchema = z.enum(['READ_ONLY', 'DRAFT_ASSIST', 'CONTROLLED_EXECUTION']);
export const deConnectionStatusSchema = z.enum(['WAITING_CONFIG', 'CONFIGURED', 'CONNECTED', 'DISABLED', 'ERROR']);
export const deConnectionProviderSchema = z.enum(['INTERNAL_API', 'MICROSOFT_GRAPH', 'GMAIL_API', 'IMAP_SMTP', 'GENERIC_API']);

export const deTaskEventSchema=z.strictObject({id:z.string(),at:z.string().datetime(),actor:z.string(),type:z.string(),content:z.string()});
export const deTaskSchema = z.strictObject({
  id:z.string(),title:z.string(),employee:z.string(),domain:z.string(),object:z.string(),risk:deRiskSchema,status:deTaskStatusSchema,due:z.string(),owner:z.string(),trigger:z.string(),output:z.string(),action:z.string(),finding:z.string(),evidence:z.array(z.string()),plan:z.array(z.string()),requiresApproval:z.boolean(),
  scenarioCode:z.string().default('SCN-GENERAL'),strategyCode:z.string().default('GENERAL'),scenarioData:z.record(z.unknown()).default({}),
  priority:deTaskPrioritySchema.default('MEDIUM'),starred:z.boolean().default(false),tags:z.array(z.string().trim().min(1).max(32)).max(20).default([]),queue:z.string().default('综合队列'),ownerId:z.string().uuid().nullable().default(null),
  responseDueAt:z.string().datetime().nullable().default(null),resolutionDueAt:z.string().datetime().nullable().default(null),firstRespondedAt:z.string().datetime().nullable().default(null),completedAt:z.string().datetime().nullable().default(null),pausedAt:z.string().datetime().nullable().default(null),resumeAt:z.string().datetime().nullable().default(null),
  alertLevel:deTaskAlertSchema.default('NONE'),resolutionCode:z.string().nullable().default(null),resolutionNote:z.string().nullable().default(null),events:z.array(deTaskEventSchema).default([]),
});
export const deEmployeeSchema = z.strictObject({ id:z.string(), name:z.string(), domain:z.string(), description:z.string(), sources:z.string(), owner:z.string(), fallbackOwner:z.string(), maturity:deMaturitySchema, confidenceThreshold:z.number().min(0).max(100), permissions:z.array(z.string()), status:deEmployeeStatusSchema, success:z.string() });
export const deScenarioSchema = z.strictObject({ code:z.string(), name:z.string(), domain:z.string(), maturity:deMaturitySchema, trigger:z.string(), output:z.string(), sources:z.string(), control:z.string(), assessmentScore:z.number().min(0).max(100), assessmentStatus:z.enum(['NOT_ASSESSED','DRAFT','READY','ENABLED']) });
export const deRuleSchema = z.strictObject({ code:z.string(), name:z.string(), condition:z.string(), action:z.string(), risk:z.enum(['L1','L2','L3']), status:z.enum(['ACTIVE','DISABLED']) });
export const deAuditSchema = z.strictObject({ at:z.string(), actor:z.string(), event:z.string(), result:z.string() });
export const deConnectionSchema = z.strictObject({ id:z.string().uuid(), code:z.string(), name:z.string(), category:z.string(), provider:deConnectionProviderSchema, status:deConnectionStatusSchema, config:z.record(z.unknown()), secretConfigured:z.boolean(), lastCheckedAt:z.string().datetime().nullable(), lastError:z.string().nullable(), version:z.number().int().positive() });
export const deAssigneeSchema=z.strictObject({id:z.string().uuid(),account:z.string(),name:z.string()});
export const deQueueSchema=z.strictObject({code:z.string(),name:z.string()});
export const deMonitorSummarySchema=z.strictObject({active:z.number().int().nonnegative(),unassigned:z.number().int().nonnegative(),dueSoon:z.number().int().nonnegative(),overdue:z.number().int().nonnegative(),onHold:z.number().int().nonnegative()});
export const deWorkspaceSchema = z.strictObject({ tasks:z.array(deTaskSchema), employees:z.array(deEmployeeSchema), scenarios:z.array(deScenarioSchema), rules:z.array(deRuleSchema), audits:z.array(deAuditSchema), connections:z.array(deConnectionSchema),assignees:z.array(deAssigneeSchema).default([]),queues:z.array(deQueueSchema).default([]),monitor:deMonitorSummarySchema.default({active:0,unassigned:0,dueSoon:0,overdue:0,onHold:0}),version:z.number().int().positive() });

export const deTaskCreateSchema = z.strictObject({ scenarioCode:z.string().min(1).max(48), object:z.string().trim().max(160).default('') });
export const deTaskTransitionSchema = z.strictObject({ status:deTaskStatusSchema, version:z.number().int().positive() });
export const deTaskActionSchema=z.strictObject({
  action:z.enum(['ASSIGN','CLAIM','START','STAR','SET_TAGS','ADD_NOTE','HOLD','RESUME','WAIT_EXTERNAL','COMPLETE','IGNORE','REOPEN']),version:z.number().int().positive(),
  ownerId:z.string().uuid().nullable().optional(),queue:z.string().trim().max(64).optional(),starred:z.boolean().optional(),tags:z.array(z.string().trim().min(1).max(32)).max(20).optional(),note:z.string().trim().max(1000).optional(),reason:z.string().trim().max(500).optional(),resumeAt:z.string().datetime().nullable().optional(),resolutionCode:z.string().trim().max(64).optional(),businessObjectType:z.string().trim().max(64).optional(),businessObjectId:z.string().trim().max(128).optional(),
}).superRefine((value,ctx)=>{
  if(value.action==='ASSIGN'&&!value.ownerId&&!value.queue)ctx.addIssue({code:z.ZodIssueCode.custom,path:['ownerId'],message:'请选择负责人或队列'});
  if(['ADD_NOTE','HOLD','COMPLETE','IGNORE'].includes(value.action)&&!(value.reason||value.note))ctx.addIssue({code:z.ZodIssueCode.custom,path:['reason'],message:'请填写处理说明'});
});
export const deEmployeeUpdateSchema = deEmployeeSchema.omit({ id:true, success:true }).extend({ version:z.number().int().positive() });
export const deScenarioAssessmentSchema = z.strictObject({ checks:z.record(z.boolean()), scope:z.string().trim().min(1).max(120), shadowDays:z.number().int().min(1).max(90), lowConfidenceAction:z.enum(['HUMAN_TASK','LOG_ONLY','STOP']), formalAction:z.enum(['ALWAYS_CONFIRM','LOW_RISK_AUTO']), submit:z.boolean(), version:z.number().int().positive() });
export const deConnectionWriteSchema = z.strictObject({
  name:z.string().trim().min(1).max(120), category:z.string().trim().min(1).max(64), provider:deConnectionProviderSchema,
  status:z.enum(['CONFIGURED','DISABLED']).default('CONFIGURED'), config:z.record(z.unknown()), credential:z.string().min(1).max(4096).optional(), version:z.number().int().nonnegative(),
}).superRefine((value,ctx)=>{
  const required=(key:string,label:string)=>{if(!String(value.config[key]??'').trim())ctx.addIssue({code:z.ZodIssueCode.custom,path:['config',key],message:`${label}不能为空`});};
  if(value.category==='MAIL'){
    if(value.provider==='IMAP_SMTP'){required('imapHost','IMAP服务器');required('imapPort','IMAP端口');required('smtpHost','SMTP服务器');required('smtpPort','SMTP端口');required('username','邮箱账号');}
    if(value.provider==='MICROSOFT_GRAPH'){required('tenantId','Microsoft租户ID');required('clientId','客户端ID');required('mailbox','邮箱地址');}
    if(value.provider==='GMAIL_API'){required('clientId','Google客户端ID');required('mailbox','邮箱地址');}
    if(value.provider==='INTERNAL_API'){required('baseUrl','内部邮箱API地址');required('mailbox','邮箱地址');}
    if(value.provider==='GENERIC_API'){required('baseUrl','API地址');required('mailbox','邮箱或账号');}
  }
});

export const deMailAutomationConfigSchema=z.strictObject({
  intervalMinutes:z.number().int().min(1).max(1440).default(5),activeFrom:z.string().regex(/^\d{2}:\d{2}$/).default('00:00'),activeTo:z.string().regex(/^\d{2}:\d{2}$/).default('23:59'),weekdays:z.array(z.number().int().min(0).max(6)).min(1).default([0,1,2,3,4,5,6]),batchSize:z.number().int().min(1).max(200).default(50),retryLimit:z.number().int().min(0).max(10).default(3),downloadAttachments:z.boolean().default(false),outboundEnabled:z.boolean().default(false),sendPerMinute:z.number().int().min(1).max(100).default(5),sendPerHour:z.number().int().min(1).max(1000).default(50),allowedDomains:z.array(z.string().trim().min(1).max(120)).max(100).default([]),blockedAddresses:z.array(z.string().email()).max(100).default([]),trashFolder:z.string().trim().min(1).max(120).default('Deleted Messages'),deleteDelayDays:z.number().int().min(1).max(90).default(7),
  taskPolicy:z.strictObject({
    warningMinutesBefore:z.number().int().min(5).max(1440).default(120),
    waitingReplyReminderHours:z.number().int().min(1).max(720).default(72),
    autoReopenOnReply:z.boolean().default(true),
    categoryPolicies:z.array(z.strictObject({category:z.string().trim().min(1).max(64),queue:z.string().trim().min(1).max(64),priority:deTaskPrioritySchema,responseMinutes:z.number().int().min(5).max(10080),resolutionMinutes:z.number().int().min(5).max(43200),completionRule:z.enum(['NOTE_OR_REPLY','BUSINESS_RECORD','QUALITY_RECORD_AND_REPLY'])})).default([
      {category:'质量与客诉',queue:'质量与售后队列',priority:'URGENT',responseMinutes:30,resolutionMinutes:480,completionRule:'QUALITY_RECORD_AND_REPLY'},
      {category:'订单处理',queue:'销售与客户队列',priority:'HIGH',responseMinutes:240,resolutionMinutes:1440,completionRule:'BUSINESS_RECORD'},
      {category:'询价与报价',queue:'销售与客户队列',priority:'HIGH',responseMinutes:240,resolutionMinutes:1440,completionRule:'BUSINESS_RECORD'},
      {category:'交付与物流',queue:'计划与生产队列',priority:'HIGH',responseMinutes:60,resolutionMinutes:480,completionRule:'NOTE_OR_REPLY'},
      {category:'财务与对账',queue:'综合队列',priority:'MEDIUM',responseMinutes:240,resolutionMinutes:1440,completionRule:'NOTE_OR_REPLY'},
      {category:'一般邮件',queue:'综合队列',priority:'LOW',responseMinutes:480,resolutionMinutes:2880,completionRule:'NOTE_OR_REPLY'},
    ]),
  }).default({}),
});
export const deMailAutomationSchema=z.strictObject({id:z.string().uuid(),connectionCode:z.string(),enabled:z.boolean(),config:deMailAutomationConfigSchema,nextRunAt:z.string().datetime().nullable(),lastRunAt:z.string().datetime().nullable(),lastError:z.string().nullable(),version:z.number().int().positive()});
export const deMailAutomationWriteSchema=z.strictObject({enabled:z.boolean(),config:deMailAutomationConfigSchema,version:z.number().int().nonnegative()});
export const deMailRuleConditionsSchema=z.strictObject({senderContains:z.string().trim().max(160).default(''),subjectContains:z.string().trim().max(160).default(''),bodyContains:z.string().trim().max(160).default(''),category:z.string().trim().max(64).default('')});
export const deMailRuleActionsSchema=z.strictObject({createTask:z.boolean().default(true),markProcessed:z.boolean().default(false),replyMode:z.enum(['NONE','DRAFT','AUTO']).default('NONE'),templateCode:z.string().trim().max(64).default(''),deleteMode:z.enum(['NONE','CONFIRM','DELAYED']).default('NONE'),deleteAfterDays:z.number().int().min(1).max(90).default(7)}).superRefine((value,ctx)=>{if(value.replyMode!=='NONE'&&!value.templateCode)ctx.addIssue({code:z.ZodIssueCode.custom,path:['templateCode'],message:'回复动作必须选择模板'});});
export const deMailRuleSchema=z.strictObject({id:z.string().uuid(),code:z.string(),name:z.string(),priority:z.number().int(),enabled:z.boolean(),conditions:deMailRuleConditionsSchema,actions:deMailRuleActionsSchema,stopOnMatch:z.boolean(),version:z.number().int().positive()});
export const deMailRuleWriteSchema=z.strictObject({code:z.string().trim().regex(/^[A-Za-z0-9_-]{2,64}$/),name:z.string().trim().min(1).max(120),priority:z.number().int().min(1).max(9999),enabled:z.boolean(),conditions:deMailRuleConditionsSchema,actions:deMailRuleActionsSchema,stopOnMatch:z.boolean(),version:z.number().int().nonnegative()});
export const deMailTemplateSchema=z.strictObject({id:z.string().uuid(),code:z.string(),name:z.string(),subjectTemplate:z.string(),bodyTemplate:z.string(),mode:z.enum(['DRAFT','CONFIRM','AUTO']),status:z.enum(['ACTIVE','DISABLED']),version:z.number().int().positive()});
export const deMailTemplateWriteSchema=z.strictObject({code:z.string().trim().regex(/^[A-Za-z0-9_-]{2,64}$/),name:z.string().trim().min(1).max(120),subjectTemplate:z.string().trim().min(1).max(500),bodyTemplate:z.string().trim().min(1).max(10000),mode:z.enum(['DRAFT','CONFIRM','AUTO']),status:z.enum(['ACTIVE','DISABLED']),version:z.number().int().nonnegative()});
export const deMailMessageStatusSchema=z.enum(['PENDING','WAITING_CONFIRMATION','PROCESSING','PROCESSED','FAILED','IGNORED','DELETE_PENDING','DELETED']);
export const deMailMessageSchema=z.strictObject({id:z.string().uuid(),uid:z.number().int(),messageId:z.string(),subject:z.string(),sender:z.string(),replyTo:z.string(),receivedAt:z.string().datetime(),summary:z.string(),category:z.string(),domain:z.string(),risk:deRiskSchema,status:deMailMessageStatusSchema,handlingResult:z.string().nullable(),taskId:z.string().nullable(),matchedRules:z.array(z.string()),processedAt:z.string().datetime().nullable(),deletedAt:z.string().datetime().nullable(),version:z.number().int().positive()});
export const deMailMessageCommandSchema=z.strictObject({action:z.enum(['MARK_PROCESSED','IGNORE','PREPARE_REPLY','SEND_REPLY','REQUEST_DELETE','MOVE_TRASH']),templateCode:z.string().trim().max(64).optional(),result:z.string().trim().max(500).default(''),version:z.number().int().positive()});
export const deMailRunSchema=z.strictObject({id:z.string().uuid(),triggerType:z.string(),status:z.string(),readCount:z.number().int(),newCount:z.number().int(),actionCount:z.number().int(),startedAt:z.string().datetime(),finishedAt:z.string().datetime().nullable(),error:z.string().nullable()});
export const deMailCenterSchema=z.strictObject({actions:z.array(z.strictObject({id:z.string(),messageId:z.string(),actionType:z.string(),status:z.string(),executedAt:z.string().nullable(),attempts:z.number(),error:z.string().nullable()})).default([]),automation:deMailAutomationSchema,rules:z.array(deMailRuleSchema),templates:z.array(deMailTemplateSchema),messages:z.array(deMailMessageSchema),runs:z.array(deMailRunSchema),tasks:z.array(deTaskSchema).default([]),assignees:z.array(deAssigneeSchema).default([]),queues:z.array(deQueueSchema).default([]),monitor:deMonitorSummarySchema.default({active:0,unassigned:0,dueSoon:0,overdue:0,onHold:0}),workspaceVersion:z.number().int().positive().default(1)});

export const deOpinionRiskSchema=z.enum(['GENERAL','WATCH','IMPORTANT','URGENT']);
export const deOpinionEventStatusSchema=z.enum(['PENDING_REVIEW','CONFIRMED','PROCESSING','OBSERVING','CLOSED','IRRELEVANT','FALSE_POSITIVE']);
export const deOpinionSourceTypeSchema=z.enum(['GDELT','RSS','GENERIC_REST','NEWS_API','FILE_IMPORT']);
export const deOpinionTopicSchema=z.strictObject({id:z.string().uuid(),code:z.string(),name:z.string(),brand:z.string(),requiredTerms:z.array(z.string()),riskTerms:z.record(z.array(z.string())),excludedTerms:z.array(z.string()),languages:z.array(z.string()),enabled:z.boolean(),version:z.number().int().positive()});
export const deOpinionSourceSchema=z.strictObject({id:z.string().uuid(),code:z.string(),name:z.string(),type:deOpinionSourceTypeSchema,status:z.enum(['WAITING_CONFIG','CONFIGURED','CONNECTED','DISABLED','ERROR']),enabled:z.boolean(),config:z.record(z.unknown()),secretConfigured:z.boolean(),lastCheckedAt:z.string().datetime().nullable(),lastError:z.string().nullable(),version:z.number().int().positive()});
export const deOpinionItemSchema=z.strictObject({id:z.string().uuid(),externalId:z.string(),title:z.string(),summary:z.string(),sourceName:z.string(),sourceUrl:z.string().url(),author:z.string(),publishedAt:z.string().datetime(),fetchedAt:z.string().datetime(),language:z.string(),country:z.string(),matchedTerms:z.array(z.string()),sentiment:z.enum(['NEGATIVE','NEUTRAL','POSITIVE','UNKNOWN']),riskScore:z.number().int().min(0).max(100),riskLevel:deOpinionRiskSchema,eventId:z.string().uuid().nullable(),aiStatus:z.enum(['NOT_REQUESTED','PENDING','COMPLETED','FAILED']),aiSummary:z.string().nullable()});
export const deOpinionEventSchema=z.strictObject({id:z.string().uuid(),eventCode:z.string(),title:z.string(),status:deOpinionEventStatusSchema,riskLevel:deOpinionRiskSchema,riskScore:z.number().int().min(0).max(100),sentiment:z.enum(['NEGATIVE','NEUTRAL','POSITIVE','UNKNOWN']),summary:z.string(),matchedTerms:z.array(z.string()),sourceCount:z.number().int().nonnegative(),sourceNames:z.array(z.string()),itemCount:z.number().int().nonnegative(),firstSeenAt:z.string().datetime(),lastSeenAt:z.string().datetime(),owner:z.string(),queue:z.string(),taskId:z.string().nullable(),resolution:z.string().nullable(),falsePositiveReason:z.string().nullable(),version:z.number().int().positive()});
export const deOpinionRunSchema=z.strictObject({id:z.string().uuid(),status:z.enum(['QUEUED','FETCHING','NORMALIZING','ANALYZING','AGGREGATING','CREATING_TASKS','SUCCEEDED','PARTIAL','FAILED','CANCELLED']),stage:z.string(),sourceCodes:z.array(z.string()),rangeHours:z.number().int(),useAi:z.boolean(),previewOnly:z.boolean(),readCount:z.number().int(),newCount:z.number().int(),duplicateCount:z.number().int(),matchCount:z.number().int(),eventCount:z.number().int(),taskCount:z.number().int(),startedAt:z.string().datetime(),finishedAt:z.string().datetime().nullable(),error:z.string().nullable()});
export const deOpinionSummarySchema=z.strictObject({totalItems:z.number().int(),totalEvents:z.number().int(),urgent:z.number().int(),important:z.number().int(),pending:z.number().int(),negative:z.number().int(),activeTasks:z.number().int()});
export const deOpinionCenterSchema=z.strictObject({topic:deOpinionTopicSchema,sources:z.array(deOpinionSourceSchema),items:z.array(deOpinionItemSchema),events:z.array(deOpinionEventSchema),runs:z.array(deOpinionRunSchema),tasks:z.array(deTaskSchema),assignees:z.array(deAssigneeSchema),queues:z.array(deQueueSchema),summary:deOpinionSummarySchema,workspaceVersion:z.number().int().positive()});
export const deOpinionRunStartSchema=z.strictObject({sourceCodes:z.array(z.string()).default([]),rangeHours:z.number().int().min(1).max(24*30).default(24),useAi:z.boolean().default(true),previewOnly:z.boolean().default(false)});
export const deOpinionSourceWriteSchema=z.strictObject({name:z.string().trim().min(1).max(120),type:deOpinionSourceTypeSchema,enabled:z.boolean(),config:z.record(z.unknown()),credential:z.string().trim().max(4096).optional(),version:z.number().int().nonnegative()});
export const deOpinionTopicWriteSchema=z.strictObject({name:z.string().trim().min(1).max(120),brand:z.literal('MAXHUB'),requiredTerms:z.array(z.string().trim().min(1).max(64)).min(1),riskTerms:z.record(z.array(z.string().trim().min(1).max(64)).min(1)),excludedTerms:z.array(z.string().trim().min(1).max(64)),languages:z.array(z.string().trim().min(2).max(12)).min(1),enabled:z.boolean(),version:z.number().int().positive()});
export const deOpinionEventActionSchema=z.strictObject({action:z.enum(['CONFIRM','START','OBSERVE','CLOSE','MARK_IRRELEVANT','MARK_FALSE_POSITIVE','REOPEN']),note:z.string().trim().max(2000).default(''),version:z.number().int().positive()}).superRefine((value,ctx)=>{if(['CLOSE','MARK_IRRELEVANT','MARK_FALSE_POSITIVE'].includes(value.action)&&!value.note)ctx.addIssue({code:z.ZodIssueCode.custom,path:['note'],message:'请填写处理结论或原因'});});
export const deOpinionImportSchema=z.strictObject({sourceCode:z.string().min(1),items:z.array(z.strictObject({externalId:z.string().max(300).optional(),title:z.string().trim().min(1).max(500),summary:z.string().trim().max(5000).default(''),content:z.string().trim().max(20000).default(''),sourceName:z.string().trim().min(1).max(120),sourceUrl:z.string().url(),author:z.string().trim().max(120).default(''),publishedAt:z.string().datetime(),language:z.string().trim().max(12).default('zh'),country:z.string().trim().max(32).default('CN')})).min(1).max(500)});

export const deMarketItemSchema=z.strictObject({id:z.string().uuid(),code:z.string(),name:z.string(),symbol:z.string(),benchmark:z.string(),unit:z.string(),enabled:z.boolean(),lastMarketDate:z.string().nullable(),lastFetchedAt:z.string().datetime().nullable(),version:z.number().int().positive()});
export const deMarketConfigSchema=z.strictObject({id:z.string().uuid(),enabled:z.boolean(),scheduleTime:z.string().regex(/^\d{2}:\d{2}$/),timezone:z.string(),commodityApiBaseUrl:z.string().url(),fxApiBaseUrl:z.string().url(),lastRunAt:z.string().datetime().nullable(),lastSuccessAt:z.string().datetime().nullable(),lastScheduledDate:z.string().nullable(),lastError:z.string().nullable(),isRunning:z.boolean(),version:z.number().int().positive()});
export const deMarketConfigWriteSchema=z.strictObject({enabled:z.boolean(),scheduleTime:z.string().regex(/^\d{2}:\d{2}$/),timezone:z.string().trim().min(1).max(64),commodityApiBaseUrl:z.string().url().max(500),fxApiBaseUrl:z.string().url().max(500),version:z.number().int().nonnegative()});
export const deMarketItemWriteSchema=z.strictObject({enabled:z.boolean(),symbol:z.string().trim().min(1).max(64),benchmark:z.string().trim().min(1).max(120),unit:z.string().trim().min(1).max(80),version:z.number().int().positive()});
export const deMarketPriceSchema=z.strictObject({id:z.string().uuid(),itemCode:z.string(),itemName:z.string(),symbol:z.string(),benchmark:z.string(),unit:z.string(),marketDate:z.string(),openUsd:z.string().nullable(),highUsd:z.string().nullable(),lowUsd:z.string().nullable(),closeUsd:z.string(),openCny:z.string().nullable(),highCny:z.string().nullable(),lowCny:z.string().nullable(),closeCny:z.string(),usdCnyRate:z.string(),fxDate:z.string(),fetchedAt:z.string().datetime(),source:z.string()});
export const deMarketRunSchema=z.strictObject({id:z.string().uuid(),triggerType:z.enum(['MANUAL','SCHEDULED']),status:z.enum(['RUNNING','SUCCEEDED','PARTIAL','FAILED']),startDate:z.string(),endDate:z.string(),itemCount:z.number().int(),successCount:z.number().int(),failureCount:z.number().int(),startedAt:z.string().datetime(),finishedAt:z.string().datetime().nullable(),error:z.string().nullable()});
export const deMarketCenterSchema=z.strictObject({config:deMarketConfigSchema,items:z.array(deMarketItemSchema),prices:z.array(deMarketPriceSchema),runs:z.array(deMarketRunSchema),fxLastSuccessAt:z.string().datetime().nullable(),version:z.number().int().positive()});
export const deMarketQuerySchema=z.strictObject({itemCode:z.string().optional(),currency:z.enum(['USD','CNY']).default('USD'),granularity:z.literal('MONTH').default('MONTH'),from:z.string().date().optional(),to:z.string().date().optional()});

export type DeWorkspace=z.infer<typeof deWorkspaceSchema>;
export type DeTask=z.infer<typeof deTaskSchema>;
export type DeTaskAction=z.infer<typeof deTaskActionSchema>;
export type DeEmployee=z.infer<typeof deEmployeeSchema>;
export type DeScenario=z.infer<typeof deScenarioSchema>;
export type DeConnection=z.infer<typeof deConnectionSchema>;
export type DeConnectionWrite=z.infer<typeof deConnectionWriteSchema>;
export type DeMailAutomation=z.infer<typeof deMailAutomationSchema>;
export type DeMailAutomationConfig=z.infer<typeof deMailAutomationConfigSchema>;
export type DeMailAutomationWrite=z.infer<typeof deMailAutomationWriteSchema>;
export type DeMailRule=z.infer<typeof deMailRuleSchema>;
export type DeMailRuleWrite=z.infer<typeof deMailRuleWriteSchema>;
export type DeMailTemplate=z.infer<typeof deMailTemplateSchema>;
export type DeMailTemplateWrite=z.infer<typeof deMailTemplateWriteSchema>;
export type DeMailMessage=z.infer<typeof deMailMessageSchema>;
export type DeMailCenter=z.infer<typeof deMailCenterSchema>;
export type DeOpinionCenter=z.infer<typeof deOpinionCenterSchema>;
export type DeOpinionEvent=z.infer<typeof deOpinionEventSchema>;
export type DeOpinionEventAction=z.infer<typeof deOpinionEventActionSchema>;
export type DeOpinionItem=z.infer<typeof deOpinionItemSchema>;
export type DeOpinionRun=z.infer<typeof deOpinionRunSchema>;
export type DeOpinionSource=z.infer<typeof deOpinionSourceSchema>;
export type DeOpinionTopic=z.infer<typeof deOpinionTopicSchema>;
export type DeMarketCenter=z.infer<typeof deMarketCenterSchema>;
export type DeMarketConfigWrite=z.infer<typeof deMarketConfigWriteSchema>;
export type DeMarketItemWrite=z.infer<typeof deMarketItemWriteSchema>;
