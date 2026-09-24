import { employeeDetailSchema, employeeWriteSchema } from './index';
import { describe, expect, it } from 'vitest';

describe('employee contracts', () => {
  it('requires a department and a sufficiently strong initial password', () => {
    const base = { employeeNo: 'E1001', employeeName: '测试员工', account: 'employee.test', positionId: '22222222-2222-4222-8222-222222222222', effectiveAt: '2026-01-01T00:00:00.000Z' };
    expect(employeeWriteSchema.safeParse({ ...base, initialPassword: 'short' }).success).toBe(false);
    expect(employeeWriteSchema.safeParse({ ...base, initialPassword: 'EmployeeDemo!2026', orgUnitId: '11111111-1111-4111-8111-111111111111' }).success).toBe(true);
  });

  it('keeps full contact data out of the list contract and only accepts it in detail', () => {
    const item = { id: '11111111-1111-4111-8111-111111111111', employeeNo: 'E1001', employeeName: '测试员工', account: 'employee.test', orgUnitId: '22222222-2222-4222-8222-222222222222', orgUnitName: '测试部', positionId: '33333333-3333-4333-8333-333333333333', positionName: '测试岗位', employmentType: 'FULL_TIME', status: 'ACTIVE', maskedEmail: 't***@example.com', maskedMobile: '138****0000', effectiveAt: '2026-01-01T00:00:00.000Z', remark: null, version: 1, updatedAt: '2026-01-01T00:00:00.000Z', email: 'test@example.com', mobile: '13800000000' };
    expect(employeeDetailSchema.parse(item).email).toBe('test@example.com');
  });
});
