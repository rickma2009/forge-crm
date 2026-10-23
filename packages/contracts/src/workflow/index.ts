import { z } from 'zod';
const uuid=z.string().uuid();
const money=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(v=>Number(v)<=1_000_000_000,'金额超出范围');
export const workflowScopeSchema=z.object({tenantId:uuid,applicationId:uuid}).strict();
const base={scope:workflowScopeSchema,requestId:uuid,actorId:uuid};
export const workflowFieldSchema=z.object({fieldCode:z.string().regex(/^[a-z][A-Za-z0-9]{0,47}$/),fieldName:z.string().min(1).max(80),type:z.enum(['MONEY','NUMBER','TEXT','DATE','ENUM']),operators:z.array(z.enum(['EQ','NE','GT','GTE','LT','LTE'])).min(1),options:z.array(z.object({value:z.string(),label:z.string()})).optional()}).strict();
export const workflowConditionSchema=z.object({field:z.string().regex(/^[a-z][A-Za-z0-9]{0,47}$/),operator:z.enum(['EQ','NE','GT','GTE','LT','LTE']),value:z.string().max(128)}).strict();
export const workflowDesignNodeSchema=z.discriminatedUnion('type',[
 z.object({id:z.literal('start'),type:z.literal('START'),label:z.string().min(1).max(80),x:z.number(),y:z.number()}).strict(),
 z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),type:z.literal('APPROVAL'),label:z.string().min(1).max(80),assigneeKey:z.enum(['managerId','directorId','financeId']),x:z.number(),y:z.number()}).strict(),
 z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),type:z.literal('EXCLUSIVE_GATEWAY'),label:z.string().min(1).max(80),x:z.number(),y:z.number()}).strict(),
 z.object({id:z.literal('business'),type:z.literal('BUSINESS_ACTION'),label:z.string().min(1).max(80),action:z.literal('sales.order.approve@1'),x:z.number(),y:z.number()}).strict(),
 z.object({id:z.literal('end'),type:z.literal('END'),label:z.string().min(1).max(80),x:z.number(),y:z.number()}).strict(),
]);
export const workflowDesignEdgeSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),from:z.string(),to:z.string(),label:z.string().max(80).default(''),match:z.enum(['ALL','ANY']).default('ALL'),conditions:z.array(workflowConditionSchema).max(10).default([]),isDefault:z.boolean().default(false),sortNo:z.number().int().min(1).max(999)}).strict();
export const workflowDesignSchema=z.object({schemaVersion:z.literal(1),nodes:z.array(workflowDesignNodeSchema).min(2).max(30),edges:z.array(workflowDesignEdgeSchema).min(1).max(60)}).strict();
export const workflowCreateSchema=z.object({requestKey:uuid,workflowName:z.string().trim().min(1).max(80),objectCode:z.literal('sales_order')}).strict();
export const workflowTemplateSchema=z.object({code:z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),name:z.string().trim().min(1).max(80),revision:z.number().int().positive(),objectCode:z.literal('sales_order'),design:workflowDesignSchema}).strict();
const task={...base,instanceId:z.string().min(1).max(64),taskId:z.string().min(1).max(64),taskVersion:z.number().int().positive()};
export const workflowCommandSchema=z.discriminatedUnion('kind',[
 z.object({...base,kind:z.literal('PUBLISH'),template:workflowTemplateSchema}).strict(),
 z.object({...base,kind:z.literal('START'),definitionId:z.string().min(1).max(128),businessKey:z.string().min(1).max(128),applicantId:uuid,managerId:uuid,directorId:uuid.optional(),financeId:uuid,amount:money,variables:z.record(z.string(),z.string().max(128)).default({})}).strict(),
 z.object({...task,kind:z.literal('APPROVE'),note:z.string().max(500).optional()}).strict(),
 z.object({...task,kind:z.literal('RETURN'),note:z.string().trim().min(1).max(500)}).strict(),
 z.object({...task,kind:z.literal('REJECT'),note:z.string().trim().min(1).max(500)}).strict(),
 z.object({...task,kind:z.literal('TRANSFER'),targetId:uuid,note:z.string().trim().min(1).max(500)}).strict(),
 z.object({...base,kind:z.literal('ACTION_RESULT'),instanceId:z.string().min(1).max(64),executionId:z.string().min(1).max(64),success:z.boolean(),note:z.string().max(500).optional()}).strict(),
]);
export const workflowGraphSchema=z.object({schemaVersion:z.literal(1),width:z.number().positive(),height:z.number().positive(),nodes:z.array(z.object({id:z.string(),label:z.string(),type:z.enum(['StartEvent','UserTask','ExclusiveGateway','ReceiveTask','EndEvent']),x:z.number(),y:z.number(),width:z.number().positive(),height:z.number().positive()})),edges:z.array(z.object({id:z.string(),from:z.string(),to:z.string(),label:z.string(),points:z.array(z.object({x:z.number(),y:z.number()}))}))});
export const workflowInstanceSchema=z.object({instanceId:z.string(),definitionId:z.string(),revision:z.number().int(),status:z.enum(['RUNNING','ACTION_FAILED','APPROVED','RETURNED','REJECTED']),actionError:z.string().nullable(),graph:workflowGraphSchema,tasks:z.array(z.object({id:z.string(),nodeId:z.string(),name:z.string(),assignee:uuid,version:z.number().int().positive()})),waitingActions:z.array(z.object({executionId:z.string(),nodeId:z.literal('business'),action:z.literal('sales.order.approve@1')})),visits:z.array(z.object({visitId:z.string(),nodeId:z.string(),type:z.string(),startedAt:z.string(),endedAt:z.string().nullable(),assignee:z.string().nullable()})),audit:z.array(z.object({actor_id:uuid,action:z.string(),node_id:z.string(),note:z.string().nullable(),created_at:z.string()}))});
export const workflowPublishedSchema=z.object({definitionId:z.string(),revision:z.number().int(),graph:workflowGraphSchema});
export type WorkflowCommand=z.infer<typeof workflowCommandSchema>;
export type WorkflowScope=z.infer<typeof workflowScopeSchema>;
export type WorkflowInstance=z.infer<typeof workflowInstanceSchema>;
export type WorkflowGraph=z.infer<typeof workflowGraphSchema>;
export type WorkflowDesign=z.infer<typeof workflowDesignSchema>;
export type WorkflowDesignNode=z.infer<typeof workflowDesignNodeSchema>;
export type WorkflowDesignEdge=z.infer<typeof workflowDesignEdgeSchema>;
export type WorkflowField=z.infer<typeof workflowFieldSchema>;
export * from './sales-approval';
