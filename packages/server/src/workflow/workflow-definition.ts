import {z} from 'zod';
import {salesWorkflowConfigSchema,workflowDesignSchema,type WorkflowDesign,type WorkflowField} from '@forge-crm/contracts';
import {ApiException} from '../http/api-exceptions';

const uuid=z.string().uuid();
export const workflowDraftConfigSchema=z.object({
 design:workflowDesignSchema,
 personnelPolicy:z.literal('FROZEN'),
 departments:z.array(salesWorkflowConfigSchema.shape.departments.element).max(200),
}).strict();
export const workflowDraftUpdateSchema=z.object({requestKey:uuid,version:z.number().int().positive(),workflowName:z.string().trim().min(1).max(80),config:workflowDraftConfigSchema}).strict();

export const salesOrderFields:WorkflowField[]=[
 {fieldCode:'netAmount',fieldName:'折扣后总额',type:'MONEY',operators:['EQ','NE','GT','GTE','LT','LTE']},
 {fieldCode:'amount',fieldName:'原金额',type:'MONEY',operators:['EQ','NE','GT','GTE','LT','LTE']},
 {fieldCode:'taxAmount',fieldName:'税额',type:'MONEY',operators:['EQ','NE','GT','GTE','LT','LTE']},
 {fieldCode:'discount',fieldName:'表头折扣',type:'NUMBER',operators:['EQ','NE','GT','GTE','LT','LTE']},
 {fieldCode:'orderType',fieldName:'订单类型',type:'ENUM',operators:['EQ','NE'],options:[{value:'NORMAL',label:'普通销售'},{value:'SAMPLE',label:'样品'},{value:'REPLACEMENT',label:'补发'}]},
 {fieldCode:'sourceType',fieldName:'来源',type:'ENUM',operators:['EQ','NE'],options:[{value:'MANUAL',label:'按客户新建'},{value:'OPPORTUNITY',label:'引入商机'},{value:'QUOTATION',label:'引入报价单'}]},
 {fieldCode:'currencyCode',fieldName:'币别',type:'ENUM',operators:['EQ','NE'],options:[{value:'CNY',label:'人民币'}]},
];
export const workflowObjects=[{objectCode:'sales_order',objectName:'销售订单',fields:salesOrderFields,actions:[{actionCode:'sales.order.approve@1',actionName:'销售订单审核生效'}]}] as const;

export const emptySalesDesign=():WorkflowDesign=>({schemaVersion:1,nodes:[
 {id:'start',type:'START',label:'开始',x:40,y:170},
 {id:'end',type:'END',label:'结束',x:360,y:170},
],edges:[
 {id:'start_end',from:'start',to:'end',label:'',match:'ALL',conditions:[],isDefault:false,sortNo:10},
]});

export const defaultSalesDesign=():WorkflowDesign=>({schemaVersion:1,nodes:[
 {id:'start',type:'START',label:'提交',x:40,y:170},
 {id:'manager',type:'APPROVAL',label:'部门经理审批',assigneeKey:'managerId',x:140,y:150},
 {id:'amount',type:'EXCLUSIVE_GATEWAY',label:'金额判断',x:350,y:170},
 {id:'director',type:'APPROVAL',label:'二级部门负责人审批',assigneeKey:'directorId',x:460,y:40},
 {id:'finance',type:'APPROVAL',label:'财务审批',assigneeKey:'financeId',x:790,y:150},
 {id:'business',type:'BUSINESS_ACTION',label:'销售订单审核生效',action:'sales.order.approve@1',x:1010,y:150},
 {id:'end',type:'END',label:'完成',x:1260,y:170},
],edges:[
 {id:'submit',from:'start',to:'manager',label:'',match:'ALL',conditions:[],isDefault:false,sortNo:10},
 {id:'check',from:'manager',to:'amount',label:'',match:'ALL',conditions:[],isDefault:false,sortNo:20},
 {id:'high',from:'amount',to:'director',label:'超过阈值',match:'ALL',conditions:[{field:'netAmount',operator:'GT',value:'100000'}],isDefault:false,sortNo:30},
 {id:'low',from:'amount',to:'finance',label:'默认',match:'ALL',conditions:[],isDefault:true,sortNo:40},
 {id:'high_merge',from:'director',to:'finance',label:'',match:'ALL',conditions:[],isDefault:false,sortNo:50},
 {id:'apply',from:'finance',to:'business',label:'',match:'ALL',conditions:[],isDefault:false,sortNo:60},
 {id:'finish',from:'business',to:'end',label:'',match:'ALL',conditions:[],isDefault:false,sortNo:70},
]});

