import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RolePermissionTree } from './RolePermissionTree';
import type { EnterpriseGateway } from './gateway';
import type { RoleTreeNode } from '@interaction-pattern-lab/contracts';

const role = { id: 'role', roleName: '销售', version: 1, isSystem: false } as RoleTreeNode;
const p = (id: string, name: string) => ({ id, permissionName: name, permissionCode: id, resourceCode: 'customer', actionCode: id, status: 'ACTIVE', source: 'MENU_ACTION' });
const catalog = { pages: [
  { id: 'system', parentId: null, pageName: 'CRM 工作台', pageCode: 'crm', pageType: 'SYSTEM', permissionIds: [], actions: [] },
  { id: 'module', parentId: 'system', pageName: '客户关系', pageCode: 'sales', pageType: 'MODULE', permissionIds: [], actions: [] },
  { id: 'customer', parentId: 'module', pageName: '客户管理', pageCode: 'customer', pageType: 'PAGE', permissionIds: ['view'], actions: [{ id: 'create', label: '新增客户', permissionIds: ['create'] }, { id: 'export', label: '导出客户', permissionIds: ['export'] }] },
], permissions: [p('view', '查看客户'), p('create', '新增客户'), p('export', '导出客户')], grantablePermissionIds: ['view', 'create'] };
const setup = (save = vi.fn(async () => undefined)) => {
  const gateway = { rolePermissionCatalog: vi.fn(async () => catalog), accessRolePermissions: vi.fn(async () => ({ permissionIds: ['view', 'legacy-hidden'], roleVersion: 7 })), replaceAccessRolePermissions: save } as unknown as EnterpriseGateway;
  render(<RolePermissionTree systemCode="demo-portal" role={role} canManage gateway={gateway} onDirty={vi.fn()} onSaved={vi.fn(async () => undefined)} />);
  return gateway;
};
describe('role resource permission tree', () => {
  it('renders hierarchy, expands actions, saves changes without dropping unknown grants', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const gateway = setup();
    expect(await screen.findByRole('checkbox', { name: '选择资源 客户管理' })).toBePartiallyChecked();
    fireEvent.click(screen.getByRole('button', { name: '展开 客户管理' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '权限 新增客户' }));
    expect(screen.getByRole('checkbox', { name: '权限 导出客户' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(gateway.replaceAccessRolePermissions).toHaveBeenCalledWith('demo-portal', 'role', { roleVersion: 7, permissionIds: ['view', 'legacy-hidden', 'create'] }));
  });
  it('collapses the hierarchy and leaves data policies unchanged', async () => {
    const gateway = setup();
    await screen.findByRole('checkbox', { name: '选择资源 客户管理' });
    fireEvent.click(screen.getByRole('button', { name: '数据权限' }));
    expect(screen.getByRole('dialog', { name: '数据权限 · 客户管理' })).toHaveTextContent('后续阶段设置');
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    fireEvent.click(screen.getByRole('button', { name: '全部收起' }));
    expect(screen.queryByRole('checkbox', { name: '选择资源 客户管理' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '全部展开' }));
    expect(screen.getByRole('checkbox', { name: '权限 新增客户' })).toBeInTheDocument();
    expect(gateway.replaceAccessRolePermissions).not.toHaveBeenCalled();
  });
  it('retains the draft and reports a concurrent save rejection', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    setup(vi.fn(async () => { throw new Error('角色权限已被其他人修改'); }));
    fireEvent.click(await screen.findByRole('button', { name: '展开 客户管理' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '权限 新增客户' }));
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('角色权限已被其他人修改'));
    expect(screen.getByRole('checkbox', { name: '权限 新增客户' })).toBeChecked();
  });
});
