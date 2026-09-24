import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { RoleManagementPage } from './RoleWorkspace';
import type { EnterpriseGateway } from './gateway';

const role = { id: '11111111-1111-4111-8111-111111111111', parentId: null, roleCode: 'sales', roleName: '销售业务', roleAbbrName: null, sortNo: 10, isEnabled: true, isSystem: false, description: null, effectiveDateBegin: null, effectiveDateEnd: null, status: 'ACTIVE', version: 1, children: [] };
const gateway = {
  roleTree: vi.fn(async () => [role]),
  accessRoleMembers: vi.fn(async () => []),
  roleViews: vi.fn(async () => ({ version: 1, items: [{ id: 'view-1', viewName: '客户默认视图', pageCode: 'customer-directory', actionCode: 'view', status: 'ACTIVE', config: { columns: [] }, assigned: false, grantable: true }] })),
  saveRoleViews: vi.fn(async () => undefined),
} as unknown as EnterpriseGateway;

describe('business role workspace', () => {
  it('opens the selected role with only the two requested tabs', async () => {
    render(<RoleManagementPage systemCode="demo-portal" allowedActions={['view', 'manage']} gateway={gateway} />);
    fireEvent.click(await screen.findByRole('button', { name: /选择角色 销售业务/ }));
    await screen.findByText('暂无角色成员');
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: '用户管理' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('sales')).toBeInTheDocument();
  });
  it('does not offer write actions to a read-only viewer', async () => {
    render(<RoleManagementPage systemCode="demo-portal" allowedActions={['view']} gateway={gateway} />);
    fireEvent.click(await screen.findByRole('button', { name: /选择角色 销售业务/ }));
    await screen.findByText('暂无角色成员');
    expect(screen.queryByRole('button', { name: '新建角色' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加管理对象' })).not.toBeInTheDocument();
  });
  it('does not expose deferred authorization tabs', async () => {
    render(<RoleManagementPage systemCode="demo-portal" allowedActions={['view', 'manage']} gateway={gateway} />);
    fireEvent.click(await screen.findByRole('button', { name: /选择角色 销售业务/ }));
    await screen.findByText('暂无角色成员');
    for (const name of ['管辖范围', '视图权限', '仪表盘权限', '组件权限', '分类权限']) expect(screen.queryByRole('tab', { name })).not.toBeInTheDocument();
  });
  it('collapses the panel and creates a child of the selected role', async () => {
    const api = { ...gateway, createRole: vi.fn(async () => ({ id: 'child' })) };
    render(<RoleManagementPage systemCode="demo-portal" allowedActions={['view', 'manage']} gateway={api} />);
    fireEvent.click(await screen.findByRole('button', { name: '选择角色 销售业务' }));
    fireEvent.click(screen.getByRole('button', { name: '折叠角色面板' }));
    expect(screen.queryByRole('button', { name: '选择角色 销售业务' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '销售业务' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开角色面板' }));
    fireEvent.click(screen.getByRole('button', { name: '销售业务操作' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '新建子角色' }));
    fireEvent.change(screen.getByLabelText(/角色编码/), { target: { value: 'sales-child' } });
    fireEvent.change(screen.getByLabelText(/角色名称/), { target: { value: '销售子角色' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(api.createRole).toHaveBeenCalledWith('demo-portal', expect.objectContaining({ parentId: role.id, roleCode: 'sales-child', roleName: '销售子角色' })));
  });
});