function invalid(message:string):never{throw new ApiException('BAD_REQUEST',400,message);}
function validateConditionFields(design:WorkflowDesign){
 const fieldMap=new Map(salesOrderFields.map(f=>[f.fieldCode,f]));
 for(const edge of design.edges)for(const c of edge.conditions){const f=fieldMap.get(c.field);if(!f||!f.operators.includes(c.operator))invalid('条件字段或运算符不属于数据对象目录');if(['MONEY','NUMBER'].includes(f.type)&&(!/^\d{1,10}(\.\d{1,4})?$/.test(c.value)||!Number.isFinite(Number(c.value))))invalid(`字段“${f.fieldName}”需要非负数值`);if(f.type==='ENUM'&&!f.options?.some(o=>o.value===c.value))invalid(`字段“${f.fieldName}”的选项无效`);}
}
export function validateWorkflowDraft(raw:unknown):WorkflowDesign{
 const design=workflowDesignSchema.parse(raw),nodes=new Map(design.nodes.map(n=>[n.id,n]));
 if(nodes.size!==design.nodes.length)invalid('流程节点编码不可重复');
 if(!nodes.has('start')||!nodes.has('end'))invalid('流程必须保留开始和结束节点');
 const edges=new Set<string>();for(const e of design.edges){if(edges.has(e.id))invalid('流程连线编码不可重复');edges.add(e.id);if(!nodes.has(e.from)||!nodes.has(e.to)||e.from===e.to)invalid('流程连线引用无效节点');}
 validateConditionFields(design);
 return design;
}
export function validateWorkflowDesign(raw:unknown):WorkflowDesign{
 const design=validateWorkflowDraft(raw),nodes=new Map(design.nodes.map(n=>[n.id,n]));
 if(!nodes.has('business'))invalid('流程缺少业务动作节点');
 const incoming=(id:string)=>design.edges.filter(e=>e.to===id),outgoing=(id:string)=>design.edges.filter(e=>e.from===id);
 if(incoming('start').length||outgoing('end').length)invalid('开始或结束节点方向无效');
 for(const node of design.nodes){const out=outgoing(node.id);if(node.type==='END')continue;if(!out.length)invalid(`节点“${node.label}”没有后续路径`);if(node.type==='EXCLUSIVE_GATEWAY'){if(out.length<2||out.filter(e=>e.isDefault).length!==1)invalid(`分支“${node.label}”必须有且仅有一个默认路径`);for(const edge of out.filter(e=>!e.isDefault))if(!edge.conditions.length)invalid(`分支“${edge.label||edge.id}”缺少条件`);}else if(out.length!==1)invalid(`节点“${node.label}”只能有一条后续路径`);}
 for(const edge of design.edges){const source=nodes.get(edge.from);if(source?.type!=='EXCLUSIVE_GATEWAY'&&(edge.isDefault||edge.conditions.length))invalid('条件只能设置在排他分支的出线上');if(source?.type==='EXCLUSIVE_GATEWAY'&&edge.isDefault&&edge.conditions.length)invalid('默认分支不可设置判断条件');}
 const visit=(start:string,reverse=false)=>{const seen=new Set<string>(),queue=[start];while(queue.length){const id=queue.shift()!;if(seen.has(id))continue;seen.add(id);for(const e of design.edges.filter(e=>reverse?e.to===id:e.from===id))queue.push(reverse?e.from:e.to);}return seen;};
 const fromStart=visit('start'),toEnd=visit('end',true);for(const n of design.nodes)if(!fromStart.has(n.id)||!toEnd.has(n.id))invalid(`节点“${n.label}”不在开始到结束的有效路径上`);
 return design;
}
