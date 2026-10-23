import { AgentProvider } from './agent-provider';
describe('Agent model protocol', () => {
  const original = { ...process.env }; const originalFetch = global.fetch;
  beforeEach(() => { process.env.AI_PROVIDER = 'anthropic'; process.env.AI_BASE_URL = 'https://gateway.example'; process.env.AI_AUTH_TOKEN = 'test-secret'; process.env.AI_MODEL = 'test-model'; });
  afterEach(() => { process.env = { ...original }; global.fetch = originalFetch; });
  it('sends tools and dialogue history, and accepts tool_use responses', async () => {
    const fetcher = jest.fn(async () => new Response(JSON.stringify({ content: [{ type: 'tool_use', id: 'call1', name: 'read', input: {} }], stop_reason: 'tool_use', usage: { input_tokens: 1 } }), { status: 200 })); global.fetch = fetcher as typeof fetch;
    const tool = { name: 'read', description: 'read only', input_schema: { type: 'object' as const, properties: {}, additionalProperties: false as const } };
    const response = await new AgentProvider().turn('system', [{ role: 'user', content: 'task' }], [tool]);
    expect(response.content[0]).toMatchObject({ name: 'read' }); const sent = fetcher.mock.calls[0] as unknown as [URL, RequestInit]; const body = JSON.parse(sent[1].body as string); expect(body.tools).toEqual([tool]); expect(body.messages).toHaveLength(1);
  });
  it('rejects truncated and incompatible responses and does not leak upstream bodies', async () => {
    global.fetch = jest.fn(async () => new Response('private-secret', { status: 401 })) as typeof fetch;
    await expect(new AgentProvider().turn('', [], [])).rejects.toThrow('鉴权');
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: '{}' }], stop_reason: 'max_tokens' }), { status: 200 })) as typeof fetch;
    await expect(new AgentProvider().turn('', [], [])).rejects.toThrow('未完整');
  });
  it('ignores gateway thinking blocks while keeping tool calls and text', async () => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ content: [{ type: 'thinking', thinking: 'internal', signature: 'opaque' }, { type: 'tool_use', id: 'call1', name: 'read', input: {} }], stop_reason: 'tool_use' }), { status: 200 })) as typeof fetch;
    const result = await new AgentProvider().turn('system', [{ role: 'user', content: 'synthetic' }], []);
    expect(result.content).toEqual([{ type: 'tool_use', id: 'call1', name: 'read', input: {} }]);
  });
  it('identifies an unavailable gateway model without exposing its error body', async () => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ error: { code: 'model_not_supported', message: 'private upstream detail' } }), { status: 404 })) as typeof fetch;
    await expect(new AgentProvider().turn('system', [{ role: 'user', content: 'synthetic' }], [])).rejects.toThrow('当前模型在网关没有可用服务');
  });
  it('uses the Agent-only model override', async () => {
    process.env.AGENT_AI_MODEL = 'deepseek-flash';
    const fetcher = jest.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn' }), { status: 200 }));
    global.fetch = fetcher as typeof fetch;
    await new AgentProvider().turn('system', [{ role: 'user', content: 'synthetic' }], []);
    const sent = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(JSON.parse(sent[1].body as string).model).toBe('deepseek-flash');
  });
});
