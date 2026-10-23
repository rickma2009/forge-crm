import {call,write} from '../gateway';
import type {SalesWorkflowConfig,SalesWorkflowAction,WorkflowInstance,WorkflowGraph,WorkflowDesign} from '@forge-crm/contracts';
export type Approval={id:string;orderId:string;orderNo:string;round:number;status:string;active:boolean;applicantId:string;createdAt:string;canAct?:boolean;engineState:WorkflowInstance|null;snapshot:{version:number;applicantName:string;customerName:string;netAmount:string;remark:string;peopleNames:Record<string,string>;lines:Array<{id:string;itemCode:string;itemName:string;quantity:string;finalAmount:string}>};people:SalesWorkflowConfig['departments'][number];deliveries?:Array<{id:string;status:string;error:string|null}>};
export type WorkflowDraftConfig={design:WorkflowDesign;personnelPolicy:'FROZEN';departments:SalesWorkflowConfig['departments']};
export type Config={id:string;workflowCode:string;workflowName:string;objectCode:'sales_order';objectName?:string;revision:number;status:string;enabled:boolean;config:WorkflowDraftConfig;graph:WorkflowGraph|null;createdBy:string;createdByName?:string;createdAt:string;updatedAt:string;version:number};
const base=(code:string)=>`/api/systems/${encodeURIComponent(code)}/workflows`;
async function get<T>(url:string):Promise<T>{return(await call(url)).json();}
async function post<T>(url:string,data:unknown={}):Promise<T>{return(await write(url,data)).json();}
export const workflowApi={
 preview:(c:string,value:{code:string;name:string;revision:number;objectCode:'sales_order';design:WorkflowDesign})=>post<WorkflowGraph>(`${base(c)}/preview`,value),
 issues:(c:string)=>get<Array<{id:string;error:string;attempts:number}>>(`${base(c)}/issues`),
 list:(c:string,q:URLSearchParams)=>get<{items:Approval[];pagination:{total:number}}>(`${base(c)}/approvals?${q}`),
 detail:(c:string,id:string)=>get<Approval>(`${base(c)}/approvals/${id}`),
 order:(c:string,id:string)=>get<Approval[]>(`${base(c)}/orders/${id}`),
 act:(c:string,id:string,data:SalesWorkflowAction)=>post(`${base(c)}/approvals/${id}/actions`,data),
 configs:(c:string)=>get<Config[]>(`${base(c)}/configurations`),
 options:(c:string)=>get<{objects:Array<{objectCode:'sales_order';objectName:string;fields:Array<{fieldCode:string;fieldName:string;type:string;operators:string[];options?:Array<{value:string;label:string}>}>}>;organizations:{id:string;unitName:string;parentId:string|null}[];users:{id:string;displayName:string}[]}>(`${base(c)}/options`),
 objects:(c:string)=>get<{items:Array<{objectCode:'sales_order';objectName:string;fields:Array<{fieldCode:string;fieldName:string;type:string;operators:string[];options?:Array<{value:string;label:string}>}>}>}>(`${base(c)}/objects`),
 definitions:(c:string,q:URLSearchParams)=>get<{items:Config[];pagination:{page:number;pageSize:number;total:number;totalPages:number}}>(`${base(c)}/definitions?${q}`),
 definition:(c:string,id:string)=>get<Config>(`${base(c)}/definitions/${id}`),
 createDefinition:(c:string,data:{requestKey:string;workflowName:string;objectCode:'sales_order'})=>post<Config>(`${base(c)}/definitions`,data),
 updateDefinition:(c:string,id:string,data:{requestKey:string;version:number;workflowName:string;config:WorkflowDraftConfig})=>write(`${base(c)}/definitions/${id}`,data,'PUT').then(r=>r.json() as Promise<Config>),
 editDefinition:(c:string,id:string)=>post<Config>(`${base(c)}/definitions/${id}/edit`,{requestKey:crypto.randomUUID()}),
 deleteDefinition:(c:string,id:string)=>write(`${base(c)}/definitions/${id}`,undefined,'DELETE').then(r=>r.json()),
 publishDefinition:(c:string,id:string)=>post<Config>(`${base(c)}/definitions/${id}/publish`,{requestKey:crypto.randomUUID()}),
 publish:(c:string,data:SalesWorkflowConfig)=>post<Config>(`${base(c)}/configurations`,data),
 notices:(c:string)=>get<{unread:number;items:{id:string;approvalId:string}[]}>(`${base(c)}/notices`),
 read:(c:string,id:string)=>post(`${base(c)}/approvals/${id}/read`),
 retry:(c:string,id:string)=>post(`${base(c)}/deliveries/${id}/retry`),
};
export const statusName=(s:string)=>({STARTING:'启动中',RUNNING:'审批中',APPROVED:'已通过',RETURNED:'已退回',REJECTED:'已拒绝',ACTION_FAILED:'业务执行失败',PUBLISHING:'发布中',PUBLISHED:'已发布'}[s]??s);
