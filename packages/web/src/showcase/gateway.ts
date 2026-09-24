import { parameterListSchema, parameterSaveSchema, type ParameterList, type ParameterUpdate } from '@interaction-pattern-lab/contracts';
import { accessPermissionListSchema, roleListSchema, type RoleTreeNode, type RoleWrite, type RoleUpdate, accessUserListSchema, apiErrorSchema, customerAddressSchema, customerAddressWriteSchema, customerContactSchema, customerContactWriteSchema, customerDetailSchema, customerListSchema, customerSchema, dictionaryImportResultSchema, dictionaryListSchema, navigationResponseSchema, resolvedListViewsSchema, salesOptionSchema, sessionUserSchema, styleSceneListSchema, styleSceneSchema, type Customer, type CustomerAddress, type CustomerAddressUpdate, type CustomerAddressWrite, type CustomerContact, type CustomerContactUpdate, type CustomerContactWrite, type CustomerDetail, type CustomerList, type CustomerUpdate, type CustomerWrite, type Dictionary, type DictionaryImportRow, type DictionaryValueUpdate, type DictionaryValueWrite, type ListViewConfig, type LoginRequest, type NavigationResponse, type ResolvedListViews, type SalesOption, type SessionUser, type StyleScene, type StyleSceneList, type StyleSceneUpdate, type StyleSceneWrite } from '@interaction-pattern-lab/contracts';
import { organizationUnitListSchema, organizationUnitSchema, type OrganizationUnit, type OrganizationUnitList, type OrganizationUnitUpdate, type OrganizationUnitWrite } from '@interaction-pattern-lab/contracts';
import { employeeDetailSchema, employeeListSchema, employeeOptionsSchema, type EmployeeDetail, type EmployeeList, type EmployeeOptions, type EmployeeUpdate, type EmployeeWrite } from '@interaction-pattern-lab/contracts';
import { resourceButtonSchema, resourcePageListSchema, resourcePageSchema, resourceTabSchema, type NavigationMountWrite, type ResourceButton, type ResourceButtonWrite, type ResourcePage, type ResourcePageUpdate, type ResourcePageWrite, type ResourceTab, type ResourceTabWrite, type ResourceTreeMove } from '@interaction-pattern-lab/contracts';

import { rolePermissionCatalogSchema } from '@interaction-pattern-lab/contracts';
import { attachmentListSchema, attachmentMetaSchema, type AttachmentMeta } from '@interaction-pattern-lab/contracts';
import {
  competitorListSchema, competitorSchema, opportunityDetailSchema, opportunityListSchema,
  opportunityTemplateListSchema, productListSchema, productSchema,
  type Competitor, type CompetitorList, type CompetitorUpdate, type CompetitorWrite,
  type Opportunity, type OpportunityAnalysisWrite, type OpportunityDetail,
  type OpportunityFollowUpUpdate, type OpportunityFollowUpWrite, type OpportunityList,
  type OpportunityStageUpdate, type OpportunityStageWrite, type OpportunityTemplate, type OpportunityUpdate, type OpportunityWrite,
  type Product, type ProductList, type ProductUpdate, type ProductWrite,
} from '@interaction-pattern-lab/contracts';
import {
  inboundOrderListSchema, inboundOrderSchema, inventoryBalanceListSchema, itemListSchema, itemSchema,
  legalEntityListSchema, legalEntitySchema, warehouseListSchema, warehouseSchema,
  type InboundOrder, type InboundOrderList, type InboundOrderWrite, type InventoryBalanceList, type InventoryCommand,
  type Item, type ItemList, type ItemUpdate, type ItemWrite, type LegalEntity, type LegalEntityList, type LegalEntityUpdate,
  type LegalEntityWrite, type Warehouse, type WarehouseList, type WarehouseUpdate, type WarehouseWrite,
} from '@interaction-pattern-lab/contracts';

