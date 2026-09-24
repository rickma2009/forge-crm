import { describe, expect, it } from 'vitest';
import { resourcePageWriteSchema, resourceTreeMoveSchema } from './index';

describe('resource menu public contracts', () => {
  it('accepts the five supported resource classes with explicit management flags', () => {
    const base = {
      pageCode: 'system.customer-list',
      pageName: '客户列表',
      pageType: 'PAGE' as const,
      parentId: '11111111-1111-4111-8111-111111111111',
      routePath: '/showcase/customers',
      iconKey: 'user',
      permissionMode: 'RESTRICTED' as const,
      status: 'ACTIVE' as const,
      autoAddMenu: true,
      viewConfigEnabled: true,
      groupManageEnabled: false,
      dataPermissionEnabled: false,
      sortNo: 20,
      remark: '客户主数据入口',
    };
    expect(resourcePageWriteSchema.parse(base).pageType).toBe('PAGE');
    for (const pageType of ['SYSTEM', 'MODULE', 'PAGE', 'SUBPAGE', 'COMPONENT'] as const) {
      expect(resourcePageWriteSchema.safeParse({ ...base, pageType }).success).toBe(true);
    }
  });

  it('rejects unstable codes, relative routes and unknown drag positions', () => {
    expect(resourcePageWriteSchema.safeParse({ pageCode: '客户 页面', pageName: '客户', pageType: 'PAGE', iconKey: 'user', permissionMode: 'RESTRICTED', status: 'ACTIVE', autoAddMenu: true, viewConfigEnabled: false, groupManageEnabled: false, dataPermissionEnabled: false, sortNo: 10 }).success).toBe(false);
    expect(resourcePageWriteSchema.safeParse({ pageCode: 'customer.page', pageName: '客户', pageType: 'PAGE', routePath: 'customers', iconKey: 'user', permissionMode: 'RESTRICTED', status: 'ACTIVE', autoAddMenu: true, viewConfigEnabled: false, groupManageEnabled: false, dataPermissionEnabled: false, sortNo: 10 }).success).toBe(false);
    expect(resourceTreeMoveSchema.safeParse({ sourceId: crypto.randomUUID(), targetId: crypto.randomUUID(), position: 'around', version: 1 }).success).toBe(false);
  });
});
