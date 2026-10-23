import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { aiConfig } from '../ai/ai-provider';
import { mockAnalysis } from '../ai/analysis-domain';
export type ModelBlock = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string };
export type AgentMessage = { role: 'user' | 'assistant'; content: string | (ModelBlock | ToolResultBlock)[] };
export type ModelTool = { name: string; description: string; input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties: false } };
export const agentModel = () => process.env.AGENT_AI_MODEL || aiConfig().model;
const blockSchema = z.discriminatedUnion('type', [z.object({ type: z.literal('text'), text: z.string().max(100000) }), z.object({ type: z.literal('tool_use'), id: z.string().min(1).max(100), name: z.string().min(1).max(100), input: z.record(z.unknown()) }), z.object({ type: z.literal('thinking'), thinking: z.string().max(100000), signature: z.string().max(100000).optional() })]);
@Injectable()
export class AgentProvider {
  async turn(system: string, messages: AgentMessage[], tools: ModelTool[]) {
    const c = aiConfig();
    const model = agentModel();
    if (!c.configured) throw new Error('Agent尚未配置模型');
    if (JSON.stringify({ system, messages, tools }).length > c.maxInputChars) throw new Error('Agent上下文超过上限，未截断或发送');
    if (c.provider === 'mock') {
      if (system.startsWith('PERSONAL_CRM_AGENT')) {
        const sourceMatch = system.match(/当前已授权资料：(\[.*\])$/s);
        const contextual = sourceMatch ? z.array(z.object({ id: z.string(), title: z.string() }).passthrough()).parse(JSON.parse(sourceMatch[1])) : [];
        const last = messages.at(-1);
        const question = typeof last?.content === 'string' ? last.content : '';
        const first = contextual[0];
        const result = { answer: first ? `根据当前资料“${first.title}”，建议核对最新跟进记录并明确下一步行动。以下为模拟回复，仅供功能验证。` : '目前没有绑定业务资料。请指定客户或商机，或提供检索关键词。以下为模拟回复，仅供功能验证。', sourceIds: first ? [first.id] : [], todoDraft: /待办|跟进|提醒/.test(question) ? { title: first ? `跟进${first.title}` : '跟进当前事项', description: '核对最新资料并确认下一步', dueDate: null } : null };
        const enhanced=system.includes('本次模式：MEETING')?{...result,todoDraft:null,todoDrafts:[{title:'核实客户需求',description:'根据纪要确认需求',dueDate:null},{title:'准备跟进材料',description:'复核资料后准备下一步',dueDate:null}],meeting:{facts:[],needs:['用户会议输入待核实'],issues:[],inferences:[],missing:['责任人与日期待确认']}}:result;
        return { content: [{ type: 'text' as const, text: JSON.stringify(enhanced) }], usage: { input_tokens: 0, output_tokens: 0 }, model: 'mock' };
      }
      const outputs = messages.flatMap(m => Array.isArray(m.content) ? m.content.filter(b => b.type === 'tool_result') as ToolResultBlock[] : []);
      const names = ['getOpportunity', 'listFollowUps', 'listProducts'];
      if (outputs.length < names.length) return { content: [{ type: 'tool_use' as const, id: `mock-${outputs.length}`, name: names[outputs.length], input: {} }], usage: { input_tokens: 0, output_tokens: 0 }, model: 'mock' };
      const result = mockAnalysis([]); const source = JSON.parse(outputs[0].content).sources[0];
      result.sections[0].items[0] = { text: `模拟结果：${source?.title ?? '当前商机'}，仅用于验证工具调用。`, kind: 'FACT', sourceIds: source ? [source.id] : [] };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], usage: { input_tokens: 0, output_tokens: 0 }, model: 'mock' };
    }
    const url = new URL(c.baseUrl.endsWith('/v1') ? c.baseUrl + '/messages' : c.baseUrl + '/v1/messages');
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Agent模型地址必须使用无凭证HTTPS');
    let response: Response;
    try { response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(c.timeoutMs), headers: { Authorization: `Bearer ${c.token}`, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 8192, system, messages, tools }) }); }
    catch { throw new Error('Agent模型连接失败或超时，未自动重发'); }
    if (!response.ok) {
      // Only use the upstream error code; never echo a body that may contain credentials or business data.
      const error = z.object({ error: z.object({ code: z.string().optional() }).optional() }).safeParse(await response.json().catch(() => null));
      const code = error.success ? error.data.error?.code : undefined;
      throw new Error([401, 403].includes(response.status) ? 'Agent模型鉴权失败，请检查服务器配置' : code === 'model_not_supported' ? '当前模型在网关没有可用服务，请检查模型名称、令牌权限及网关路由' : `Agent模型请求失败（HTTP ${response.status}）`);
    }
    let parsed;
    try { parsed = z.object({ content: z.array(blockSchema).min(1).max(20), stop_reason: z.string(), model: z.string().optional(), usage: z.object({ input_tokens: z.number().nonnegative().optional(), output_tokens: z.number().nonnegative().optional() }).optional() }).parse(await response.json()); }
    catch { throw new Error('Agent模型响应协议无效'); }
    if (!['end_turn', 'tool_use'].includes(parsed.stop_reason)) throw new Error('Agent模型响应未完整结束，未保存结果');
    const content = parsed.content.filter((block): block is ModelBlock => block.type !== 'thinking');
    if (!content.length) throw new Error('Agent模型未返回可展示内容');
    if ((parsed.stop_reason === 'tool_use') !== content.some(b => b.type === 'tool_use')) throw new Error('Agent工具调用响应不一致');
    return { content, usage: parsed.usage ?? {}, model: parsed.model ?? model };
  }
}