export class GatewayError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: Record<string, unknown>) { super(message); }
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
  parameters(systemCode: string, query: URLSearchParams): Promise<ParameterList>;
  updateParameter(systemCode: string, id: string, input: ParameterUpdate): Promise<{ notice: string | null }>;

  items(systemCode: string, query: URLSearchParams): Promise<ItemList>;
  itemDetail(systemCode: string, id: string): Promise<Item>;
  createItem(systemCode: string, input: ItemWrite): Promise<Item>;
  updateItem(systemCode: string, id: string, input: ItemUpdate): Promise<Item>;
  legalEntities(systemCode: string, query: URLSearchParams): Promise<LegalEntityList>;
  createLegalEntity(systemCode: string, input: LegalEntityWrite): Promise<LegalEntity>;
  updateLegalEntity(systemCode: string, id: string, input: LegalEntityUpdate): Promise<LegalEntity>;
  warehouses(systemCode: string, query: URLSearchParams): Promise<WarehouseList>;
  createWarehouse(systemCode: string, input: WarehouseWrite): Promise<Warehouse>;
  updateWarehouse(systemCode: string, id: string, input: WarehouseUpdate): Promise<Warehouse>;
  inboundOrders(systemCode: string, query: URLSearchParams): Promise<InboundOrderList>;
  inboundOrder(systemCode: string, id: string): Promise<InboundOrder>;
  createInboundOrder(systemCode: string, input: InboundOrderWrite): Promise<InboundOrder>;
  updateInboundOrder(systemCode: string, id: string, input: InboundOrderWrite): Promise<InboundOrder>;
  commandInboundOrder(systemCode: string, id: string, action: 'post' | 'reverse' | 'void', input: InventoryCommand): Promise<InboundOrder>;
  inventoryBalances(systemCode: string, query: URLSearchParams): Promise<InventoryBalanceList>;
  rolePermissionCatalog(systemCode: string): Promise<import('@interaction-pattern-lab/contracts').RolePermissionCatalog>;
  roleSubjectCatalog(systemCode: string): Promise<RoleSubjectCatalog>;
  roleSubjectBindings(systemCode: string, roleId: string): Promise<RoleSubjectBinding[]>;
  bindRoleSubjects(systemCode: string, roleId: string, input: { kind: SubjectKind; subjectIds: string[]; includeDescendants: boolean; effectiveAt: string; expiresAt: string | null }): Promise<void>;
  endRoleSubjects(systemCode: string, roleId: string, members: Array<{ id: string; version: number }>): Promise<void>;
  saveUserGroup(systemCode: string, input: { id?: string; version?: number; groupCode: string; groupName: string; description?: string | null; status?: 'ACTIVE' | 'DISABLED' }): Promise<void>;
  roleSubjectMembers(systemCode: string, kind: SubjectKind, sourceId: string): Promise<SubjectMember[]>;
  addSubjectMembers(systemCode: string, kind: SubjectKind, sourceId: string, input: { userIds: string[]; effectiveAt: string; expiresAt: string | null }): Promise<void>;
  endSubjectMembers(systemCode: string, kind: SubjectKind, sourceId: string, members: Array<{ id: string; version: number }>): Promise<void>;
  policyCatalog(systemCode: string): Promise<PolicyCatalog>;
  registerPolicyResource(systemCode: string, input: { bindingKey: 'customer'; resourceName: string }): Promise<void>;
  enrollPolicyResource(systemCode: string, resourceId: string, version: number): Promise<void>;
  rolePolicy(systemCode: string, roleId: string, resourceId: string, action: string): Promise<RolePolicyRecord>;
  publishRolePolicy(systemCode: string, roleId: string, resourceId: string, action: string, input: PolicyPublish): Promise<{ version: number; roleVersion: number }>;
  rollbackRolePolicy(systemCode: string, roleId: string, resourceId: string, action: string, revision: number, input: PolicyPublish): Promise<{ version: number; roleVersion: number }>;
  roleViews(systemCode: string, roleId: string): Promise<RoleViews>;
  saveRoleViews(systemCode: string, roleId: string, input: { version: number; viewIds: string[] }): Promise<void>;
  accessUsers(systemCode: string, query: URLSearchParams): Promise<import('@interaction-pattern-lab/contracts').AccessUserList>;
  accessRoles(systemCode: string, query: URLSearchParams): Promise<AccessRoleList>;
  accessPermissions(systemCode: string, query: URLSearchParams): Promise<import('@interaction-pattern-lab/contracts').AccessPermissionList>;
  setAccessUserStatus(systemCode: string, userId: string, input: { status: 'ACTIVE' | 'DISABLED'; version: number }): Promise<void>;
  createAccessRole(systemCode: string, input: { roleCode: string; roleName: string; description?: string }): Promise<void>;
  accessRoleMembers(systemCode: string, roleId: string): Promise<AccessRoleMember[]>;
  addAccessRoleMember(systemCode: string, roleId: string, input: { userId: string; effectiveAt: string; expiresAt?: string | null }): Promise<void>;
  endAccessRoleMember(systemCode: string, roleId: string, membershipId: string, input: { version: number }): Promise<void>;
  batchRoleMembers(systemCode: string, roleId: string, input: { action: 'add'; userIds: string[]; effectiveAt: string; expiresAt: string | null } | { action: 'end'; members: Array<{ id: string; version: number }> }): Promise<void>;
  accessRolePermissions(systemCode: string, roleId: string): Promise<AccessRolePermissions>;
  replaceAccessRolePermissions(systemCode: string, roleId: string, input: { roleVersion: number; permissionIds: string[] }): Promise<void>;
  dictionaries(systemCode: string, includeDisabled?: boolean): Promise<Dictionary[]>;
  createDictionary(systemCode: string, input: unknown): Promise<unknown>;
  updateDictionary(systemCode: string, id: string, input: unknown): Promise<unknown>;
  createDictionaryItem(systemCode: string, input: DictionaryValueWrite & { dictionaryId: string }): Promise<unknown>;
  updateDictionaryItem(systemCode: string, id: string, input: DictionaryValueUpdate): Promise<unknown>;
  importDictionaryItems(systemCode: string, dictionaryId: string, rows: DictionaryImportRow[]): Promise<{ imported: number }>;
  listViews(systemCode: string, pageCode?: string): Promise<ResolvedListViews>;
  selectListView(systemCode: string, viewKey: string, pageCode?: string): Promise<void>;
  createPersonalListView(systemCode: string, input: { baseViewId: string; viewName: string; isDefault: boolean; config: ListViewConfig }, pageCode?: string): Promise<void>;
  customers(systemCode: string, query: URLSearchParams): Promise<CustomerList>;
  customerDetail(systemCode: string, id: string): Promise<CustomerDetail>;
  createCustomer(systemCode: string, input: CustomerWrite): Promise<Customer>;
  updateCustomer(systemCode: string, id: string, input: CustomerUpdate): Promise<Customer>;
  salesOptions(systemCode: string, query?: string): Promise<SalesOption[]>;
  createContact(systemCode: string, customerId: string, input: CustomerContactWrite): Promise<CustomerContact>;
  updateContact(systemCode: string, customerId: string, contactId: string, input: CustomerContactUpdate): Promise<CustomerContact>;
  createAddress(systemCode: string, customerId: string, input: CustomerAddressWrite): Promise<CustomerAddress>;
  updateAddress(systemCode: string, customerId: string, addressId: string, input: CustomerAddressUpdate): Promise<CustomerAddress>;
  roleTree(systemCode: string): Promise<RoleTreeNode[]>;
  createRole(systemCode: string, input: RoleWrite): Promise<{ id: string }>;
  updateRole(systemCode: string, id: string, input: RoleUpdate): Promise<{ ok: boolean }>;
  deleteRole(systemCode: string, id: string, version: number): Promise<{ ok: boolean }>;
  moveRole(systemCode: string, id: string, input: { version: number; targetId: string; position: 'before' | 'after' | 'child' }): Promise<{ ok: boolean }>;
  styleScenes(systemCode: string, query: URLSearchParams): Promise<StyleSceneList>;
  createStyleScene(systemCode: string, input: StyleSceneWrite): Promise<StyleScene>;
  updateStyleScene(systemCode: string, id: string, input: StyleSceneUpdate): Promise<StyleScene>;
  organizationUnits(systemCode: string, query: URLSearchParams): Promise<OrganizationUnitList>;
  createOrganizationUnit(systemCode: string, input: OrganizationUnitWrite): Promise<OrganizationUnit>;
  updateOrganizationUnit(systemCode: string, id: string, input: OrganizationUnitUpdate): Promise<OrganizationUnit>;
  employees(systemCode: string, query: URLSearchParams): Promise<EmployeeList>;
  employeeDetail(systemCode: string, id: string): Promise<EmployeeDetail>;
  employeeOptions(systemCode: string): Promise<EmployeeOptions>;
  createEmployee(systemCode: string, input: EmployeeWrite): Promise<EmployeeDetail>;
  updateEmployee(systemCode: string, id: string, input: EmployeeUpdate): Promise<EmployeeDetail>;
  resourceMenuPages(systemCode: string): Promise<ResourcePage[]>;
  createResourceMenuPage(systemCode: string, input: ResourcePageWrite): Promise<ResourcePage>;
  updateResourceMenuPage(systemCode: string, id: string, input: ResourcePageUpdate): Promise<ResourcePage>;
  deleteResourceMenuPage(systemCode: string, id: string, version: number): Promise<void>;
  moveResourceMenuPage(systemCode: string, input: ResourceTreeMove): Promise<void>;
  resourceMenuButtons(systemCode: string, pageId: string): Promise<{ tool: ResourceButton[]; line: ResourceButton[] }>;
  saveResourceMenuButton(systemCode: string, pageId: string, input: ResourceButtonWrite & { id?: string; version?: number }): Promise<ResourceButton>;
  deleteResourceMenuButton(systemCode: string, pageId: string, id: string, version: number): Promise<void>;
  resourceMenuTabs(systemCode: string, pageId: string): Promise<ResourceTab[]>;
  saveResourceMenuTab(systemCode: string, pageId: string, input: ResourceTabWrite & { id?: string; version?: number }): Promise<ResourceTab>;
  deleteResourceMenuTab(systemCode: string, pageId: string, id: string, version: number): Promise<void>;
  resourceMenuMounts(systemCode: string): Promise<NavigationMount[]>;
  saveResourceMenuMounts(systemCode: string, input: NavigationMountWrite[]): Promise<NavigationMount[]>;
  exportResourceMenu(systemCode: string, rootId?: string): Promise<Blob>;
  products(systemCode: string, query: URLSearchParams): Promise<ProductList>;
  createProduct(systemCode: string, input: ProductWrite): Promise<Product>;
  updateProduct(systemCode: string, id: string, input: ProductUpdate): Promise<Product>;
  productDetail(systemCode: string, id: string): Promise<Product>;
  deleteProduct(systemCode: string, id: string, version: number): Promise<void>;
  attachments(systemCode: string, ownerType: 'PRODUCT', ownerId: string): Promise<AttachmentMeta[]>;
  uploadAttachment(systemCode: string, input: { ownerType: 'PRODUCT'; ownerId: string; file: File; description: string; fileVersion: string }): Promise<AttachmentMeta>;
  updateAttachment(systemCode: string, id: string, input: { version: number; description: string | null; fileVersion: string | null }): Promise<AttachmentMeta>;
  deleteAttachment(systemCode: string, id: string, version: number): Promise<void>;
  competitors(systemCode: string, query: URLSearchParams): Promise<CompetitorList>;
  createCompetitor(systemCode: string, input: CompetitorWrite): Promise<Competitor>;
  updateCompetitor(systemCode: string, id: string, input: CompetitorUpdate): Promise<Competitor>;
  opportunityTemplates(systemCode: string): Promise<OpportunityTemplate[]>;
  updateOpportunityStage(systemCode: string, stageId: string, input: OpportunityStageUpdate): Promise<OpportunityTemplate[]>;
  createOpportunityStage(systemCode: string, templateId: string, input: OpportunityStageWrite): Promise<OpportunityTemplate[]>;
  deleteOpportunityStage(systemCode: string, stageId: string, version: number): Promise<OpportunityTemplate[]>;
  opportunityUsers(systemCode: string): Promise<Array<{ id: string; account: string; displayName: string }>>;
  opportunities(systemCode: string, query: URLSearchParams): Promise<OpportunityList>;
  opportunityDetail(systemCode: string, id: string): Promise<OpportunityDetail>;
  createOpportunity(systemCode: string, input: OpportunityWrite): Promise<Opportunity>;
  updateOpportunity(systemCode: string, id: string, input: OpportunityUpdate): Promise<Opportunity>;
  createOpportunityFollowUp(systemCode: string, id: string, input: OpportunityFollowUpWrite): Promise<OpportunityDetail>;
  updateOpportunityFollowUp(systemCode: string, id: string, followUpId: string, input: OpportunityFollowUpUpdate): Promise<OpportunityDetail>;
  createOpportunityAnalysis(systemCode: string, id: string, input: OpportunityAnalysisWrite): Promise<OpportunityDetail>;
}

