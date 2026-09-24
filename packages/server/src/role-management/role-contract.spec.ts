import { roleWriteSchema, roleUpdateSchema } from '@interaction-pattern-lab/contracts';

describe('business role public write contracts', () => {
  it('rejects blank names and attempts to grant a super-administrator flag', () => {
    expect(roleWriteSchema.safeParse({ roleCode: 'sales', roleName: '   ' }).success).toBe(false);
    expect(roleWriteSchema.safeParse({ roleCode: 'sales', roleName: '销售', isSuperAdmin: true }).success).toBe(false);
  });
  it('preserves the published role code and requires a positive concurrency version', () => {
    expect(roleUpdateSchema.safeParse({ roleCode: 'renamed', version: 1 }).success).toBe(false);
    expect(roleUpdateSchema.safeParse({ roleName: '销售经理', version: 0 }).success).toBe(false);
    expect(roleUpdateSchema.parse({ roleName: '销售经理', version: 1 })).toEqual({ roleName: '销售经理', version: 1 });
  });
});
