import { AgentRuntime } from './agent-runtime';
import { AgentProvider } from './agent-provider';
import { opportunityAgentTools } from './opportunity-agent.tools';
import type { AiSnapshot } from '@forge-crm/contracts';
const snapshot = { sources: [{ id: 'O:1', kind: 'opportunity', title: '测试商机', content: { name: '测试' } }, { id: 'F:1', kind: 'follow-up', title: '跟进', content: { workItem: '确认交期' } }, { id: 'A:1', kind: 'historical-analysis', title: '历史', content: {} }] } as AiSnapshot;
describe('public Agent runtime', () => {
  it('loops through tools, returns tool messages to the model and records actual sources', async () => {
    const provider = { turn: jest.fn().mockResolvedValueOnce({ content: [{ type: 'tool_use', id: 'a', name: 'getOpportunity', input: {} }], usage: { input_tokens: 5 }, model: 'test' }).mockResolvedValueOnce({ content: [{ type: 'text', text: '{"answer":"done"}' }], usage: { output_tokens: 3 }, model: 'test' }) };
    const steps: unknown[] = [], authorize = jest.fn(async () => {});
    const result = await new AgentRuntime(provider as unknown as AgentProvider).run({ system: 'task', request: 'analyze', tools: opportunityAgentTools(snapshot, authorize), checkpoint: async s => { if (s) steps.push(s); } });
    expect(result.raw).toEqual({ answer: 'done' }); expect(result.sources.map(s => s.id)).toEqual(['O:1']); expect(result.usage.total_tokens).toBe(8); expect(authorize).toHaveBeenCalledTimes(1);
    expect(provider.turn.mock.calls[1][1][2].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'a' }); expect(steps).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'TOOL', status: 'SUCCEEDED', sourceIds: ['O:1'] })]));
  });
  it.each([['deleteOpportunity', {}], ['getOpportunity', { id: 'other-opportunity' }]])('rejects unauthorized tool or cross-object arguments: %s', async (name, input) => {
    const provider = { turn: jest.fn(async () => ({ content: [{ type: 'tool_use', id: 'a', name, input }], usage: {}, model: 'test' })) }, authorize = jest.fn(async () => {});
    await expect(new AgentRuntime(provider as unknown as AgentProvider).run({ system: '', request: '', tools: opportunityAgentTools(snapshot, authorize), checkpoint: async () => {} })).rejects.toThrow(); expect(authorize).not.toHaveBeenCalled();
  });
  it('stops before model calls on cancellation or revoked permission', async () => {
    const provider = { turn: jest.fn() };
    await expect(new AgentRuntime(provider as unknown as AgentProvider).run({ system: '', request: '', tools: [], checkpoint: async () => { throw new Error('cancelled'); } })).rejects.toThrow('cancelled'); expect(provider.turn).not.toHaveBeenCalled();
  });
  it('does not accept an answer without reading sources and bounds repeated tool loops', async () => {
    const provider = { turn: jest.fn(async () => ({ content: [{ type: 'text', text: '{}' }], usage: {}, model: 'test' })) };
    await expect(new AgentRuntime(provider as unknown as AgentProvider).run({ system: '', request: '', tools: [], checkpoint: async () => {} })).rejects.toThrow('未读取');
    let id = 0; provider.turn.mockImplementation(async () => ({ content: [{ type: 'tool_use', id: String(++id), name: 'getOpportunity', input: {} }] as never, usage: {}, model: 'test' }));
    await expect(new AgentRuntime(provider as unknown as AgentProvider).run({ system: '', request: '', tools: opportunityAgentTools(snapshot, async () => {}), checkpoint: async () => {} })).rejects.toThrow('最大处理轮数'); expect(id).toBe(8);
  });
});
