import { WorkflowEngineClient } from './workflow-engine.client';
import { workflowCommandSchema } from '@forge-crm/contracts';
import { defaultSalesDesign } from './workflow-definition';
const id='b3f685cb-e84d-42cc-941a-f44999c7ec62';
const command={kind:'PUBLISH' as const,scope:{tenantId:id,applicationId:id},requestId:id,actorId:id,template:{code:'sales_order',name:'订单',revision:1,objectCode:'sales_order' as const,design:defaultSalesDesign()}};
describe('Workflow engine boundary',()=>{
 const original={...process.env};afterEach(()=>{process.env={...original};jest.restoreAllMocks();});
 it('fails closed without configuration',async()=>{delete process.env.WORKFLOW_ENGINE_URL;await expect(new WorkflowEngineClient().command(command)).rejects.toMatchObject({code:'NOT_CONFIGURED'});});
 it('rejects script or arbitrary XML configuration',()=>{expect(workflowCommandSchema.safeParse({...command,template:{...command.template,xml:'<process/>'}}).success).toBe(false);});
 it('preserves idempotency key and reports uncertain transport without retry',async()=>{process.env.WORKFLOW_ENGINE_URL='http://127.0.0.1:8091';process.env.WORKFLOW_SERVICE_TOKEN='x'.repeat(32);const mock=jest.spyOn(globalThis,'fetch').mockRejectedValue(new Error('timeout'));await expect(new WorkflowEngineClient().command(command)).rejects.toMatchObject({code:'UNAVAILABLE'});expect(mock).toHaveBeenCalledTimes(1);expect(JSON.parse(mock.mock.calls[0][1]!.body as string).requestId).toBe(id);});
 it('does not expose response errors or follow redirects',async()=>{process.env.WORKFLOW_ENGINE_URL='http://127.0.0.1:8091';process.env.WORKFLOW_SERVICE_TOKEN='x'.repeat(32);const mock=jest.spyOn(globalThis,'fetch').mockResolvedValue(new Response('secret internal details',{status:403}));await expect(new WorkflowEngineClient().command(command)).rejects.toMatchObject({code:'REJECTED',status:403,message:'WORKFLOW_REJECTED'});expect(mock.mock.calls[0][1]!.redirect).toBe('error');});
 it('rejects malformed successful responses',async()=>{process.env.WORKFLOW_ENGINE_URL='http://127.0.0.1:8091';process.env.WORKFLOW_SERVICE_TOKEN='x'.repeat(32);jest.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{}'));await expect(new WorkflowEngineClient().command(command)).rejects.toMatchObject({code:'INVALID_RESPONSE'});});
});
