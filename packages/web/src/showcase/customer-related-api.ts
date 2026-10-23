import { customerOverviewSchema, customerRelatedPageSchema, type CustomerRelatedKind } from '@forge-crm/contracts';
import { call } from './gateway';
const root = (code: string, id: string) => `/api/systems/${encodeURIComponent(code)}/customers/${encodeURIComponent(id)}`;
export const customerRelatedApi = {
  async overview(code: string, id: string) { return customerOverviewSchema.parse(await (await call(`${root(code, id)}/overview`)).json()); },
  async list(code: string, id: string, kind: CustomerRelatedKind, page: number, pageSize: number) {
    return customerRelatedPageSchema.parse(await (await call(`${root(code, id)}/related/${kind}?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`)).json());
  },
};
