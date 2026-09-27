import { z } from 'zod';
export { businessListObjects, businessListDefaultConfig, isBusinessListObject, type BusinessListObject } from './list-view-objects';
export * from './role-policy';
export * from './opportunity';
export * from './attachment';

export const systemCodeSchema = z.string().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const accountSchema = z.string().trim().min(1).max(128).transform((value) => value.toLowerCase());
export const actionCodeSchema = z.string().min(1).max(64).regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);

export const loginRequestSchema = z.strictObject({
  account: accountSchema,
  password: z.string().min(12).max(256),
});

export const sessionUserSchema = z.strictObject({
  account: z.string(),
  displayName: z.string(),
});

export const apiErrorSchema = z.strictObject({
  code: z.enum(['BAD_REQUEST', 'UNAUTHENTICATED', 'ACCOUNT_LOCKED', 'FORBIDDEN', 'NOT_FOUND', 'SERVICE_UNAVAILABLE']),
  message: z.string(),
  requestId: z.string(),
  details: z.record(z.unknown()).optional(),
});

export const navigationActionSchema = z.strictObject({
  actionCode: actionCodeSchema,
  label: z.string().min(1),
  actionType: z.string().min(1).max(64).regex(/^[A-Z][A-Z0-9_]*$/),
  sortNo: z.number().int(),
});

export interface NavigationNode {
  menuCode: string;
  label: string;
  nodeType: 'GROUP' | 'PAGE';
  routePath?: string | null;
  iconKey: string;
  sortNo: number;
  allowedActions?: z.infer<typeof navigationActionSchema>[];
  children: NavigationNode[];
}

export const navigationNodeSchema: z.ZodType<NavigationNode> = z.lazy(() => z.strictObject({
  menuCode: z.string().min(1).max(64).regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  label: z.string().min(1),
  nodeType: z.enum(['GROUP', 'PAGE']),
  routePath: z.string().startsWith('/').nullable().optional(),
  iconKey: z.string().min(1).max(64),
  sortNo: z.number().int(),
  allowedActions: z.array(navigationActionSchema).optional(),
  children: z.array(navigationNodeSchema),
}));

export const navigationResponseSchema = z.strictObject({
  systemCode: systemCodeSchema,
  items: z.array(navigationNodeSchema),
  permissionVersion: z.string().regex(/^[a-f0-9]{64}$/),
});

