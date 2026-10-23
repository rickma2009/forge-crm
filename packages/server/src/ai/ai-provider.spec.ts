import { AiProvider } from './ai-provider';
import { mockAnalysis } from './analysis-domain';
import type { AiSnapshot } from '@forge-crm/contracts';

describe('Anthropic gateway adapter', () => {
  const snapshot = { sources: [], capturedAt: '', hash: '', opportunity: {}, focus: '', issues: [] } as unknown as AiSnapshot;
  const original = { ...process.env };
  beforeEach(() => { process.env.AI_PROVIDER = 'anthropic'; process.env.AI_BASE_URL = 'https://gateway.example'; process.env.AI_AUTH_TOKEN = 'private-test-token'; });
  afterEach(() => { jest.restoreAllMocks(); process.env = { ...original }; });
  it('uses bearer auth and the configured model without exposing the token in status', async () => {
    process.env.AI_MODEL = 'CVTE-AUTO';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(mockAnalysis([])) }], model: 'routed-model', stop_reason: 'end_turn' })));
    const provider = new AiProvider();
    const response = await provider.analyze(snapshot);
    expect(response.model).toBe('routed-model');
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://gateway.example/v1/messages');
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer private-test-token' });
    expect(JSON.parse(String(options?.body)).model).toBe('CVTE-AUTO');
    expect(JSON.stringify(provider.status())).not.toContain('private-test-token');
  });
  it('does not leak upstream error bodies or retry invalid credentials', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('secret private-test-token', { status: 401 }));
    await expect(new AiProvider().analyze(snapshot)).rejects.toThrow('鉴权失败');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejects truncated model output', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: '{}' }], stop_reason: 'max_tokens' })));
    await expect(new AiProvider().analyze(snapshot)).rejects.toThrow('不完整');
  });
});
