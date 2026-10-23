import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { EmployeeDirectoryPage } from './EmployeeDirectoryPage';
import type { EnterpriseGateway } from './gateway';

const gateway = { employees: vi.fn(async () => ({ items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } })), employeeOptions: vi.fn(async () => ({ organizations: [{ id: '11111111-1111-4111-8111-111111111111', parentId: null, unitName: '部件BG', depth: 0 }], positions: [{ id: '22222222-2222-4222-8222-222222222222', positionCode: 'manager', positionName: '经理' }], posts: [{ value: 'manager', name: '经理岗位' }], jobTitles: [{ value: 'MANAGER', name: '经理职位' }] })), createEmployee: vi.fn() } as unknown as EnterpriseGateway;

describe('EmployeeDirectoryPage', () => {
  it('displays rejected employee saves inside the employee dialog', async () => {
    render(<EmployeeDirectoryPage systemCode="demo-portal" canManage gateway={{ ...gateway, createEmployee: vi.fn().mockRejectedValue(new Error('员工编码重复')) }} />);
    fireEvent.click(await screen.findByRole('button', { name: '＋ 新增员工' }));
    const dialog = screen.getByRole('dialog', { name: '新增员工' });
    fireEvent.change(within(dialog).getByLabelText('员工姓名'), { target: { value: '待保存员工' } });
    fireEvent.submit(dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('员工编码重复');
    expect(within(dialog).getByLabelText('员工姓名')).toHaveValue('待保存员工');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
  it('opens create modal and requires an organization', async () => {
    render(<EmployeeDirectoryPage systemCode="demo-portal" canManage gateway={gateway} />);
    fireEvent.click(await screen.findByRole('button', { name: '＋ 新增员工' }));
    const dialog = screen.getByRole('dialog', { name: '新增员工' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText('所属部门')).toBeRequired();
    expect(within(dialog).getByLabelText('岗位')).toBeRequired();
    expect(within(dialog).getByLabelText('职位')).toBeRequired();
    expect(await within(dialog).findByRole('option', { name: '经理岗位' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '经理职位' })).toBeInTheDocument();
  });
});
