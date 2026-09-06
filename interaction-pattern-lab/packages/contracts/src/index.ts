import { z } from 'zod';

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
export const dictionaryItemSchema = z.strictObject({
  id: z.string().uuid(),
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
export const customerUpdateSchema = customerWriteSchema.extend({ version: z.number().int().positive() });
export const salesOptionSchema = z.strictObject({ key: z.string(), name: z.string() });

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
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