export type NavigationMount = NavigationMountWrite & { id: string; menuCode: string; routePath: string | null; iconKey: string; version: number };
export type SubjectKind = 'organization' | 'group';
export interface RoleSubjectCatalog {
  organizations: Array<{ id: string; parentId: string | null; unitCode: string; unitName: string }>;
  groups: Array<{ id: string; groupCode: string; groupName: string; description: string | null; status: 'ACTIVE' | 'DISABLED'; version: number; memberCount: number }>;
  admissionRule: string;
}
export interface RoleSubjectBinding { id: string; orgUnitId: string | null; groupId: string | null; includeDescendants: boolean; effectiveAt: string; expiresAt: string | null; status: string; version: number; organization: { unitName: string; unitCode: string } | null; group: { groupName: string; groupCode: string } | null }
export interface SubjectMember extends AccessRoleMember { eligible: boolean }
export interface RoleViews { version: number; items: Array<{ id: string; viewName: string; pageCode: string; actionCode: string; status: string; config: ListViewConfig; assigned: boolean; grantable: boolean }> }
export interface PolicyResource { id: string; resourceName: string; bindingKey: string; enabled: boolean; version: number; fields: Array<{ id: string; fieldCode: string; fieldName: string; bindingKey: string; fieldType: string; source: string; status: string; groupName: string; version: number }> }
export interface PolicyCatalog { resources: PolicyResource[]; availableBindings: Array<{ key: string; name: string; actions: string[] }> }
export type PolicyPublish = import('@interaction-pattern-lab/contracts').DataPolicy & { version: number; roleVersion: number; viewIds: string[] };
export interface RolePolicyRecord extends PolicyPublish { readOnly: boolean; resource: PolicyResource; history: Array<{ version: number; summary: string; createdAt: string; publishedBy: string; snapshot: import('@interaction-pattern-lab/contracts').DataPolicy & { viewIds: string[] } }> }

