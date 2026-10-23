import { Injectable } from '@nestjs/common';
import { workflowTemplateSchema, workflowGraphSchema, workflowCommandSchema, workflowInstanceSchema, workflowPublishedSchema, workflowScopeSchema, type WorkflowCommand, type WorkflowScope } from '@forge-crm/contracts';

/** Server-only transport. Callers must authorize users, resolve personnel and persist request IDs before invocation. */
export class WorkflowTransportError extends Error {
 constructor(public readonly code:'UNAVAILABLE'|'REJECTED'|'INVALID_RESPONSE'|'NOT_CONFIGURED',public readonly status?:number){super(`WORKFLOW_${code}`);}
}
@Injectable()
export class WorkflowEngineClient {
 private config(){
  const raw=process.env.WORKFLOW_ENGINE_URL,token=process.env.WORKFLOW_SERVICE_TOKEN;
  if(!raw||!token||token.length<32)throw new WorkflowTransportError('NOT_CONFIGURED');
  const url=new URL(raw);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['https:','http:'].includes(url.protocol))throw new WorkflowTransportError('NOT_CONFIGURED');
  if(url.protocol==='http:'&&!['localhost','127.0.0.1','workflow-engine'].includes(url.hostname))throw new WorkflowTransportError('NOT_CONFIGURED');
  return{origin:url.origin,token};
 }
 private async request(path:string,body?:unknown):Promise<unknown>{
  const {origin,token}=this.config();let response:Response;
  try {response=await fetch(origin+path,{method:body?'POST':'GET',headers:{'X-Workflow-Service-Token':token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000),redirect:'error'});}
  catch{throw new WorkflowTransportError('UNAVAILABLE');}
  if(!response.ok)throw new WorkflowTransportError(response.status>=500?'UNAVAILABLE':'REJECTED',response.status);
  try{return await response.json();}catch{throw new WorkflowTransportError('INVALID_RESPONSE');}
 }
 async preview(raw:unknown){return workflowGraphSchema.parse(await this.request('/internal/workflows/preview',workflowTemplateSchema.parse(raw)));}
 async command(raw:WorkflowCommand){
  const c=workflowCommandSchema.parse(raw),result=await this.request('/internal/workflows/commands',c);
  const parsed=(c.kind==='PUBLISH'?workflowPublishedSchema:workflowInstanceSchema).safeParse(result);
  if(!parsed.success)throw new WorkflowTransportError('INVALID_RESPONSE');return parsed.data;
 }
 async instance(raw:WorkflowScope,id:string){
  const scope=workflowScopeSchema.parse(raw);if(!id||id.length>64)throw new WorkflowTransportError('REJECTED',400);
  const result=await this.request(`/internal/workflows/instances/${encodeURIComponent(id)}?${new URLSearchParams(scope)}`),parsed=workflowInstanceSchema.safeParse(result);
  if(!parsed.success)throw new WorkflowTransportError('INVALID_RESPONSE');return parsed.data;
 }
}
