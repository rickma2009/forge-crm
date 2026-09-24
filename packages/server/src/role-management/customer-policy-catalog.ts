export const CUSTOMER_POLICY_FIELDS = [
  { code: 'id', name: '客户标识', type: 'string', writable: false, protected: true },
  { code: 'customerCode', name: '客户编码', type: 'string', writable: false, protected: false },
  { code: 'customerName', name: '客户名称', type: 'string', writable: true, protected: false },
  { code: 'shortName', name: '客户简称', type: 'string', writable: true, protected: false },
  { code: 'categoryValue', name: '客户类别', type: 'string', writable: true, protected: false },
  { code: 'address', name: '地址', type: 'string', writable: true, protected: false },
  { code: 'statusValue', name: '状态', type: 'string', writable: true, protected: false },
  { code: 'industryValue', name: '行业', type: 'string', writable: true, protected: false },
  { code: 'levelValue', name: '等级', type: 'string', writable: true, protected: false },
  { code: 'salesOwnerKey', name: '负责人标识', type: 'string', writable: true, protected: false },
  { code: 'salesOwnerName', name: '负责人', type: 'string', writable: false, protected: false },
  { code: 'remark', name: '备注', type: 'string', writable: true, protected: false },
  { code: 'version', name: '并发版本', type: 'number', writable: false, protected: true },
  { code: 'createdAt', name: '创建时间', type: 'date', writable: false, protected: false },
  { code: 'updatedAt', name: '更新时间', type: 'date', writable: false, protected: false },
] as const;
export const customerQueryFields = CUSTOMER_POLICY_FIELDS.map((f) => ({ ...f, filterable: true }));
export const CUSTOMER_OPERATIONS = ['read', 'create', 'update'] as const;
export const CUSTOMER_ACTIONS = { read: 'view', create: 'create', update: 'update' } as const;
