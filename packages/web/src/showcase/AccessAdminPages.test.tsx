import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AccessPermissionsPage, AccessRolesPage, AccessUsersPage } from './AccessAdminPages';
import type { EnterpriseGateway } from './gateway';

const gateway = {
  accessUsers: vi.fn(async () => ({ items: [{ id: '11111111-1111-4111-8111-111111111111', account: 'admin', displayName: '系统管理员', userType: 'INTERNAL' as const, status: 'ACTIVE' as const, effectiveRoles: [{ id: '22222222-2222-4222-8222-222222222222', roleCode: 'system-manager', roleName: '系统管理员' }], version: 1, updatedAt: '2026-09-22T00:00:00.000Z' }], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })),
  accessRoles: vi.fn(async () => ({ items: [{ id: '22222222-2222-4222-8222-222222222222', roleCode: 'system-manager', roleName: '系统管理员', roleType: 'SYSTEM', isSystem: true, description: null, status: 'ACTIVE' as const, memberCount: 1, permissionCount: 9, version: 1, updatedAt: '2026-09-22T00:00:00.000Z' }], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })),
  accessPermissions: vi.fn(async () => ({ items: [{ id: '33333333-3333-4333-8333-333333333333', permissionCode: 'access.user.view', permissionName: '查看用户', resourceCode: 'user', actionCode: 'view', source: 'SYSTEM' as const, status: 'ACTIVE' as const }], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })),
  setAccessUserStatus: vi.fn(async () => undefined),
  createAccessRole: vi.fn(async () => undefined),
} as unknown as EnterpriseGateway;

describe('access administration pages', () => {
  it('renders database-backed users, roles and permissions in the shared enterprise list style', async () => {
    const users = render(<AccessUsersPage systemCode="demo-portal" canManage gateway={gateway} />);
    expect((await screen.findAllByText('系统管理员')).length).toBe(2);
    expect(screen.getByText('admin')).toBeInTheDocument();
    users.unmount();

    const roles = render(<AccessRolesPage systemCode="demo-portal" canManage gateway={gateway} />);
    expect(await screen.findByText('system-manager')).toBeInTheDocument();
    expect(screen.getByText(/系统内置/)).toBeInTheDocument();
    roles.unmount();

    render(<AccessPermissionsPage systemCode="demo-portal" gateway={gateway} />);
    expect(await screen.findByText('access.user.view')).toBeInTheDocument();
    expect(screen.getByText('权限目录（只读）')).toBeInTheDocument();
  });

  it('removes write entry points for a read-only viewer', async () => {
    const users = render(<AccessUsersPage systemCode="demo-portal" canManage={false} gateway={gateway} />);
    await screen.findByText('admin');
    expect(screen.queryByRole('button', { name: '停用' })).not.toBeInTheDocument();
    users.unmount();

    render(<AccessRolesPage systemCode="demo-portal" canManage={false} gateway={gateway} />);
    await screen.findByText('system-manager');
    expect(screen.queryByRole('button', { name: /新建角色/ })).not.toBeInTheDocument();
  });

  it('uses the shared scene-list query layout and reset performs an unfiltered query', async () => {
    gateway.accessUsers = vi.fn(async () => ({ items: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }));
    const { container } = render(<AccessUsersPage systemCode="demo-portal" canManage gateway={gateway} />);
    await waitFor(() => expect(gateway.accessUsers).toHaveBeenCalledTimes(1));
    expect(container.querySelector('.enterprise-card.record-query-bar .record-query-actions')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('搜索'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(gateway.accessUsers).toHaveBeenLastCalledWith('demo-portal', expect.objectContaining({})));
    expect((gateway.accessUsers as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1].get('keyword')).toBe('alice');

    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    await waitFor(() => expect((gateway.accessUsers as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1].get('keyword')).toBeNull());
  });

  it('clears the applied keyword when role management is reset', async () => {
    gateway.accessRoles = vi.fn(async () => ({ items: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }));
    render(<AccessRolesPage systemCode="demo-portal" canManage gateway={gateway} />);
    await waitFor(() => expect(gateway.accessRoles).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('搜索'), { target: { value: 'sales' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect((gateway.accessRoles as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1].get('keyword')).toBe('sales'));
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    await waitFor(() => expect((gateway.accessRoles as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1].get('keyword')).toBeNull());
  });
});
