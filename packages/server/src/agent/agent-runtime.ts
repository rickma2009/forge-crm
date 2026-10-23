import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AgentStep, AiSource } from '@forge-crm/contracts';
import { AgentProvider, type AgentMessage, type ModelTool, type ToolResultBlock } from './agent-provider';
export type AgentTool = { name: string; label: string; description: string; execute: () => Promise<{ sources: AiSource[] }> };
@Injectable()
export class AgentRuntime {
  constructor(private readonly provider: AgentProvider) {}
  async run(input: { system: string; request: string; tools: AgentTool[]; checkpoint: (step?: AgentStep) => Promise<void> }) {
    const tools = new Map(input.tools.map(t => [t.name, t]));
    if (tools.size !== input.tools.length) throw new Error('Agent工具重复');
    const definitions: ModelTool[] = input.tools.map(t => ({ name: t.name, description: t.description, input_schema: { type: 'object', properties: {}, additionalProperties: false } }));
    const messages: AgentMessage[] = [{ role: 'user', content: input.request }];
    const sources = new Map<string, AiSource>(), ids = new Set<string>(); let calls = 0, tokens = 0;
    const start = Date.now();
    for (let turn = 0; turn < 8; turn++) {
      if (Date.now() - start > 7 * 60000) throw new Error('Agent超过执行时间上限');
      await input.checkpoint();
      const step: AgentStep = { id: randomUUID(), kind: 'MODEL', label: `第 ${turn + 1} 轮模型处理`, status: 'RUNNING', at: new Date().toISOString(), sourceIds: [] };
      await input.checkpoint(step);
      let output;
      try { output = await this.provider.turn(input.system, messages, definitions); }
      catch (e) { await input.checkpoint({ ...step, status: 'FAILED' }); throw e; }
      tokens += (output.usage.input_tokens ?? 0) + (output.usage.output_tokens ?? 0);
      await input.checkpoint({ ...step, status: 'SUCCEEDED' });
      const requests = output.content.filter(b => b.type === 'tool_use');
      if (!requests.length) {
        if (!sources.size) throw new Error('Agent未读取任何业务资料，拒绝无依据结果');
        const text = output.content.filter(b => b.type === 'text').map(b => b.text).join('');
        try { return { raw: JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()), sources: [...sources.values()], usage: { total_tokens: tokens, tool_calls: calls, model: output.model } }; }
        catch { throw new Error('Agent结果不是有效JSON'); }
      }
      messages.push({ role: 'assistant', content: output.content }); const results: ToolResultBlock[] = [];
      for (const request of requests) {
        if (++calls > 12) throw new Error('Agent超过工具调用次数上限');
        const tool = tools.get(request.name);
        if (!tool || ids.has(request.id)) throw new Error('Agent请求了未授权或重复的工具调用');
        z.strictObject({}).parse(request.input); ids.add(request.id);
        const event: AgentStep = { id: randomUUID(), kind: 'TOOL', label: tool.label, status: 'RUNNING', at: new Date().toISOString(), sourceIds: [] };
        await input.checkpoint(event);
        try {
          const value = await tool.execute(); value.sources.forEach(s => sources.set(s.id, s));
          await input.checkpoint({ ...event, status: 'SUCCEEDED', sourceIds: value.sources.map(s => s.id) });
          results.push({ type: 'tool_result', tool_use_id: request.id, content: JSON.stringify(value) });
        } catch (e) { await input.checkpoint({ ...event, status: 'FAILED' }); throw e; }
      }
      messages.push({ role: 'user', content: results });
    }
    throw new Error('Agent达到最大处理轮数，请缩小任务范围');
  }
}