export const recordStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export const resourcePageTypeSchema = z.enum(['SYSTEM', 'MODULE', 'PAGE', 'SUBPAGE', 'COMPONENT']);
export const resourcePermissionModeSchema = z.enum(['RESTRICTED', 'COMMON']);
export const resourceButtonTypeSchema = z.enum(['TOOL', 'LINE']);
const resourceCodeSchema = z.string().trim().min(1).max(128).regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);
export const resourcePageWriteSchema = z.strictObject({
  pageCode: resourceCodeSchema,
  pageName: z.string().trim().min(1).max(128),
  pageType: resourcePageTypeSchema,
  parentId: z.string().uuid().optional().nullable(),
  routePath: z.string().startsWith('/').max(256).optional().nullable(),
  iconKey: z.string().trim().min(1).max(64),
  permissionMode: resourcePermissionModeSchema.default('RESTRICTED'),
  status: recordStatusSchema.default('ACTIVE'),
  autoAddMenu: z.boolean().default(true),
  viewConfigEnabled: z.boolean().default(false),
  groupManageEnabled: z.boolean().default(false),
  dataPermissionEnabled: z.boolean().default(false),
  sortNo: z.number().int().min(0).max(999999).default(0),
  remark: z.string().trim().max(1000).optional().nullable(),
}).superRefine((value, context) => {
  if (['PAGE', 'SUBPAGE'].includes(value.pageType) && !value.routePath) context.addIssue({ code: z.ZodIssueCode.custom, path: ['routePath'], message: '页面和子页面必须填写访问地址' });
});
export const resourcePageUpdateSchema = resourcePageWriteSchema.innerType().partial().extend({ version: z.number().int().positive() });
export const resourcePageSchema = resourcePageWriteSchema.innerType().extend({
  id: z.string().uuid(),
  routePath: z.string().startsWith('/').max(256).nullable(),
  parentId: z.string().uuid().nullable(),
  remark: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const resourcePageListSchema = z.array(resourcePageSchema);
export const resourceTreeMoveSchema = z.strictObject({
  sourceId: z.string().uuid(), targetId: z.string().uuid(),
  position: z.enum(['before', 'after', 'child']), version: z.number().int().positive(),
});
export const resourceButtonWriteSchema = z.strictObject({
  buttonCode: resourceCodeSchema,
  buttonName: z.string().trim().min(1).max(128),
  buttonType: resourceButtonTypeSchema,
  iconKey: z.string().trim().max(64).optional().nullable(),
  eventName: z.string().trim().max(128).optional().nullable(),
  sortNo: z.number().int().min(0).max(999999).default(0),
  status: recordStatusSchema.default('ACTIVE'),
  remark: z.string().trim().max(1000).optional().nullable(),
});
export const resourceButtonSchema = resourceButtonWriteSchema.extend({ id: z.string().uuid(), pageId: z.string().uuid(), version: z.number().int().positive() });
export const resourceTabWriteSchema = z.strictObject({
  targetPageId: z.string().uuid(), tabName: z.string().trim().min(1).max(80),
  sortNo: z.number().int().min(0).max(999999).default(0), status: recordStatusSchema.default('ACTIVE'),
  remark: z.string().trim().max(300).optional().nullable(),
});
export const resourceTabSchema = resourceTabWriteSchema.extend({ id: z.string().uuid(), pageId: z.string().uuid(), version: z.number().int().positive() });
export const navigationMountWriteSchema = z.strictObject({
  id: z.string().uuid().optional(), pageResourceId: z.string().uuid(), parentId: z.string().uuid().optional().nullable(),
  menuName: z.string().trim().min(1).max(128), menuType: z.enum(['DIRECTORY', 'PAGE']).default('PAGE'),
  openType: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'), autoAdd: z.boolean().default(true),
  status: recordStatusSchema.default('ACTIVE'), sortNo: z.number().int().min(0).max(999999), remark: z.string().trim().max(500).optional().nullable(),
  version: z.number().int().positive().optional(),
});

export type ResourcePage = z.infer<typeof resourcePageSchema>;
export type ResourcePageType = z.infer<typeof resourcePageTypeSchema>;
export type ResourcePageWrite = z.infer<typeof resourcePageWriteSchema>;
export type ResourcePageUpdate = z.infer<typeof resourcePageUpdateSchema>;
export type ResourceTreeMove = z.infer<typeof resourceTreeMoveSchema>;
export type ResourceButton = z.infer<typeof resourceButtonSchema>;
export type ResourceButtonWrite = z.infer<typeof resourceButtonWriteSchema>;
export type ResourceTab = z.infer<typeof resourceTabSchema>;
export type ResourceTabWrite = z.infer<typeof resourceTabWriteSchema>;
export type NavigationMountWrite = z.infer<typeof navigationMountWriteSchema>;
export const accessUserStatusSchema = z.enum(['ACTIVE', 'DISABLED', 'LOCKED']);
export const accessUserTypeSchema = z.enum(['INTERNAL', 'EXTERNAL', 'SERVICE']);
export const accessPermissionSourceSchema = z.enum(['SYSTEM', 'CUSTOM']);
export const stableCodeSchema = z.string().min(1).max(128).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
export const paginationSchema = z.strictObject({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const accessRoleSummarySchema = z.strictObject({
  id: z.string().uuid(),
  roleCode: stableCodeSchema,
  roleName: z.string().min(1).max(128),
});

export const accessUserSchema = z.strictObject({
  id: z.string().uuid(),
  account: z.string().min(1).max(128),
  displayName: z.string().min(1).max(128),
  userType: accessUserTypeSchema,
  status: accessUserStatusSchema,
  effectiveRoles: z.array(accessRoleSummarySchema),
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
});
export const accessUserListSchema = z.strictObject({
  items: z.array(accessUserSchema),
  pagination: paginationSchema,
});

export const accessRoleWriteSchema = z.strictObject({
  roleCode: stableCodeSchema,
  roleName: z.string().trim().min(1).max(128),
  description: z.string().trim().max(512).optional().nullable(),
  roleGroupId: z.string().uuid().optional().nullable(),
});
export const accessRolePermissionReplaceSchema = z.strictObject({
  permissionIds: z.array(z.string().uuid()).max(5000),
  roleVersion: z.number().int().positive(),
});
export const roleMembershipWriteSchema = z.strictObject({
  userId: z.string().uuid(),
  effectiveAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional().nullable(),
}).superRefine((value, context) => {
  if (value.expiresAt && Date.parse(value.expiresAt) <= Date.parse(value.effectiveAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiresAt'],
      message: '结束时间必须晚于生效时间',
    });
  }
});

export const accessPermissionSchema = z.strictObject({
  id: z.string().uuid(),
  permissionCode: stableCodeSchema,
  permissionName: z.string().min(1).max(128),
  resourceCode: stableCodeSchema,
  actionCode: stableCodeSchema,
  source: accessPermissionSourceSchema,
  status: recordStatusSchema,
});
export const accessPermissionListSchema = z.strictObject({
  items: z.array(accessPermissionSchema),
  pagination: paginationSchema,
});
export const rolePermissionCatalogSchema = z.strictObject({
  pages: z.array(z.strictObject({
    id: z.string().uuid(), parentId: z.string().uuid().nullable(), pageCode: z.string(), pageName: z.string(),
    pageType: resourcePageTypeSchema, permissionIds: z.array(z.string().uuid()),
    actions: z.array(z.strictObject({ id: z.string(), label: z.string(), permissionIds: z.array(z.string().uuid()) })),
  })),
  permissions: z.array(accessPermissionSchema), grantablePermissionIds: z.array(z.string().uuid()),
});
export type RolePermissionCatalog = z.infer<typeof rolePermissionCatalogSchema>;
export const dictionaryItemSchema = z.strictObject({
  id: z.string().uuid(),
  parentItemId: z.string().uuid().nullable().optional(),
  itemCode: z.string(),
  itemValue: z.string(),
  itemName: z.string(),
  colorKey: z.string().nullable(),
  description: z.string().nullable(),
  sortNo: z.number().int(),
  status: recordStatusSchema,
  version: z.number().int().positive(),
});
export const dictionarySchema = z.strictObject({
  id: z.string().uuid(),
  dictCode: z.string(),
  dictName: z.string(),
  groupCode: z.string().nullable(),
  parentId: z.string().uuid().nullable(),
  description: z.string().nullable(),
  sortNo: z.number().int(),
  status: recordStatusSchema,
  itemsEditable: z.boolean(),
  version: z.number().int().positive(),
  items: z.array(dictionaryItemSchema),
});
export const dictionaryListSchema = z.array(dictionarySchema);
export const dictionaryValueWriteSchema = z.strictObject({
  parentItemId: z.string().uuid().nullable().optional(),
  itemValue: z.string().trim().min(1).max(128),
  itemName: z.string().trim().min(1).max(128),
  colorKey: z.enum(['blue', 'green', 'orange', 'purple', 'red', 'gray']).optional(),
  description: z.string().trim().max(512).optional(),
  sortNo: z.number().int().min(0).max(9999).default(0),
  status: recordStatusSchema.default('ACTIVE'),
});
export const dictionaryValueUpdateSchema = dictionaryValueWriteSchema.partial().extend({ version: z.number().int().positive() });
export const dictionaryImportRowSchema = dictionaryValueWriteSchema.extend({ rowNumber: z.number().int().min(2) });
export const dictionaryImportRequestSchema = z.strictObject({
  rows: z.array(dictionaryImportRowSchema).min(1).max(1000),
});
export const dictionaryImportResultSchema = z.strictObject({ imported: z.number().int().nonnegative() });

export const listViewColumnSchema = z.strictObject({
  key: z.string().min(1).max(64),
  visible: z.boolean(),
  queryVisible: z.boolean(),
  queryCollapsed: z.boolean(),
  width: z.number().int().min(80).max(600),
  fixed: z.enum(['left', 'right']).nullable(),
});
export const listViewConfigSchema = z.strictObject({
  columns: z.array(listViewColumnSchema).min(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)]),
  filters: z.record(z.union([z.string(), z.array(z.string())])),
  sort: z.strictObject({ field: z.string(), direction: z.enum(['asc', 'desc']) }),
});
export const resolvedListViewSchema = z.strictObject({
  viewKey: z.string(),
  id: z.string().uuid(),
  scope: z.enum(['SYSTEM', 'USER']),
  viewCode: z.string().nullable(),
  viewName: z.string(),
  baseViewId: z.string().uuid(),
  isDefault: z.boolean(),
  allowPersonalOverride: z.boolean(),
  readOnly: z.boolean(),
  config: listViewConfigSchema,
  version: z.number().int().positive(),
});
export const resolvedListViewsSchema = z.strictObject({
  pageCode: z.string(),
  actionCode: z.string(),
  selectedViewKey: z.string(),
  fallbackNotice: z.string().optional(),
  views: z.array(resolvedListViewSchema).min(1),
});

export const customerSchema = z.strictObject({
  id: z.string().uuid(),
  customerCode: z.string(),
  customerName: z.string(),
  shortName: z.string(),
  categoryValue: z.string(),
  address: z.string().nullable(),
  statusValue: z.string(),
  industryValue: z.string().nullable(),
  levelValue: z.string().nullable(),
  salesOwnerKey: z.string().nullable(),
  salesOwnerName: z.string().nullable(),
  remark: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  fieldAccess: z.record(z.strictObject({ visible: z.boolean(), writable: z.boolean() })).optional(),
});
export const customerListSchema = z.strictObject({
  items: z.array(customerSchema),
  pagination: z.strictObject({ page: z.number().int(), pageSize: z.number().int(), total: z.number().int(), totalPages: z.number().int() }),
});
export const customerWriteSchema = z.strictObject({
  customerName: z.string().trim().min(1).max(255),
  shortName: z.string().trim().min(1).max(100),
  categoryValue: z.string().min(1).max(128),
  address: z.string().trim().max(500).optional(),
  statusValue: z.string().min(1).max(128),
  industryValue: z.string().max(128).optional(),
  levelValue: z.string().max(128).optional(),
  salesOwnerKey: z.string().max(128).optional(),
  remark: z.string().trim().max(1000).optional(),
});
export const customerUpdateSchema = customerWriteSchema.partial().extend({ version: z.number().int().positive() });
export const salesOptionSchema = z.strictObject({ key: z.string(), name: z.string() });

export const customerContactSchema = z.strictObject({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  name: z.string(),
  department: z.string().nullable(),
  position: z.string().nullable(),
  decisionRole: z.string().nullable(),
  mobile: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: z.string(),
  remark: z.string().nullable(),
  sortNo: z.number().int(),
  version: z.number().int(),
  updatedAt: z.string(),
});
export const customerContactWriteSchema = z.strictObject({
  name: z.string().trim().min(1, '请输入联系人姓名').max(100),
  department: z.string().trim().max(128).optional().nullable(),
  position: z.string().trim().max(128).optional().nullable(),
  decisionRole: z.string().trim().max(64).optional().nullable(),
  mobile: z.string().trim().max(32).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().email('邮箱格式不正确').max(128).optional().nullable().or(z.literal('')),
  status: z.string().default('ACTIVE'),
  remark: z.string().trim().max(500).optional().nullable(),
  sortNo: z.number().int().default(0),
});
export const customerContactUpdateSchema = customerContactWriteSchema.extend({ version: z.number().int().positive() });
export type CustomerContact = z.infer<typeof customerContactSchema>;
export type CustomerContactWrite = z.infer<typeof customerContactWriteSchema>;
export type CustomerContactUpdate = z.infer<typeof customerContactUpdateSchema>;

export const customerAddressSchema = z.strictObject({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  addressType: z.string(),
  recipient: z.string().nullable(),
  phone: z.string().nullable(),
  province: z.string().nullable(),
  city: z.string().nullable(),
  district: z.string().nullable(),
  detail: z.string(),
  isDefault: z.boolean(),
  status: z.string(),
  remark: z.string().nullable(),
  sortNo: z.number().int(),
  version: z.number().int(),
  updatedAt: z.string(),
});
export const customerAddressWriteSchema = z.strictObject({
  addressType: z.string().min(1, '请选择地址类型'),
  recipient: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  province: z.string().trim().max(64).optional().nullable(),
  city: z.string().trim().max(64).optional().nullable(),
  district: z.string().trim().max(64).optional().nullable(),
  detail: z.string().trim().min(1, '请输入详细地址').max(500),
  isDefault: z.boolean().default(false),
  status: z.string().default('ACTIVE'),
  remark: z.string().trim().max(500).optional().nullable(),
  sortNo: z.number().int().default(0),
});
export const customerAddressUpdateSchema = customerAddressWriteSchema.extend({ version: z.number().int().positive() });
export type CustomerAddress = z.infer<typeof customerAddressSchema>;
export type CustomerAddressWrite = z.infer<typeof customerAddressWriteSchema>;
export type CustomerAddressUpdate = z.infer<typeof customerAddressUpdateSchema>;

export const customerDetailSchema = z.strictObject({
  customer: customerSchema,
  contacts: z.array(customerContactSchema),
  addresses: z.array(customerAddressSchema),
});
export type CustomerDetail = z.infer<typeof customerDetailSchema>;

export const sceneStatusSchema = z.enum(['DONE', 'WIP', 'TODO']);
export const interactionMaturitySchema = z.enum(['idea', 'candidate', 'implementation-verified', 'interaction-verified', 'project-adopted', 'business-validated', 'released', 'deprecated']);
export const styleSceneSchema = z.strictObject({
  id: z.string().uuid(),
  category: z.string(),
  subCategory: z.string().nullable(),
  sceneName: z.string(),
  description: z.string().nullable(),
  status: sceneStatusSchema,
  pagePath: z.string().nullable(),
  note: z.string().nullable(),
  doneAt: z.string().nullable(),
  sortNo: z.number().int(),
  version: z.number().int().positive(),
});
export const styleSceneSummarySchema = styleSceneSchema.extend({
  assetCode: z.string().nullable(),
  maturity: interactionMaturitySchema.nullable(),
});
export const interactionEvidenceCardSchema = z.strictObject({
  evidenceId: z.string(),
  state: z.string(),
  archivedSourceRefs: z.array(z.string()),
  implementationRefs: z.array(z.string()),
  artifactRefs: z.array(z.string()),
  validation: z.strictObject({
    project: z.string(),
    slice: z.string(),
    environment: z.string(),
    versionPoint: z.string(),
    result: z.string(),
    unknowns: z.array(z.string()),
  }),
});
export const styleSceneDetailSchema = styleSceneSummarySchema.extend({
  definition: z.array(z.string()),
  definitionRef: z.strictObject({ path: z.string(), section: z.string() }).nullable(),
  artifacts: z.array(z.string()),
  evidence: z.array(z.string()),
  evidenceCards: z.array(interactionEvidenceCardSchema),
  nextEvidence: z.string().nullable(),
});
export const styleSceneTaxonomySchema = z.strictObject({
  types: z.array(z.strictObject({
    category: z.string(),
    count: z.number().int().nonnegative(),
    groups: z.array(z.strictObject({ subCategory: z.string(), count: z.number().int().nonnegative() })),
  })),
});
export const styleSceneListSchema = z.strictObject({
  items: z.array(styleSceneSummarySchema),
  pagination: z.strictObject({ page: z.number().int(), pageSize: z.number().int(), total: z.number().int(), totalPages: z.number().int() }),
});
export const styleSceneWriteSchema = z.strictObject({
  category: z.string().trim().min(1).max(64),
  subCategory: z.string().trim().max(64).optional(),
  sceneName: z.string().trim().min(1).max(128),
  description: z.string().trim().max(512).optional(),
  status: sceneStatusSchema.default('TODO'),
  pagePath: z.string().trim().max(256).optional(),
  note: z.string().trim().max(512).optional(),
  doneAt: z.string().datetime().optional().nullable(),
  sortNo: z.number().int().min(0).max(9999).default(0),
});
export const styleSceneUpdateSchema = styleSceneWriteSchema.partial().extend({ version: z.number().int().positive() });

export const organizationUnitTypeSchema = z.enum(['COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM']);
export const organizationUnitSchema = z.strictObject({
  id: z.string().uuid(), parentId: z.string().uuid().nullable(), unitCode: z.string(), unitName: z.string(),
  unitType: organizationUnitTypeSchema, sortNo: z.number().int(), status: z.enum(['ACTIVE', 'DISABLED']),
  effectiveAt: z.string().datetime(), expiresAt: z.string().datetime().nullable(), remark: z.string().nullable(),
  depth: z.number().int().min(0), version: z.number().int().positive(), updatedAt: z.string().datetime(),
});
export const organizationUnitListSchema = z.strictObject({ items: z.array(organizationUnitSchema) });
const organizationUnitWriteObjectSchema = z.strictObject({
  parentId: z.string().uuid().optional().nullable(),
  unitCode: z.string().trim().regex(/^[a-z][a-z0-9.-]*$/, '组织编码仅支持小写字母、数字、点和连字符').max(64),
  unitName: z.string().trim().min(1, '请输入组织名称').max(128), unitType: organizationUnitTypeSchema,
  sortNo: z.number().int().min(0).max(9999).default(0), status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
  effectiveAt: z.string().datetime(), expiresAt: z.string().datetime().optional().nullable(), remark: z.string().trim().max(500).optional().nullable(),
});
const validateOrganizationUnitPeriod = (value: { effectiveAt: string; expiresAt?: string | null }, context: z.RefinementCtx) => {
  if (value.expiresAt && new Date(value.expiresAt) <= new Date(value.effectiveAt)) context.addIssue({ code: 'custom', path: ['expiresAt'], message: '失效时间必须晚于生效时间' });
};
export const organizationUnitWriteSchema = organizationUnitWriteObjectSchema.superRefine(validateOrganizationUnitPeriod);
export const organizationUnitUpdateSchema = organizationUnitWriteObjectSchema.extend({ version: z.number().int().positive() }).superRefine(validateOrganizationUnitPeriod);

export const employeeSchema = z.strictObject({
  id: z.string().uuid(), employeeNo: z.string(), employeeName: z.string(), account: z.string(),
  orgUnitId: z.string().uuid(), orgUnitName: z.string(), positionId: z.string().uuid(), positionName: z.string(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR']), status: z.enum(['ACTIVE', 'DISABLED']),
  maskedEmail: z.string().nullable(), maskedMobile: z.string().nullable(), effectiveAt: z.string().datetime(),
  remark: z.string().nullable(), version: z.number().int().positive(), updatedAt: z.string().datetime(),
});
export const employeeListSchema = z.strictObject({ items: z.array(employeeSchema), pagination: paginationSchema });
export const employeeDetailSchema = employeeSchema.extend({ email: z.string().email().nullable(), mobile: z.string().nullable() });
export const employeeOptionsSchema = z.strictObject({
  organizations: z.array(z.strictObject({ id: z.string().uuid(), parentId: z.string().uuid().nullable(), unitName: z.string(), depth: z.number().int().min(0) })),
  positions: z.array(z.strictObject({ id: z.string().uuid(), positionCode: z.string(), positionName: z.string() })),
});
export const employeeWriteSchema = z.strictObject({
  employeeNo: z.string().trim().regex(/^[A-Za-z0-9.-]+$/, '工号仅支持字母、数字、点和连字符').max(64),
  employeeName: z.string().trim().min(1, '请输入员工姓名').max(128),
  account: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]+$/, '登录账号格式不正确').max(128),
  initialPassword: z.string().min(12, '初始密码至少 12 位').max(128),
  orgUnitId: z.string().uuid(), positionId: z.string().uuid(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR']).default('FULL_TIME'),
  email: z.string().trim().email('邮箱格式不正确').optional().nullable(), mobile: z.string().trim().max(32).optional().nullable(),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'), effectiveAt: z.string().datetime(), remark: z.string().trim().max(500).optional().nullable(),
});
export const employeeUpdateSchema = employeeWriteSchema.omit({ employeeNo: true, account: true, initialPassword: true }).extend({ version: z.number().int().positive() });

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type AccessUser = z.infer<typeof accessUserSchema>;
export type AccessUserList = z.infer<typeof accessUserListSchema>;
export type AccessRoleWrite = z.infer<typeof accessRoleWriteSchema>;
export type AccessRolePermissionReplace = z.infer<typeof accessRolePermissionReplaceSchema>;
export type RoleMembershipWrite = z.infer<typeof roleMembershipWriteSchema>;
export type AccessPermission = z.infer<typeof accessPermissionSchema>;
export type AccessPermissionList = z.infer<typeof accessPermissionListSchema>;
export type NavigationResponse = z.infer<typeof navigationResponseSchema>;
export type Dictionary = z.infer<typeof dictionarySchema>;
export type DictionaryItem = z.infer<typeof dictionaryItemSchema>;
export type DictionaryValueWrite = z.infer<typeof dictionaryValueWriteSchema>;
export type DictionaryValueUpdate = z.infer<typeof dictionaryValueUpdateSchema>;
export type DictionaryImportRow = z.infer<typeof dictionaryImportRowSchema>;
export type ListViewConfig = z.infer<typeof listViewConfigSchema>;
export type ResolvedListView = z.infer<typeof resolvedListViewSchema>;
export type ResolvedListViews = z.infer<typeof resolvedListViewsSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type CustomerList = z.infer<typeof customerListSchema>;
export type CustomerWrite = z.infer<typeof customerWriteSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
export type SalesOption = z.infer<typeof salesOptionSchema>;
export type StyleScene = z.infer<typeof styleSceneSchema>;
export type InteractionMaturity = z.infer<typeof interactionMaturitySchema>;
export type InteractionEvidenceCard = z.infer<typeof interactionEvidenceCardSchema>;
export type StyleSceneSummary = z.infer<typeof styleSceneSummarySchema>;
export type StyleSceneDetail = z.infer<typeof styleSceneDetailSchema>;
export type StyleSceneTaxonomy = z.infer<typeof styleSceneTaxonomySchema>;
export type StyleSceneList = z.infer<typeof styleSceneListSchema>;
export type StyleSceneWrite = z.infer<typeof styleSceneWriteSchema>;
export type StyleSceneUpdate = z.infer<typeof styleSceneUpdateSchema>;
export type OrganizationUnit = z.infer<typeof organizationUnitSchema>;
export type OrganizationUnitList = z.infer<typeof organizationUnitListSchema>;
export type OrganizationUnitWrite = z.infer<typeof organizationUnitWriteSchema>;
export type OrganizationUnitUpdate = z.infer<typeof organizationUnitUpdateSchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type EmployeeList = z.infer<typeof employeeListSchema>;
export type EmployeeDetail = z.infer<typeof employeeDetailSchema>;
export type EmployeeOptions = z.infer<typeof employeeOptionsSchema>;
export type EmployeeWrite = z.infer<typeof employeeWriteSchema>;
export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;

// ── Role management (业务角色管理) ──────────────────────────
export const roleTreeNodeSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  roleCode: z.string(),
  roleName: z.string(),
  roleAbbrName: z.string().nullable(),
  sortNo: z.number(),
  isEnabled: z.boolean(),
  isSystem: z.boolean(),
  effectiveDateBegin: z.string().datetime().nullable(),
  effectiveDateEnd: z.string().datetime().nullable(),
  description: z.string().nullable(),
  status: z.enum(['ACTIVE', 'DISABLED']),
  version: z.number().int().positive(),
  children: z.array(z.any()).default([]),
});

export const roleWriteSchema = z.strictObject({
  parentId: z.string().uuid().nullable().optional(),
  roleCode: z.string().trim().min(1).max(64).regex(/^[a-z][a-z0-9.-]*$/),
  roleName: z.string().trim().min(1).max(128),
  roleAbbrName: z.string().trim().max(64).nullable().optional(),
  sortNo: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
  effectiveDateBegin: z.string().datetime().nullable().optional(),
  effectiveDateEnd: z.string().datetime().nullable().optional(),
  description: z.string().max(512).nullable().optional(),
});

export const roleUpdateSchema = roleWriteSchema.omit({ roleCode: true }).partial().extend({ version: z.number().int().positive() });

export const roleListSchema = z.array(roleTreeNodeSchema);

export type RoleTreeNode = z.infer<typeof roleTreeNodeSchema>;
export type RoleWrite = z.infer<typeof roleWriteSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;
export type RoleList = z.infer<typeof roleListSchema>;
export * from './quotation';
export * from './inventory';

export * from './system-parameter';

export * from './ai-analysis';
