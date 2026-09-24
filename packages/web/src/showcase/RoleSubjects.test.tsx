import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RoleSubjects } from './RoleSubjects';
import type { EnterpriseGateway } from './gateway';

describe('role subject bindings', () => {
  it('binds a selected group without creating a direct user grant', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const gateway = {
      roleSubjectCatalog: vi.fn(async () => ({ organizations: [], groups: [{ id: 'group-1', groupCode: 'sales', groupName: '销售组', status: 'ACTIVE', version: 1, memberCount: 2 }], admissionRule: '应用准入独立校验' })),
      roleSubjectBindings: vi.fn(async () => []),
      roleSubjectMembers: vi.fn(async () => []),
      bindRoleSubjects: vi.fn(async () => undefined),
      saveUserGroup: vi.fn(async () => undefined),
      batchRoleMembers: vi.fn(),
    } as unknown as EnterpriseGateway;
    render(<RoleSubjects systemCode="demo-portal" roleId="role-1" kind="group" editable gateway={gateway} />);
    await screen.findByRole('option', { name: /销售组/ });
    fireEvent.change(screen.getByLabelText('选择群组'), { target: { value: 'group-1' } });
    fireEvent.click(screen.getByRole('button', { name: '绑定群组' }));
    await waitFor(() => expect(gateway.bindRoleSubjects).toHaveBeenCalledWith('demo-portal', 'role-1', expect.objectContaining({ kind: 'group', subjectIds: ['group-1'], includeDescendants: false })));
    expect(gateway.batchRoleMembers).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: '停用群组' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '停用群组' }));
    await waitFor(() => expect(gateway.saveUserGroup).toHaveBeenCalledWith('demo-portal', {
      id: 'group-1', version: 1, groupCode: 'sales', groupName: '销售组', description: undefined, status: 'DISABLED',
    }));
  });
  it('does not expose binding writes to a reader', async () => {
    const gateway = { roleSubjectCatalog: vi.fn(async () => ({ organizations: [], groups: [], admissionRule: '' })), roleSubjectBindings: vi.fn(async () => []) } as unknown as EnterpriseGateway;
    render(<RoleSubjects systemCode="demo-portal" roleId="role-1" kind="organization" editable={false} gateway={gateway} />);
    await screen.findByText('暂无动态绑定');
    expect(screen.queryByRole('button', { name: '绑定组织' })).not.toBeInTheDocument();
  });
});
