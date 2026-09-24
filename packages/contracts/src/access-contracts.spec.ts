import { describe, expect, it } from 'vitest';
import {
  accessPermissionListSchema,
  accessRolePermissionReplaceSchema,
  accessRoleWriteSchema,
  accessUserListSchema,
  roleMembershipWriteSchema,
} from './index';

describe('access administration contracts', () => {
  it('parses a scoped user list without exposing authentication secrets', () => {
    const parsed = accessUserListSchema.parse({
      items: [{
        id: '11111111-1111-4111-8111-111111111111',
        account: 'viewer',
        displayName: '受限演示用户',
        userType: 'EXTERNAL',
        status: 'ACTIVE',
        effectiveRoles: [{ id: '22222222-2222-4222-8222-222222222222', roleCode: 'viewer', roleName: '受限演示角色' }],
        version: 2,
        updatedAt: '2026-09-22T00:00:00.000Z',
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    expect(parsed.items[0]).not.toHaveProperty('passwordHash');
    expect(parsed.items[0]?.effectiveRoles[0]?.roleCode).toBe('viewer');
  });

  it('requires stable role codes and optimistic versions for permission replacement', () => {
    expect(() => accessRoleWriteSchema.parse({ roleCode: 'System Manager', roleName: '管理员' })).toThrow();
    expect(() => accessRolePermissionReplaceSchema.parse({ permissionIds: [], roleVersion: 0 })).toThrow();
    expect(accessRolePermissionReplaceSchema.parse({
      permissionIds: ['33333333-3333-4333-8333-333333333333'],
      roleVersion: 3,
    }).roleVersion).toBe(3);
  });

  it('rejects invalid half-open membership periods', () => {
    expect(() => roleMembershipWriteSchema.parse({
      userId: '11111111-1111-4111-8111-111111111111',
      effectiveAt: '2026-09-22T02:00:00.000Z',
      expiresAt: '2026-09-22T02:00:00.000Z',
    })).toThrow('结束时间必须晚于生效时间');
  });

  it('parses a read-only permission directory page', () => {
    const parsed = accessPermissionListSchema.parse({
      items: [{
        id: '33333333-3333-4333-8333-333333333333',
        permissionCode: 'access.user.view',
        permissionName: '查看用户',
        resourceCode: 'user',
        actionCode: 'view',
        source: 'SYSTEM',
        status: 'ACTIVE',
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    expect(parsed.items[0]?.permissionCode).toBe('access.user.view');
  });
});
