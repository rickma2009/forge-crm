import 'reflect-metadata';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {config} from 'dotenv';
import {WorkflowEngineClient} from '../src/workflow/workflow-engine.client';
import {defaultSalesDesign} from '../src/workflow/workflow-definition';
import {workflowInstanceSchema,type WorkflowCommand} from '@forge-crm/contracts';
const root=resolve(process.cwd(),'../..');
config({path:resolve(root,'infra/workflow/.env'),quiet:true});
process.env.WORKFLOW_ENGINE_URL='http://127.0.0.1:8091';
const client=new WorkflowEngineClient();
const receiptPath=resolve(root,'infra/workflow/.runtime/smoke.json');
async function main(){
 let ready=false;
 for(let n=0;n<40;n++){try{const r=await fetch('http://127.0.0.1:8091/internal/workflows/health',{headers:{'X-Workflow-Service-Token':process.env.WORKFLOW_SERVICE_TOKEN!},signal:AbortSignal.timeout(2000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready,'Engine did not become ready');
 if(process.argv.includes('--verify-restart')){
  const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
  assert.equal((await client.instance(receipt.scope,receipt.instanceId)).status,'APPROVED');
  assert.equal(workflowInstanceSchema.parse(await client.command(receipt.resultCommand)).status,'APPROVED');
  console.log('PASS: restart preserves instance, history and command replay');return;
 }
 const scope={tenantId:randomUUID(),applicationId:randomUUID()},applicantId=randomUUID(),managerId=randomUUID(),directorId=randomUUID(),financeId=randomUUID();
 const base=()=>({scope,requestId:randomUUID(),actorId:applicantId});
 const definition=await client.command({...base(),kind:'PUBLISH',template:{code:'sales_order',name:'隔离引擎验收',revision:1,objectCode:'sales_order',design:defaultSalesDesign()}});
 let state=workflowInstanceSchema.parse(await client.command({...base(),kind:'START',definitionId:definition.definitionId,businessKey:randomUUID(),applicantId,managerId,directorId,financeId,amount:'120000.01',variables:{netAmount:'120000.01',amount:'120000.01',taxAmount:'0',discount:'1',orderType:'NORMAL',sourceType:'MANUAL',currencyCode:'CNY'}}));
 for(const actorId of [managerId,directorId,financeId]){const task=state.tasks[0];assert.equal(task.assignee,actorId);state=workflowInstanceSchema.parse(await client.command({...base(),actorId,kind:'APPROVE',instanceId:state.instanceId,taskId:task.id,taskVersion:task.version,note:'独立引擎验收'}));}
 assert.equal(state.waitingActions.length,1);assert.equal(state.status,'RUNNING');
 const resultCommand:WorkflowCommand={...base(),actorId:financeId,kind:'ACTION_RESULT',instanceId:state.instanceId,executionId:state.waitingActions[0].executionId,success:true,note:'隔离测试结果，不调用真实销售单据'};
 state=workflowInstanceSchema.parse(await client.command(resultCommand));assert.equal(state.status,'APPROVED');
 assert.deepEqual(await client.command(resultCommand),state);
 assert.equal((await fetch('http://127.0.0.1:8091/internal/workflows/health')).status,401);
 await mkdir(resolve(root,'infra/workflow/.runtime'),{recursive:true});await writeFile(receiptPath,JSON.stringify({scope,instanceId:state.instanceId,resultCommand},null,2));
 console.log('PASS: HTTP client, real PostgreSQL, amount branch, action wait, receipt and duplicate replay');
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Workflow check failed');process.exitCode=1;});
