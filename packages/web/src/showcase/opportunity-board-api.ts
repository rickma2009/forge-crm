import { opportunityBoardSchema, opportunityDetailSchema, type OpportunityStageCommand } from '@forge-crm/contracts';
import { call, write } from './gateway';
export const opportunityBoardApi = {
  async load(system: string, params: URLSearchParams) { return opportunityBoardSchema.parse(await (await call(`/api/systems/${encodeURIComponent(system)}/opportunities/board?${params}`)).json()); },
  async move(system: string, id: string, input: OpportunityStageCommand) { return opportunityDetailSchema.parse(await (await write(`/api/systems/${encodeURIComponent(system)}/opportunities/${encodeURIComponent(id)}/stage`, input)).json()); },
};
