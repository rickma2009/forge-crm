import { z } from 'zod';
export const codeRuleFields = z.object({
 objectCode:z.string().trim().regex(/^[A-Z][A-Z0-9_]{0,39}$/,'对象编码使用大写字母、数字和下划线'),
 objectName:z.string().trim().min(1).max(80),sortNo:z.number().int().min(0).max(999999).default(0),
 hasPrefix:z.boolean().default(true),prefix:z.string().trim().regex(/^[A-Za-z0-9]*$/,'前缀仅支持字母或数字').max(12).default(''),
 hasDate:z.boolean().default(false),dateType:z.enum(['NONE','YEAR','MONTH','DAY']).default('NONE'),
 digits:z.number().int().min(1).max(12),startNumber:z.number().int().min(1).max(999999999999).default(1),status:z.enum(['ACTIVE','DISABLED']).default('ACTIVE'),
}).strict();
export const codeRuleWriteSchema=codeRuleFields.extend({version:z.number().int().min(0).default(0)}).superRefine((v,c)=>{
 if(v.hasPrefix&&!v.prefix)c.addIssue({code:'custom',path:['prefix'],message:'请输入前缀编码'});
 if(v.hasDate&&v.dateType==='NONE')c.addIssue({code:'custom',path:['dateType'],message:'请选择日期类型'});
 if(v.startNumber>=10**v.digits)c.addIssue({code:'custom',path:['startNumber'],message:'开始数超出流水号位数'});
}).transform(v=>({...v,prefix:v.hasPrefix?v.prefix:'',dateType:v.hasDate?v.dateType:'NONE' as const}));
export const codeRuleSchema=codeRuleFields.extend({id:z.string().uuid(),version:z.number().int().positive(),used:z.boolean(),preview:z.string()});
export const codeRuleListSchema=z.object({items:codeRuleSchema.array(),pagination:z.object({page:z.number(),pageSize:z.number(),total:z.number(),totalPages:z.number()})});
export const codeAllocationSchema=z.object({objectCode:codeRuleFields.shape.objectCode,requestId:z.string().uuid()}).strict();
export type CodeRule=z.infer<typeof codeRuleSchema>;
export type CodeRuleWrite=z.input<typeof codeRuleWriteSchema>;
