import {z} from 'zod';
const id=z.string().uuid();
export const salesWorkflowConfigSchema=z.object({requestKey:id,threshold:z.string().regex(/^\d{1,9}(\.\d{1,2})?$/),personnelPolicy:z.literal('FROZEN'),departments:z.array(z.object({orgUnitId:id,managerId:id,directorOrgId:id,directorId:id,financeId:id,managerAlternates:z.array(id).max(20).default([]),directorAlternates:z.array(id).max(20).default([]),financeAlternates:z.array(id).max(20).default([])}).strict()).min(1).max(100)}).strict();
export const salesWorkflowActionSchema=z.object({requestKey:id,taskId:z.string().min(1).max(64),taskVersion:z.number().int().positive(),action:z.enum(['APPROVE','RETURN','REJECT','TRANSFER']),targetId:id.optional(),note:z.string().trim().max(500).default('')}).strict().refine(v=>v.action==='APPROVE'||!!v.note,'请填写原因').refine(v=>v.action!=='TRANSFER'||!!v.targetId,'请选择接收人');
export type SalesWorkflowConfig=z.infer<typeof salesWorkflowConfigSchema>;
export type SalesWorkflowAction=z.infer<typeof salesWorkflowActionSchema>;
