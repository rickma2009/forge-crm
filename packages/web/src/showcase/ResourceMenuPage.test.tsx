import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { ResourceMenuPage } from './ResourceMenuPage';
import type { EnterpriseGateway } from './gateway';

const pages = [
  { id: '11111111-1111-4111-8111-111111111111', parentId: null, pageCode: 'demo-portal', pageName: '演示门户', pageType: 'SYSTEM' as const, routePath: null, iconKey: 'portal', permissionMode: 'RESTRICTED' as const, status: 'ACTIVE' as const, autoAddMenu: false, viewConfigEnabled: false, groupManageEnabled: false, dataPermissionEnabled: false, sortNo: 10, remark: null, version: 1, createdAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z' },
  { id: '22222222-2222-4222-8222-222222222222', parentId: '11111111-1111-4111-8111-111111111111', pageCode: 'system', pageName: '系统管理', pageType: 'MODULE' as const, routePath: null, iconKey: 'settings', permissionMode: 'RESTRICTED' as const, status: 'ACTIVE' as const, autoAddMenu: true, viewConfigEnabled: false, groupManageEnabled: false, dataPermissionEnabled: false, sortNo: 10, remark: null, version: 1, createdAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z' },
  { id: '33333333-3333-4333-8333-333333333333', parentId: '11111111-1111-4111-8111-111111111111', pageCode: 'obsolete-page', pageName: '停用页面', pageType: 'PAGE' as const, routePath: '/obsolete', iconKey: 'page', permissionMode: 'RESTRICTED' as const, status: 'DISABLED' as const, autoAddMenu: false, viewConfigEnabled: false, groupManageEnabled: false, dataPermissionEnabled: false, sortNo: 20, remark: null, version: 1, createdAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z' },
];

const gateway = {
  resourceMenuPages: vi.fn(async () => pages),
  resourceMenuButtons: vi.fn(async () => ({ tool: [], line: [] })),
  resourceMenuTabs: vi.fn(async () => []),
  resourceMenuMounts: vi.fn(async () => []),
} as unknown as EnterpriseGateway;

describe('ResourceMenuPage', () => {
  it('displays rejected resource saves inside the page editor', async () => {
    render(<ResourceMenuPage systemCode="demo-portal" canManage canExport gateway={{ ...gateway, createResourceMenuPage: vi.fn().mockRejectedValue(new Error('页面编码重复')) }} />);
    fireEvent.contextMenu(within(await screen.findByRole('tree')).getByText('系统管理'));
    fireEvent.click(screen.getByRole('menuitem', { name: '新建子节点' }));
    const dialog = screen.getByRole('dialog', { name: '新建页面资源' });
    fireEvent.change(within(dialog).getByLabelText('页面名称'), { target: { value: '待保存页面' } });
    fireEvent.submit(dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('页面编码重复');
    expect(within(dialog).getByLabelText('页面名称')).toHaveValue('待保存页面');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
  it('shows only active resources below the hidden system root without technical tree labels or ids', async () => {
    render(<ResourceMenuPage systemCode="demo-portal" canManage canExport gateway={gateway} />);
    const tree = await screen.findByRole('tree');
    expect(within(tree).getByText('系统管理')).toBeInTheDocument();
    expect(within(tree).queryByText('演示门户')).not.toBeInTheDocument();
    expect(within(tree).queryByText('停用页面')).not.toBeInTheDocument();
    expect(within(tree).queryByText('MOD')).not.toBeInTheDocument();
    expect(within(tree).queryByText('system')).not.toBeInTheDocument();
    expect(screen.queryByText('ID', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('22222222-2222-4222-8222-222222222222')).not.toBeInTheDocument();
  });

  it('offers the source-compatible context operations and opens a child editor', async () => {
    render(<ResourceMenuPage systemCode="demo-portal" canManage canExport gateway={gateway} />);
    const node = within(await screen.findByRole('tree')).getByText('系统管理');
    fireEvent.contextMenu(node);
    expect(screen.getByRole('menuitem', { name: '新建子节点' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '编辑' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '删除' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '新建子节点' }));
    expect(screen.getByRole('dialog', { name: '新建页面资源' })).toBeInTheDocument();
    expect(screen.getByLabelText('上级页面')).toHaveValue('22222222-2222-4222-8222-222222222222');
  });

  it('keeps write controls out of a read-only rendering', async () => {
    render(<ResourceMenuPage systemCode="demo-portal" canManage={false} canExport={false} gateway={gateway} />);
    const node = within(await screen.findByRole('tree')).getByText('系统管理');
    fireEvent.contextMenu(node);
    expect(screen.queryByRole('menuitem', { name: '删除' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新建页面资源' })).not.toBeInTheDocument();
  });
});
