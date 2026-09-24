import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RoleUserPanel } from './RoleUserPanel';
import type { EnterpriseGateway, AccessRoleMember } from './gateway';
import type { RoleTreeNode } from '@interaction-pattern-lab/contracts';

const role = { id: 'sales', roleName: '销售' } as RoleTreeNode;
const member = (n: number): AccessRoleMember => ({ id: 'membership-' + n, userId: 'user-' + n, version: 1, status: 'ACTIVE', effectiveAt: '2020-01-01T00:00:00Z', expiresAt: null, user: { account: 'account' + n, displayName: '用户' + n, status: 'ACTIVE' } });
describe('role user management', () => {
  it('paginates current members and batch-removes selected users without showing ended history', async () => {
    let rows = [...Array.from({ length: 21 }, (_, i) => member(i)), { ...member(99), status: 'DISABLED' as const }];
    const gateway = { accessRoleMembers: vi.fn(async () => rows), batchRoleMembers: vi.fn(async (_s, _r, input) => { rows = rows.filter((r) => !input.members.some((m: { id: string }) => m.id === r.id)); }) } as unknown as EnterpriseGateway;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RoleUserPanel systemCode="demo-portal" role={role} canManage gateway={gateway} />);
    await screen.findByText('用户0');
    expect(screen.queryByText('用户99')).not.toBeInTheDocument();
    expect(screen.queryByText('用户20')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.getByText('用户20')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: '选择本页全部用户' }));
    fireEvent.click(screen.getByRole('button', { name: /批量移除/ }));
    await screen.findByText('已移除 1 个用户的角色授权');
    expect(gateway.batchRoleMembers).toHaveBeenCalledWith('demo-portal', 'sales', { action: 'end', members: [{ id: 'membership-20', version: 1 }] });
    expect(screen.queryByText('用户20')).not.toBeInTheDocument();
    expect(screen.getByText('用户0')).toBeInTheDocument();
  });
  it('adds users from a paginated picker and prevents duplicate selections', async () => {
    let rows = [member(1)];
    const gateway = { accessRoleMembers: vi.fn(async () => rows), accessUsers: vi.fn(async () => ({ items: [{ id: 'user-1', account: 'account1', displayName: '用户1' }, { id: 'user-2', account: 'account2', displayName: '用户2' }], pagination: { total: 2 } })), batchRoleMembers: vi.fn(async () => { rows = [...rows, member(2)]; }) } as unknown as EnterpriseGateway;
    render(<RoleUserPanel systemCode="demo-portal" role={role} canManage gateway={gateway} />);
    await screen.findByText('用户1'); fireEvent.click(screen.getByRole('button', { name: '添加管理对象' }));
    const dialog = within(screen.getByRole('dialog', { name: '添加管理对象' }));
    expect(await dialog.findByRole('checkbox', { name: '添加用户 用户1' })).toBeDisabled();
    fireEvent.click(dialog.getByRole('checkbox', { name: '添加用户 用户2' }));
    fireEvent.click(dialog.getByRole('button', { name: '确认添加（1）' }));
    await screen.findByText('角色用户添加成功');
    expect(gateway.batchRoleMembers).toHaveBeenCalledWith('demo-portal', 'sales', expect.objectContaining({ action: 'add', userIds: ['user-2'], expiresAt: null }));
    expect(screen.getByText('用户2')).toBeInTheDocument();
  });
  it('keeps the current data and shows a rejected removal error', async () => {
    const gateway = { accessRoleMembers: vi.fn(async () => [member(1)]), batchRoleMembers: vi.fn(async () => { throw new Error('角色已被其他人修改'); }) } as unknown as EnterpriseGateway;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RoleUserPanel systemCode="demo-portal" role={role} canManage gateway={gateway} />);
    fireEvent.click(await screen.findByRole('button', { name: '移除' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('角色已被其他人修改'));
    expect(screen.getByText('用户1')).toBeInTheDocument();
  });
});
