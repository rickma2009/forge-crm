import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Customer, CustomerUpdate, CustomerAddress, CustomerAddressUpdate, Dictionary } from '@forge-crm/contracts';
import { CustomerDetailPage } from './EnterprisePages';
import type { EnterpriseGateway } from './gateway';

const customer: Customer = { id: '00000000-0000-4000-8000-000000000002', customerCode: 'C2026090001', customerName: '客户甲有限公司', shortName: '客户甲', categoryValue: 'direct', address: '广州', statusValue: 'active', industryValue: null, levelValue: null, salesOwnerKey: 's1', salesOwnerName: '销售甲', remark: null, version: 1, createdAt: '2026-09-04T00:00:00.000Z', updatedAt: '2026-09-04T00:00:00.000Z' };
function fixture() {
  let saved = { ...customer };
  const api = {
    customerDetail: vi.fn(async () => ({ customer: saved, contacts: [], addresses: [] })),
    dictionaries: async () => [{ dictCode: 'contact_project_role', status: 'ACTIVE', items: [{ itemValue: 'technical_selector', itemName: '技术选型人', status: 'ACTIVE' }] }] as Dictionary[], salesOptions: async () => [{ key: 's1', name: '销售甲' }],
    updateCustomer: vi.fn(async (_system: string, _id: string, input: CustomerUpdate) => { saved = { ...saved, ...input, version: saved.version + 1 }; return saved; }),
    createContact: vi.fn(async () => { throw new Error('offline'); }),
  } as unknown as EnterpriseGateway;
  return api;
}

