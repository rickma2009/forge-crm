import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { type AiSnapshot } from '@forge-crm/contracts';
import { ANALYSIS_INSTRUCTIONS, mockAnalysis, parseAnalysisResult } from './analysis-domain';
export function aiConfig() {
  const provider = process.env.AI_PROVIDER || 'anthropic';
  const baseUrl = (process.env.AI_BASE_URL || process.env.ANTHROPIC_BASE_URL || '').replace(/\/$/, '');
  const token = process.env.AI_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN || '';
  const model = process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || 'CVTE-AUTO';
  const number = (key: string, fallback: number, max: number) => Math.min(max, Math.max(1, Number(process.env[key]) || fallback));
  return { provider, baseUrl, token, model, configured: provider === 'mock' || (provider === 'anthropic' && !!baseUrl && !!token), timeoutMs: number('AI_TIMEOUT_MS', 120000, 180000), maxInputChars: number('AI_MAX_INPUT_CHARS', 100000, 200000), dailyLimit: number('AI_DAILY_LIMIT', 30, 1000) };
}
@Injectable()
export class AiProvider {
  status() { const c = aiConfig(); return { provider: c.provider, model: c.model, configured: c.configured, timeoutMs: c.timeoutMs, maxInputChars: c.maxInputChars, dailyLimit: c.dailyLimit }; }
  async analyze(snapshot: AiSnapshot) {
    const config = aiConfig();
    if (!config.configured) throw new Error('尚未配置AI服务，请联系管理员');
    if (config.provider === 'mock') return { result: mockAnalysis(snapshot.sources), requestId: null, usage: {}, model: 'mock' };
    const response = await this.request(ANALYSIS_INSTRUCTIONS, JSON.stringify(snapshot), 8192);
    const text = response.content.filter((b: { type: string }) => b.type === 'text').map((b: { text?: string }) => b.text || '').join('');
    try { return { result: parseAnalysisResult(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()), snapshot.sources), requestId: response.id || null, usage: response.usage || {}, model: response.model || config.model }; }
    catch { throw new Error('AI输出格式或引用校验失败，请重新生成'); }
  }
  async testConnection() {
    const config = aiConfig();
    if (!config.configured) throw new Error('尚未配置AI服务');
    if (config.provider === 'mock') return { ok: true, message: '模拟服务可用（不是真实模型）' };
    await this.request('只回答OK。', '连接测试，不包含业务资料。', 32);
    return { ok: true, message: '模型连接成功' };
  }
  async generateText(system: string, content: string, maxTokens = 2048) {
    const config = aiConfig();
    if (!config.configured) throw new Error('尚未配置AI服务，请联系管理员');
    if (config.provider === 'mock') return JSON.stringify({ summary: '模拟AI分析结果，仅用于测试。' });
    const response = await this.request(system, content, Math.min(8192, Math.max(32, maxTokens)));
    return response.content.filter((block: { type: string }) => block.type === 'text').map((block: { text?: string }) => block.text || '').join('');
  }
  private async request(system: string, content: string, maxTokens: number) {
    const config = aiConfig();
    const url = new URL(config.baseUrl.endsWith('/v1') ? config.baseUrl + '/messages' : config.baseUrl + '/v1/messages');
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('AI服务地址必须为不含凭证的HTTPS地址');
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(config.timeoutMs), headers: { Authorization: `Bearer ${config.token}`, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: config.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }) });
      } catch { throw new Error('AI连接失败或超时，请稍后重新生成'); }
      if (response.ok) {
        const body = await (async () => { try { return z.object({ id: z.string().max(255).optional(), model: z.string().max(128).optional(), content: z.array(z.object({ type: z.string(), text: z.string().optional() })), stop_reason: z.string().nullable().optional(), usage: z.object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() }).optional() }).parse(await response.json()); } catch { throw new Error('AI响应格式无效，请联系管理员检查服务协议'); } })();
        if (!Array.isArray(body.content) || !body.content.some((b: { type?: string; text?: string }) => b.type === 'text' && b.text) || body.stop_reason === 'max_tokens') throw new Error('AI返回内容不完整，请重新生成');
        return body;
      }
      // Never echo upstream bodies: they can contain credentials or business context.
      await response.body?.cancel();
      if (attempt === 0 && [429, 502, 503, 529].includes(response.status)) { await new Promise(r => setTimeout(r, 1500)); continue; }
      throw new Error([401, 403].includes(response.status) ? 'AI服务鉴权失败，请联系管理员检查凭证' : `AI服务暂不可用（HTTP ${response.status}）`);
    }
    throw new Error('AI服务暂不可用');
  }
}
