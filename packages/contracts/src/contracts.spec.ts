import { describe, expect, it } from 'vitest';
import { apiErrorSchema, loginRequestSchema, navigationResponseSchema, systemCodeSchema } from './index';

describe('navigation RBAC public contracts', () => {
  it('accepts a login request without a client supplied user id', () => {
    expect(loginRequestSchema.parse({ account: ' admin ', password: 'correct horse battery staple' })).toEqual({
      account: 'admin',
      password: 'correct horse battery staple',
    });
    expect(loginRequestSchema.safeParse({ account: 'admin', password: 'password', userId: 'spoofed' }).success).toBe(false);
  });

  it('restricts system codes to stable lowercase identifiers', () => {
    expect(systemCodeSchema.parse('demo-portal')).toBe('demo-portal');
    expect(systemCodeSchema.safeParse('../other').success).toBe(false);
    expect(systemCodeSchema.safeParse('Demo Portal').success).toBe(false);
  });

  it('parses an authorized single-tree navigation response', () => {
    const response = navigationResponseSchema.parse({
      systemCode: 'demo-portal',
      permissionVersion: 'a'.repeat(64),
      items: [{ menuCode: 'customer-directory', label: '客户管理', nodeType: 'PAGE', routePath: '/showcase/customers', iconKey: 'user', sortNo: 10, allowedActions: [{ actionCode: 'view', label: '查看', actionType: 'VIEW', sortNo: 10 }], children: [] }],
    });
    expect(response.items[0]?.allowedActions?.[0]?.actionCode).toBe('view');
  });

  it('uses a minimal non-leaking API error', () => {
    expect(apiErrorSchema.parse({ code: 'FORBIDDEN', message: '无权访问', requestId: 'req-1' })).toEqual({ code: 'FORBIDDEN', message: '无权访问', requestId: 'req-1' });
    expect(apiErrorSchema.safeParse({ code: 'FORBIDDEN', message: '无权访问', requestId: 'req-1', hiddenMenu: '用户管理' }).success).toBe(false);
  });
});