describe('customer detail page', () => {
  it('keeps the basic customer tabs and adds the overview without unauthorized relation tabs', async () => {
    const legacyProps = { quotationActions: ['view'] };
    render(<CustomerDetailPage {...legacyProps} systemCode="demo-portal" customerId={customer.id} allowedActions={['view', 'update']} gateway={fixture()} onBack={() => {}} />);
    await screen.findByLabelText('客户名称');
    expect(screen.queryByRole('button', { name: /关联报价/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['客户基本信息', '概览', '活动时间轴', '联系人 (0)', '地址 (0)']);
  });
  it('displays the dictionary label in the contact grid and keeps the stored code in the editor', async () => {
    const api = fixture(); const user = userEvent.setup();
    api.customerDetail = async () => ({ customer, addresses: [], contacts: [{ id: '00000000-0000-4000-8000-000000000003', customerId: customer.id, name: '张三', department: null, position: null, decisionRole: 'technical_selector', mobile: null, phone: null, email: null, status: 'ACTIVE', remark: null, sortNo: 0, version: 1, updatedAt: '2026-09-22T00:00:00.000Z' }] });
    render(<CustomerDetailPage systemCode="demo-portal" customerId={customer.id} allowedActions={['view', 'update']} gateway={api} onBack={() => {}} />);
    await user.click(await screen.findByRole('tab', { name: /联系人/ }));
    expect(within(await screen.findByRole('grid', { name: '客户联系人' })).getByRole('gridcell', { name: '技术选型人' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '修改联系人 张三' }));
    const dialog = screen.getByRole('dialog', { name: '修改联系人' });
    expect(within(dialog).getByRole('combobox', { name: '项目角色' })).toHaveValue('technical_selector');
    expect(within(dialog).queryByLabelText('所属客户 ID')).not.toBeInTheDocument();
  });
  it('shows concise summary labels without a redundant form heading and keeps back navigation', async () => {
    const onBack = vi.fn(); const user = userEvent.setup();
    render(<CustomerDetailPage systemCode="demo-portal" customerId={customer.id} allowedActions={['view']} gateway={fixture()} onBack={onBack} />);
    await screen.findByLabelText('客户名称');
    expect(screen.getByText('客户编码：', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(`客户名称：${customer.customerName}`)).toBeInTheDocument();
    expect(screen.getByText(`负责人：${customer.salesOwnerName}`)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /客户档案/ })).not.toBeInTheDocument();
    expect(screen.queryByText('基本信息', { exact: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回客户列表' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
  it('returns to the basic tab when saving invalid hidden basic fields', async () => {
    const api = fixture(); const user = userEvent.setup();
    render(<CustomerDetailPage systemCode="demo-portal" customerId={customer.id} allowedActions={['view', 'update']} gateway={api} onBack={() => {}} />);
    await user.click(await screen.findByRole('button', { name: '编辑客户' }));
    await user.clear(screen.getByLabelText('客户名称'));
    await user.click(screen.getByRole('tab', { name: /联系人/ }));
    await user.click(screen.getByRole('button', { name: '保存客户' }));
    expect(screen.getByRole('tab', { name: '客户基本信息' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('请检查必填项');
    expect(api.updateCustomer).not.toHaveBeenCalled();
  });
  it('updates an existing address without resetting its status, sort order or version', async () => {
    const api = fixture(); const user = userEvent.setup();
    const address: CustomerAddress = { id: '00000000-0000-4000-8000-000000000005', customerId: customer.id, addressType: 'SHIPPING', recipient: '李四', phone: '02012345678', province: '广东', city: '广州', district: '天河', detail: '测试路 10 号', isDefault: false, status: 'INACTIVE', remark: '暂停使用', sortNo: 7, version: 3, updatedAt: '2026-09-21T00:00:00.000Z' };
    api.customerDetail = async () => ({ customer, contacts: [], addresses: [address] });
    api.updateAddress = vi.fn(async (_system: string, _customer: string, _id: string, input: CustomerAddressUpdate) => ({ ...address, ...input, version: 4 } as CustomerAddress));
    render(<CustomerDetailPage systemCode="demo-portal" customerId={customer.id} allowedActions={['view', 'update']} gateway={api} onBack={() => {}} />);
    await user.click(await screen.findByRole('tab', { name: /地址/ }));
    await user.click(screen.getByRole('button', { name: '修改地址 测试路 10 号' }));
    const dialog = screen.getByRole('dialog', { name: '修改地址' });
    expect(within(dialog).getByLabelText('状态')).toHaveValue('INACTIVE');
    await user.clear(within(dialog).getByLabelText('详细地址'));
    await user.type(within(dialog).getByLabelText('详细地址'), '测试路 11 号');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    await waitFor(() => expect(api.updateAddress).toHaveBeenCalledWith('demo-portal', customer.id, address.id, expect.objectContaining({ detail: '测试路 11 号', status: 'INACTIVE', sortNo: 7, version: 3 })));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('views read-only then edits and persists basic information with version', async () => {
    const api = fixture(); const user = userEvent.setup();
    render(<CustomerDetailPage systemCode="demo-portal" customerId={customer.id} allowedActions={['view', 'update']} gateway={api} onBack={() => {}} />);
    expect(await screen.findByLabelText('客户名称')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '编辑客户' }));
    await user.clear(screen.getByLabelText('客户简称'));
    await user.type(screen.getByLabelText('客户简称'), '修改后简称');
    await user.click(screen.getByRole('tab', { name: /联系人/ }));
    await user.click(screen.getByRole('tab', { name: '客户基本信息' }));
    expect(screen.getByLabelText('客户简称')).toHaveValue('修改后简称');
    await user.click(screen.getByRole('button', { name: '保存客户' }));
    await waitFor(() => expect(api.updateCustomer).toHaveBeenCalledWith('demo-portal', customer.id, expect.objectContaining({ shortName: '修改后简称', version: 1 })));
    expect(await screen.findByRole('heading', { name: '修改后简称' })).toBeInTheDocument();
  });

  it('renders contacts as a table and preserves the editor on save failure', async () => {
    const api = fixture(); const user = userEvent.setup();
    render(<CustomerDetailPage systemCode="demo-portal" customerId={customer.id} allowedActions={['view', 'update']} gateway={api} onBack={() => {}} />);
    await user.click(await screen.findByRole('tab', { name: /联系人/ }));
    const table = await screen.findByRole('grid', { name: '客户联系人' });
    expect(within(table).getByRole('columnheader', { name: '项目角色' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新增联系人' }));
    const dialog = screen.getByRole('dialog', { name: '新增联系人' });
    expect(within(dialog).queryByLabelText('所属客户 ID')).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByRole('combobox', { name: '项目角色' }), 'technical_selector');
    await user.type(within(dialog).getByLabelText('联系人姓名'), '张三');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('操作失败');
    expect(within(dialog).getByLabelText('联系人姓名')).toHaveValue('张三');
    expect(api.createContact).toHaveBeenCalledWith('demo-portal', customer.id, expect.objectContaining({ decisionRole: 'technical_selector' }));
  });

  it('does not offer writes to a read-only user', async () => {
    const user = userEvent.setup();
    render(<CustomerDetailPage systemCode="demo-portal" customerId={customer.id} allowedActions={['view']} gateway={fixture()} onBack={() => {}} />);
    await screen.findByLabelText('客户名称');
    expect(screen.queryByRole('button', { name: '编辑客户' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /联系人/ }));
    expect(screen.queryByRole('button', { name: '新增联系人' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /地址/ }));
    expect(screen.queryByRole('button', { name: '新增地址' })).not.toBeInTheDocument();
  });
});
