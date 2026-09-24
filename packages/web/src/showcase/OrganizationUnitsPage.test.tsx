import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { organizationUnitWriteSchema } from '@interaction-pattern-lab/contracts';
import { vi } from 'vitest';
import { OrganizationUnitsPage } from './OrganizationUnitsPage';
import type { EnterpriseGateway } from './gateway';

const items = [
  { id: '11111111-1111-4111-8111-111111111111', parentId: null, unitCode: 'component-bg', unitName: '部件BG', unitType: 'COMPANY' as const, sortNo: 10, status: 'ACTIVE' as const, effectiveAt: '2026-01-01T00:00:00.000Z', expiresAt: null, remark: null, depth: 0, version: 1, updatedAt: '2026-09-22T00:00:00.000Z' },
  { id: '22222222-2222-4222-8222-222222222222', parentId: '11111111-1111-4111-8111-111111111111', unitCode: 'tv-division', unitName: 'TV事业部', unitType: 'DIVISION' as const, sortNo: 10, status: 'ACTIVE' as const, effectiveAt: '2026-01-01T00:00:00.000Z', expiresAt: null, remark: null, depth: 1, version: 1, updatedAt: '2026-09-22T00:00:00.000Z' },
];

const gateway = { organizationUnits: vi.fn(async () => ({ items })), createOrganizationUnit: vi.fn(), updateOrganizationUnit: vi.fn() } as unknown as EnterpriseGateway;

describe('OrganizationUnitsPage', () => {
  it('uses a valid modern HTML pattern for organization codes', async () => {
    render(<OrganizationUnitsPage systemCode="demo-portal" canManage gateway={gateway} />);
    await screen.findByText('TV事业部');
    fireEvent.click(screen.getByRole('button', { name: '＋ 新建下级' }));
    const pattern = screen.getByLabelText('组织编码').getAttribute('pattern')!;
    expect(() => new RegExp(pattern, 'v')).not.toThrow();
  });
  it.each([
    ['组织编码', 'HR_01', '组织编码仅支持'],
    ['组织名称', '   ', '请输入组织名称'],
    ['失效日期', '2026-01-01', '失效时间必须晚于生效时间'],
  ])('rejects invalid %s in the dialog before making a save request', async (field, value, message) => {
    const create = vi.fn(async (inputSystem, input) => organizationUnitWriteSchema.parse(input));
    render(<OrganizationUnitsPage systemCode="demo-portal" canManage gateway={{ ...gateway, createOrganizationUnit: create } as unknown as EnterpriseGateway} />);
    await screen.findByText('TV事业部');
    fireEvent.click(screen.getByRole('button', { name: '＋ 新建下级' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('组织编码'), { target: { value: 'sales.team' } });
    fireEvent.change(within(dialog).getByLabelText('组织名称'), { target: { value: '销售团队' } });
    fireEvent.change(within(dialog).getByLabelText('生效日期'), { target: { value: '2026-01-01' } });
    fireEvent.change(within(dialog).getByLabelText(field), { target: { value } });
    fireEvent.submit(dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message);
    expect(create).not.toHaveBeenCalled();
  });
  it('submits a valid contract, closes on success and refreshes the tree', async () => {
    const create = vi.fn(async (_system, input) => ({ ...items[0], ...organizationUnitWriteSchema.parse(input) }));
    const load = vi.fn(async () => ({ items }));
    render(<OrganizationUnitsPage systemCode="demo-portal" canManage gateway={{ ...gateway, organizationUnits: load, createOrganizationUnit: create }} />);
    await screen.findByText('TV事业部');
    fireEvent.click(screen.getByRole('button', { name: '＋ 新建下级' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('组织编码'), { target: { value: 'sales.team' } });
    fireEvent.change(within(dialog).getByLabelText('组织名称'), { target: { value: '销售团队' } });
    fireEvent.submit(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(create).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('keeps save errors inside the open dialog and preserves entered values', async () => {
    const rejectedGateway = { ...gateway, createOrganizationUnit: vi.fn().mockRejectedValue(new Error('请求参数无效')) };
    render(<OrganizationUnitsPage systemCode="demo-portal" canManage gateway={rejectedGateway} />);
    await screen.findByText('TV事业部');
    fireEvent.click(screen.getByRole('button', { name: '＋ 新建下级' }));
    const dialog = screen.getByRole('dialog', { name: '新增组织' });
    fireEvent.change(within(dialog).getByLabelText('组织编码'), { target: { value: 'sales.team' } });
    fireEvent.change(within(dialog).getByLabelText('组织名称'), { target: { value: '销售团队' } });
    fireEvent.submit(dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('请求参数无效');
    expect(within(dialog).getByLabelText('组织名称')).toHaveValue('销售团队');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(within(dialog).getByRole('button', { name: '保存' })).toBeEnabled();
  });
  it('renders a collapsible hierarchy and exposes add-child for managers', async () => {
    render(<OrganizationUnitsPage systemCode="demo-portal" canManage gateway={gateway} />);
    expect(await screen.findByText('TV事业部')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '收起 部件BG' }));
    expect(screen.queryByText('TV事业部')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开 部件BG' }));
    fireEvent.click(screen.getByRole('button', { name: '＋ 新建下级' }));
    expect(screen.getByRole('dialog', { name: '新增组织' })).toBeInTheDocument();
    expect(screen.getByLabelText('上级组织')).toHaveValue('11111111-1111-4111-8111-111111111111');
  });
});
