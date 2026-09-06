import { apiErrorSchema, customerListSchema, customerSchema, dictionaryImportResultSchema, dictionaryListSchema, navigationResponseSchema, resolvedListViewsSchema, salesOptionSchema, sessionUserSchema, type Customer, type CustomerList, type CustomerUpdate, type CustomerWrite, type Dictionary, type DictionaryImportRow, type DictionaryValueUpdate, type DictionaryValueWrite, type ListViewConfig, type LoginRequest, type NavigationResponse, type ResolvedListViews, type SalesOption, type SessionUser } from '@interaction-pattern-lab/contracts';

export class GatewayError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

export interface NavigationGateway {
  session(): Promise<SessionUser>;
  login(input: LoginRequest): Promise<SessionUser>;
  logout(): Promise<void>;
  navigation(systemCode: string): Promise<NavigationResponse>;
  assertPage(systemCode: string, routePath: string): Promise<void>;
  performResourceAction(systemCode: string, actionCode: 'manage' | 'export'): Promise<unknown>;
}

export interface EnterpriseGateway extends NavigationGateway {
  dictionaries(systemCode: string, includeDisabled?: boolean): Promise<Dictionary[]>;
  createDictionary(systemCode: string, input: unknown): Promise<unknown>;
  updateDictionary(systemCode: string, id: string, input: unknown): Promise<unknown>;
  createDictionaryItem(systemCode: string, input: DictionaryValueWrite & { dictionaryId: string }): Promise<unknown>;
  updateDictionaryItem(systemCode: string, id: string, input: DictionaryValueUpdate): Promise<unknown>;
  importDictionaryItems(systemCode: string, dictionaryId: string, rows: DictionaryImportRow[]): Promise<{ imported: number }>;
  listViews(systemCode: string): Promise<ResolvedListViews>;
  selectListView(systemCode: string, viewKey: string): Promise<void>;
  createPersonalListView(systemCode: string, input: { baseViewId: string; viewName: string; isDefault: boolean; config: ListViewConfig }): Promise<void>;
  customers(systemCode: string, query: URLSearchParams): Promise<CustomerList>;
  customer(systemCode: string, id: string): Promise<Customer>;
  createCustomer(systemCode: string, input: CustomerWrite): Promise<Customer>;
  updateCustomer(systemCode: string, id: string, input: CustomerUpdate): Promise<Customer>;
  salesOptions(systemCode: string, query?: string): Promise<SalesOption[]>;
}

const csrfToken = () => document.cookie.split('; ').find((item) => item.startsWith('ipl_csrf='))?.split('=').slice(1).join('=');

async function call(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { credentials: 'include', ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
    throw new GatewayError(response.status, parsed.success ? parsed.data.code : 'SERVICE_UNAVAILABLE', parsed.success ? parsed.data.message : '服务暂时不可用');
  }
  return response;
}

async function write(path: string, body?: unknown, method = 'POST'): Promise<Response> {
  const csrf = csrfToken();
  if (!csrf) throw new GatewayError(403, 'FORBIDDEN', '缺少请求校验信息，请刷新后重试');
  return call(path, { method, headers: { 'x-csrf-token': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

export const httpNavigationGateway: EnterpriseGateway = {
  async session() { return sessionUserSchema.parse(await (await call('/api/auth/session')).json()); },
  async login(input) { return sessionUserSchema.parse(await (await write('/api/auth/login', input)).json()); },
  async logout() { await write('/api/auth/logout'); },
  async navigation(systemCode) { return navigationResponseSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/navigation`)).json()); },
  async assertPage(systemCode, routePath) { await call(`/api/systems/${encodeURIComponent(systemCode)}/page-access?routePath=${encodeURIComponent(routePath)}`); },
  async performResourceAction(systemCode, actionCode) { return (await write(`/api/systems/${encodeURIComponent(systemCode)}/demo-resources/${actionCode === 'manage' ? 'maintain' : 'export'}`)).json(); },
  async dictionaries(systemCode, includeDisabled = false) { return dictionaryListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/dictionaries${includeDisabled ? '?includeDisabled=true' : ''}`)).json()); },
  async createDictionary(systemCode, input) { return (await write(`/api/systems/${encodeURIComponent(systemCode)}/dictionaries`, input)).json(); },
  async updateDictionary(systemCode, id, input) { return (await write(`/api/systems/${encodeURIComponent(systemCode)}/dictionaries/${id}`, input, 'PATCH')).json(); },
  async createDictionaryItem(systemCode, input) { return (await write(`/api/systems/${encodeURIComponent(systemCode)}/dictionaries/items`, input)).json(); },
  async updateDictionaryItem(systemCode, id, input) { return (await write(`/api/systems/${encodeURIComponent(systemCode)}/dictionaries/items/${id}`, input, 'PATCH')).json(); },
  async importDictionaryItems(systemCode, dictionaryId, rows) { return dictionaryImportResultSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/dictionaries/${encodeURIComponent(dictionaryId)}/items/import`, { rows })).json()); },
  async listViews(systemCode) { return resolvedListViewsSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/list-views/customer-directory/view`)).json()); },
  async selectListView(systemCode, viewKey) { await write(`/api/systems/${encodeURIComponent(systemCode)}/list-views/customer-directory/view/selection`, { viewKey }); },
  async createPersonalListView(systemCode, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/list-views/customer-directory/view/personal`, input); },
  async customers(systemCode, query) { return customerListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/customers?${query.toString()}`)).json()); },
  async customer(systemCode, id) { return customerSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/customers/${id}`)).json()); },
  async createCustomer(systemCode, input) { return customerSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/customers`, input)).json()); },
  async updateCustomer(systemCode, id, input) { return customerSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/customers/${id}`, input, 'PATCH')).json()); },
  async salesOptions(systemCode, query = '') { return salesOptionSchema.array().parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/customers/sales-options?q=${encodeURIComponent(query)}`)).json()); },
};