export interface AccessRoleList { items: Array<{ id: string; roleCode: string; roleName: string; roleType: string; isSystem: boolean; description: string | null; status: 'ACTIVE' | 'DISABLED'; memberCount: number; permissionCount: number; version: number; updatedAt: string }>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export interface AccessRoleMember { id: string; userId: string; status: 'ACTIVE' | 'DISABLED'; effectiveAt: string; expiresAt: string | null; version: number; user: { account: string; displayName: string; status: string } }
export interface AccessRolePermissions { roleVersion: number; isSystem: boolean; permissionIds: string[]; permissions: Array<{ id: string; permissionCode: string; permissionName: string; resourceCode: string; actionCode: string; status: string }> }

const csrfToken = () => document.cookie.split('; ').find((item) => item.startsWith('ipl_csrf='))?.split('=').slice(1).join('=');

export async function call(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { credentials: 'include', ...init, headers: { ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...(init?.headers ?? {}) } });
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
    throw new GatewayError(response.status, parsed.success ? parsed.data.code : 'SERVICE_UNAVAILABLE', parsed.success ? parsed.data.message : '服务暂时不可用', parsed.success ? parsed.data.details : undefined);
  }
  return response;
}

export async function write(path: string, body?: unknown, method = 'POST'): Promise<Response> {
  const csrf = csrfToken();
  if (!csrf) throw new GatewayError(403, 'FORBIDDEN', '缺少请求校验信息，请刷新后重试');
  return call(path, { method, headers: { 'x-csrf-token': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

export const httpNavigationGateway: EnterpriseGateway = {
  async parameters(code, query) { return parameterListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(code)}/parameters?${query}`)).json()); },
  async updateParameter(code, id, input) { return parameterSaveSchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/parameters/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },

  async items(code, query) { return itemListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(code)}/items?${query}`)).json()); },
  async itemDetail(code, id) { return itemSchema.parse(await (await call(`/api/systems/${encodeURIComponent(code)}/items/${encodeURIComponent(id)}`)).json()); },
  async createItem(code, input) { return itemSchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/items`, input)).json()); },
  async updateItem(code, id, input) { return itemSchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/items/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async legalEntities(code, query) { return legalEntityListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(code)}/legal-entities?${query}`)).json()); },
  async createLegalEntity(code, input) { return legalEntitySchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/legal-entities`, input)).json()); },
  async updateLegalEntity(code, id, input) { return legalEntitySchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/legal-entities/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async warehouses(code, query) { return warehouseListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(code)}/warehouses?${query}`)).json()); },
  async createWarehouse(code, input) { return warehouseSchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/warehouses`, input)).json()); },
  async updateWarehouse(code, id, input) { return warehouseSchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/warehouses/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async inboundOrders(code, query) { return inboundOrderListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(code)}/inbound-orders?${query}`)).json()); },
  async inboundOrder(code, id) { return inboundOrderSchema.parse(await (await call(`/api/systems/${encodeURIComponent(code)}/inbound-orders/${encodeURIComponent(id)}`)).json()); },
  async createInboundOrder(code, input) { return inboundOrderSchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/inbound-orders`, input)).json()); },
  async updateInboundOrder(code, id, input) { return inboundOrderSchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/inbound-orders/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async commandInboundOrder(code, id, action, input) { return inboundOrderSchema.parse(await (await write(`/api/systems/${encodeURIComponent(code)}/inbound-orders/${encodeURIComponent(id)}/${action}`, input)).json()); },
  async inventoryBalances(code, query) { return inventoryBalanceListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(code)}/inventory-balances?${query}`)).json()); },
  async roleSubjectCatalog(code) { return (await call(`/api/systems/${encodeURIComponent(code)}/role-subjects/catalog`)).json(); },
  async roleSubjectBindings(code, id) { return (await call(`/api/systems/${encodeURIComponent(code)}/role-subjects/roles/${encodeURIComponent(id)}`)).json(); },
  async bindRoleSubjects(code, id, input) { await write(`/api/systems/${encodeURIComponent(code)}/role-subjects/roles/${encodeURIComponent(id)}`, input); },
  async endRoleSubjects(code, id, members) { await write(`/api/systems/${encodeURIComponent(code)}/role-subjects/roles/${encodeURIComponent(id)}/end`, { members }); },
  async saveUserGroup(code, input) { await write(`/api/systems/${encodeURIComponent(code)}/role-subjects/groups`, input); },
  async roleSubjectMembers(code, kind, id) { return (await call(`/api/systems/${encodeURIComponent(code)}/role-subjects/sources/${kind}/${encodeURIComponent(id)}/members`)).json(); },
  async addSubjectMembers(code, kind, id, input) { await write(`/api/systems/${encodeURIComponent(code)}/role-subjects/sources/${kind}/${encodeURIComponent(id)}/members`, input); },
  async endSubjectMembers(code, kind, id, members) { await write(`/api/systems/${encodeURIComponent(code)}/role-subjects/sources/${kind}/${encodeURIComponent(id)}/members/end`, { members }); },
  async policyCatalog(systemCode) { return (await call(`/api/systems/${encodeURIComponent(systemCode)}/role-policies/catalog`)).json(); },
  async registerPolicyResource(systemCode, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/role-policies/catalog`, input); },
  async enrollPolicyResource(systemCode, resourceId, version) { await write(`/api/systems/${encodeURIComponent(systemCode)}/role-policies/catalog/${encodeURIComponent(resourceId)}/enroll`, { version, enabled: true, confirmDefaultDeny: true }); },
  async rolePolicy(systemCode, roleId, resourceId, action) { return (await call(`/api/systems/${encodeURIComponent(systemCode)}/role-policies/${encodeURIComponent(roleId)}/${encodeURIComponent(resourceId)}/${encodeURIComponent(action)}`)).json(); },
  async publishRolePolicy(systemCode, roleId, resourceId, action, input) { return (await write(`/api/systems/${encodeURIComponent(systemCode)}/role-policies/${encodeURIComponent(roleId)}/${encodeURIComponent(resourceId)}/${encodeURIComponent(action)}`, input)).json(); },
  async rollbackRolePolicy(systemCode, roleId, resourceId, action, revision, input) { return (await write(`/api/systems/${encodeURIComponent(systemCode)}/role-policies/${encodeURIComponent(roleId)}/${encodeURIComponent(resourceId)}/${encodeURIComponent(action)}/rollback/${revision}`, input)).json(); },
  async roleViews(systemCode, roleId) { return (await call(`/api/systems/${encodeURIComponent(systemCode)}/roles/${encodeURIComponent(roleId)}/views`)).json(); },
  async saveRoleViews(systemCode, roleId, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/roles/${encodeURIComponent(roleId)}/views`, input); },
  async accessUsers(systemCode, query) { return accessUserListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/access/users?${query}`)).json()); },
  async accessRoles(systemCode, query) { return await (await call(`/api/systems/${encodeURIComponent(systemCode)}/access/roles?${query}`)).json() as AccessRoleList; },
  async rolePermissionCatalog(systemCode) { return rolePermissionCatalogSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/roles/permission-catalog`)).json()); },
  async accessPermissions(systemCode, query) { return accessPermissionListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/access/permissions?${query}`)).json()); },
  async setAccessUserStatus(systemCode, userId, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/access/users/${encodeURIComponent(userId)}/status`, input, 'PATCH'); },
  async createAccessRole(systemCode, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/access/roles`, input); },
  async accessRoleMembers(systemCode, roleId) { return await (await call(`/api/systems/${encodeURIComponent(systemCode)}/access/roles/${encodeURIComponent(roleId)}/members`)).json() as AccessRoleMember[]; },
  async addAccessRoleMember(systemCode, roleId, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/access/roles/${encodeURIComponent(roleId)}/members`, input); },
  async endAccessRoleMember(systemCode, roleId, membershipId, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/access/roles/${encodeURIComponent(roleId)}/members/${encodeURIComponent(membershipId)}/end`, input, 'PATCH'); },
  async batchRoleMembers(systemCode, roleId, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/access/roles/${encodeURIComponent(roleId)}/members/batch`, input); },
  async accessRolePermissions(systemCode, roleId) { return await (await call(`/api/systems/${encodeURIComponent(systemCode)}/access/roles/${encodeURIComponent(roleId)}/permissions`)).json() as AccessRolePermissions; },
  async replaceAccessRolePermissions(systemCode, roleId, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/access/roles/${encodeURIComponent(roleId)}/permissions`, input, 'PUT'); },
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
  async listViews(systemCode, pageCode = 'customer-directory') { return resolvedListViewsSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/list-views/${encodeURIComponent(pageCode)}/view`)).json()); },
  async selectListView(systemCode, viewKey, pageCode = 'customer-directory') { await write(`/api/systems/${encodeURIComponent(systemCode)}/list-views/${encodeURIComponent(pageCode)}/view/selection`, { viewKey }); },
  async createPersonalListView(systemCode, input, pageCode = 'customer-directory') { await write(`/api/systems/${encodeURIComponent(systemCode)}/list-views/${encodeURIComponent(pageCode)}/view/personal`, input); },
  async customers(systemCode, query) { return customerListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/customers?${query.toString()}`)).json()); },
  async customerDetail(systemCode, id) { return customerDetailSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/customers/${encodeURIComponent(id)}`)).json()); },
  async createCustomer(systemCode, input) { return customerSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/customers`, input)).json()); },
  async updateCustomer(systemCode, id, input) { return customerDetailSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/customers/${encodeURIComponent(id)}`, input, 'PATCH')).json()).customer; },
  async createContact(systemCode, customerId, input) { return customerContactSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/customers/${encodeURIComponent(customerId)}/contacts`, customerContactWriteSchema.parse(input))).json()); },
  async updateContact(systemCode, customerId, id, input) { return customerContactSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/customers/${encodeURIComponent(customerId)}/contacts/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async createAddress(systemCode, customerId, input) { return customerAddressSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/customers/${encodeURIComponent(customerId)}/addresses`, customerAddressWriteSchema.parse(input))).json()); },
  async updateAddress(systemCode, customerId, id, input) { return customerAddressSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/customers/${encodeURIComponent(customerId)}/addresses/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async salesOptions(systemCode, query = '') { return salesOptionSchema.array().parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/customers/sales-options?q=${encodeURIComponent(query)}`)).json()); },
  async roleTree(systemCode) { return roleListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/roles`)).json()); },
  async createRole(systemCode, input) { return await (await write(`/api/systems/${encodeURIComponent(systemCode)}/roles`, input)).json(); },
  async updateRole(systemCode, id, input) { return await (await write(`/api/systems/${encodeURIComponent(systemCode)}/roles/${id}`, input, 'PATCH')).json(); },
  async deleteRole(systemCode, id, version) { return await (await write(`/api/systems/${encodeURIComponent(systemCode)}/roles/${id}`, { version }, 'DELETE')).json(); },
  async moveRole(systemCode, id, input) { return await (await write(`/api/systems/${encodeURIComponent(systemCode)}/roles/${id}/move`, input)).json(); },
  async styleScenes(systemCode, query) { return styleSceneListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/style-scenes?${query.toString()}`)).json()); },
  async createStyleScene(systemCode, input) { return styleSceneSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/style-scenes`, input)).json()); },
  async updateStyleScene(systemCode, id, input) { return styleSceneSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/style-scenes/${id}`, input, 'PATCH')).json()); },
  async organizationUnits(systemCode, query) { return organizationUnitListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/organization/units?${query.toString()}`)).json()); },
  async createOrganizationUnit(systemCode, input) { return organizationUnitSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/organization/units`, input)).json()); },
  async updateOrganizationUnit(systemCode, id, input) { return organizationUnitSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/organization/units/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async employees(systemCode, query) { return employeeListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/organization/employees?${query.toString()}`)).json()); },
  async employeeDetail(systemCode, id) { return employeeDetailSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/organization/employees/${encodeURIComponent(id)}`)).json()); },
  async employeeOptions(systemCode) { return employeeOptionsSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/organization/employees/options`)).json()); },
  async createEmployee(systemCode, input) { return employeeDetailSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/organization/employees`, input)).json()); },
  async updateEmployee(systemCode, id, input) { return employeeDetailSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/organization/employees/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async resourceMenuPages(systemCode) { return resourcePageListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages`)).json()); },
  async createResourceMenuPage(systemCode, input) { return resourcePageSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages`, input)).json()); },
  async updateResourceMenuPage(systemCode, id, input) { return resourcePageSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async deleteResourceMenuPage(systemCode, id, version) { await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/${encodeURIComponent(id)}`, { version }, 'DELETE'); },
  async moveResourceMenuPage(systemCode, input) { await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/move`, input, 'POST'); },
  async resourceMenuButtons(systemCode, pageId) { const data = await (await call(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/${encodeURIComponent(pageId)}/buttons`)).json(); return { tool: resourceButtonSchema.array().parse(data.tool), line: resourceButtonSchema.array().parse(data.line) }; },
  async saveResourceMenuButton(systemCode, pageId, input) { return resourceButtonSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/${encodeURIComponent(pageId)}/buttons${input.id ? `/${encodeURIComponent(input.id)}` : ''}`, input, input.id ? 'PATCH' : 'POST')).json()); },
  async deleteResourceMenuButton(systemCode, pageId, id, version) { await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/${encodeURIComponent(pageId)}/buttons/${encodeURIComponent(id)}`, { version }, 'DELETE'); },
  async resourceMenuTabs(systemCode, pageId) { return resourceTabSchema.array().parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/${encodeURIComponent(pageId)}/tabs`)).json()); },
  async saveResourceMenuTab(systemCode, pageId, input) { return resourceTabSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/${encodeURIComponent(pageId)}/tabs${input.id ? `/${encodeURIComponent(input.id)}` : ''}`, input, input.id ? 'PATCH' : 'POST')).json()); },
  async deleteResourceMenuTab(systemCode, pageId, id, version) { await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/pages/${encodeURIComponent(pageId)}/tabs/${encodeURIComponent(id)}`, { version }, 'DELETE'); },
  async resourceMenuMounts(systemCode) { return await (await call(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/navigation-mounts`)).json() as NavigationMount[]; },
  async saveResourceMenuMounts(systemCode, input) { return await (await write(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/navigation-mounts`, input, 'PUT')).json() as NavigationMount[]; },
  async exportResourceMenu(systemCode, rootId) { return (await call(`/api/systems/${encodeURIComponent(systemCode)}/resource-menu/export${rootId ? `?rootId=${encodeURIComponent(rootId)}` : ''}`)).blob(); },
  async products(systemCode, query) { return productListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/products?${query.toString()}`)).json()); },
  async createProduct(systemCode, input) { return productSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/products`, input)).json()); },
  async updateProduct(systemCode, id, input) { return productSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/products/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async productDetail(systemCode, id) { return productSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/products/${encodeURIComponent(id)}`)).json()); },
  async deleteProduct(systemCode, id, version) { await write(`/api/systems/${encodeURIComponent(systemCode)}/products/${encodeURIComponent(id)}`, { version }, 'DELETE'); },
  async attachments(systemCode, ownerType, ownerId) { return attachmentListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/attachments?ownerType=${ownerType}&ownerId=${encodeURIComponent(ownerId)}`)).json()); },
  async uploadAttachment(systemCode, input) { const csrf=csrfToken(); if(!csrf) throw new GatewayError(403,'FORBIDDEN','缺少请求校验信息，请刷新后重试'); const body=new FormData(); body.set('ownerType',input.ownerType); body.set('ownerId',input.ownerId); body.set('description',input.description); body.set('fileVersion',input.fileVersion); body.set('file',input.file); return attachmentMetaSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/attachments`,{method:'POST',headers:{'x-csrf-token':csrf},body})).json()); },
  async updateAttachment(systemCode,id,input){return attachmentMetaSchema.parse(await(await write(`/api/systems/${encodeURIComponent(systemCode)}/attachments/${encodeURIComponent(id)}`,input,'PATCH')).json());},
  async deleteAttachment(systemCode,id,version){await write(`/api/systems/${encodeURIComponent(systemCode)}/attachments/${encodeURIComponent(id)}`,{version},'DELETE');},
  async competitors(systemCode, query) { return competitorListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/competitors?${query.toString()}`)).json()); },
  async createCompetitor(systemCode, input) { return competitorSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/competitors`, input)).json()); },
  async updateCompetitor(systemCode, id, input) { return competitorSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/competitors/${encodeURIComponent(id)}`, input, 'PATCH')).json()); },
  async opportunityTemplates(systemCode) { return opportunityTemplateListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/opportunity-templates`)).json()); },
  async updateOpportunityStage(systemCode, stageId, input) { return opportunityTemplateListSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/opportunity-templates/stages/${encodeURIComponent(stageId)}`, input, 'PATCH')).json()); },
  async createOpportunityStage(systemCode, templateId, input) { return opportunityTemplateListSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/opportunity-templates/${encodeURIComponent(templateId)}/stages`, input, 'POST')).json()); },
  async deleteOpportunityStage(systemCode, stageId, version) { return opportunityTemplateListSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/opportunity-templates/stages/${encodeURIComponent(stageId)}`, { version }, 'DELETE')).json()); },
  async opportunityUsers(systemCode) { return await (await call(`/api/systems/${encodeURIComponent(systemCode)}/opportunities/user-options`)).json() as Array<{ id: string; account: string; displayName: string }>; },
  async opportunities(systemCode, query) { return opportunityListSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/opportunities?${query.toString()}`)).json()); },
  async opportunityDetail(systemCode, id) { return opportunityDetailSchema.parse(await (await call(`/api/systems/${encodeURIComponent(systemCode)}/opportunities/${encodeURIComponent(id)}`)).json()); },
  async createOpportunity(systemCode, input) { return (await write(`/api/systems/${encodeURIComponent(systemCode)}/opportunities`, input)).json() as Promise<Opportunity>; },
  async updateOpportunity(systemCode, id, input) { return opportunityDetailSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/opportunities/${encodeURIComponent(id)}`, input, 'PATCH')).json()).opportunity; },
  async createOpportunityFollowUp(systemCode, id, input) { return opportunityDetailSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/opportunities/${encodeURIComponent(id)}/follow-ups`, input)).json()); },
  async updateOpportunityFollowUp(systemCode, id, followUpId, input) { return opportunityDetailSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/opportunities/${encodeURIComponent(id)}/follow-ups/${encodeURIComponent(followUpId)}`, input, 'PATCH')).json()); },
  async createOpportunityAnalysis(systemCode, id, input) { return opportunityDetailSchema.parse(await (await write(`/api/systems/${encodeURIComponent(systemCode)}/opportunities/${encodeURIComponent(id)}/analyses`, input)).json()); },
};
