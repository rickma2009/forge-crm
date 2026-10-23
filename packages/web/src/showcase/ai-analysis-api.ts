import type { AiTask, AiStart, AiResult, AiSnapshot, AiStatus } from '@forge-crm/contracts';
import { call, write } from './gateway';
const root = (code: string, id: string) => `/api/systems/${encodeURIComponent(code)}/opportunities/${encodeURIComponent(id)}/ai-analyses`;
export const aiAnalysisApi = {
  async preview(code: string, id: string): Promise<{ snapshot: AiSnapshot; configuration: AiStatus; inputChars: number }> { return (await call(`${root(code, id)}/preview`)).json(); },
  async list(code: string, id: string, page = 1): Promise<{ items: AiTask[]; total: number; page: number }> { return (await call(`${root(code, id)}?page=${page}`)).json(); },
  async detail(code: string, id: string, taskId: string): Promise<AiTask> { return (await call(`${root(code, id)}/${encodeURIComponent(taskId)}`)).json(); },
  async start(code: string, id: string, input: AiStart): Promise<AiTask> { return (await write(root(code, id), input)).json(); },
  async confirm(code: string, id: string, taskId: string, result: AiResult, acceptStale: boolean): Promise<AiTask> { return (await write(`${root(code, id)}/${encodeURIComponent(taskId)}/confirm`, { result, acceptStale })).json(); },
  async test(code: string, id: string): Promise<{ ok: boolean; message: string }> { return (await write(`${root(code, id)}/test-connection`, {})).json(); },
};
