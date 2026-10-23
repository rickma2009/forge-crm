import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EnterpriseGateway } from './gateway';
import { EmployeeDirectoryPage } from './EmployeeDirectoryPage';
import { AccessUsersPage } from './AccessAdminPages';

const employee = (n: number) => ({ id: String(n), employeeNo: `E${n}`, employeeName: `员工${n}`, account: `user${n}`, orgUnitId: 'org', orgUnitName: '测试部门', positionId: 'position', positionName: '测试岗位', employmentType: 'FULL_TIME', status: 'ACTIVE', maskedEmail: null, maskedMobile: null, effectiveAt: '2026-09-29T00:00:00.000Z', remark: null, version: 1, updatedAt: '2026-09-29T00:00:00.000Z' });
const user = (n: number) => ({ id: String(n), account: `user${n}`, displayName: `用户${n}`, userType: 'INTERNAL', status: 'ACTIVE', effectiveRoles: [], version: 1, updatedAt: '2026-09-29T00:00:00.000Z' });

describe.each(['employees', 'users'] as const)('%s server pagination', (kind) => {
  it('defaults to 20, fetches another server page, and resets page on a new query or page size', async () => {
    const list = vi.fn(async (_system: string, query: URLSearchParams) => {
      const page = Number(query.get('page')), pageSize = Number(query.get('pageSize')), total = query.get('keyword') ? 3 : 45;
      return { items: Array.from({ length: Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize)) }, (_, i) => (kind === 'employees' ? employee : user)((page - 1) * pageSize + i + 1)), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    });
    const gateway = { employees: list, accessUsers: list, employeeOptions: vi.fn(async () => ({ organizations: [], positions: [] })) } as unknown as EnterpriseGateway;
    render(kind === 'employees' ? <EmployeeDirectoryPage systemCode="demo-portal" canManage={false} gateway={gateway} /> : <AccessUsersPage systemCode="demo-portal" canManage={false} gateway={gateway} />);
    const size = await screen.findByLabelText('每页条数');
    expect(size).toHaveValue(20);
    await screen.findByText('共 45 条 · 第 1 / 3 页');
    expect(list.mock.calls.at(-1)?.[1].get('pageSize')).toBe('20');
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    await screen.findByText('共 45 条 · 第 2 / 3 页');
    await waitFor(() => expect(list.mock.calls.at(-1)?.[1].get('page')).toBe('2'));
    expect(await screen.findByText(kind === 'employees' ? 'E21' : 'user21')).toBeInTheDocument();
    fireEvent.change(size, { target: { value: '10' } }); fireEvent.blur(size);
    await screen.findByText('共 45 条 · 第 1 / 5 页');
    expect(list.mock.calls.at(-1)?.[1].get('pageSize')).toBe('10');
    await waitFor(() => expect(screen.getByRole('button', { name: '末页' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '末页' }));
    await screen.findByText('共 45 条 · 第 5 / 5 页');
    await waitFor(() => expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled());
    fireEvent.change(screen.getByLabelText('搜索'), { target: { value: '  测试  ' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await screen.findByText('共 3 条 · 第 1 / 1 页');
    expect(list.mock.calls.at(-1)?.[1].get('keyword')).toBe('测试');
    expect(list.mock.calls.at(-1)?.[1].get('page')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    await screen.findByText('共 45 条 · 第 1 / 5 页');
    expect(list.mock.calls.at(-1)?.[1].has('keyword')).toBe(false);
    fireEvent.change(size, { target: { value: '101' } }); fireEvent.blur(size);
    expect(size).toHaveValue(10);
  });
});
