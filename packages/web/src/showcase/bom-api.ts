import { bomDetailSchema, bomListSchema, bomPreviewSchema, type BomSave } from '@forge-crm/contracts';
import { call, write } from './gateway';

const root = (system: string) => `/api/systems/${encodeURIComponent(system)}/boms`;
const record = (system: string, id: string) => `${root(system)}/${encodeURIComponent(id)}`;

export const bomApi = {
  async list(system: string, query: URLSearchParams) { return bomListSchema.parse(await (await call(`${root(system)}?${query}`)).json()); },
  async detail(system: string, id: string) { return bomDetailSchema.parse(await (await call(record(system, id))).json()); },
  async create(system: string, itemId: string, baseQuantity = '1') { return bomDetailSchema.parse(await (await write(root(system), { itemId, baseQuantity })).json()); },
  async draft(system: string, id: string) { return bomDetailSchema.parse(await (await write(`${record(system, id)}/draft`, {})).json()); },
  async preview(system: string, id: string, input: BomSave) { return bomPreviewSchema.parse(await (await write(`${record(system, id)}/preview`, input)).json()); },
  async save(system: string, id: string, input: BomSave) { return bomDetailSchema.parse(await (await write(record(system, id), input, 'PATCH')).json()); },
  async publish(system: string, id: string, rowVersion: number) { return bomDetailSchema.parse(await (await write(`${record(system, id)}/publish`, { rowVersion })).json()); },
};
