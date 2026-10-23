import type { AgentGateway } from '../common/agent/AgentAssistantDrawer';
import { call, write } from './gateway';
const root = (system: string, id: string) => `/api/systems/${encodeURIComponent(system)}/opportunities/${encodeURIComponent(id)}/agent-tasks`;
export const agentApi: AgentGateway = {
  async preview(s, id) { return (await call(root(s, id) + '/preview')).json(); },
  async list(s, id, page = 1) { return (await call(root(s, id) + '?page=' + page)).json(); },
  async detail(s, id, taskId) { return (await call(root(s, id) + '/' + encodeURIComponent(taskId))).json(); },
  async start(s, id, input) { return (await write(root(s, id), input)).json(); },
  async cancel(s, id, taskId) { return (await write(root(s, id) + '/' + encodeURIComponent(taskId) + '/cancel', {})).json(); },
  async save(s, id, taskId, input) { return (await write(root(s, id) + '/' + encodeURIComponent(taskId) + '/save-plan', input)).json(); },
};
