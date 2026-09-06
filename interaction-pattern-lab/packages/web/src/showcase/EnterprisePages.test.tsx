import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Customer, Dictionary, ListViewConfig, ResolvedListView } from '@interaction-pattern-lab/contracts';
import { CustomerDirectoryPage, DictionaryAdminPage } from './EnterprisePages';
import type { EnterpriseGateway } from './gateway';

const config: ListViewConfig = {
  columns: [
    ['customerCode', true, true, false, 110], ['customerName', true, true, false, 170], ['shortName', true, true, false, 110],
    ['categoryValue', true, true, false, 100], ['statusValue', true, true, false, 90], ['industryValue', true, true, true, 100],
    ['levelValue', true, true, true, 90], ['salesOwnerName', true, true, true, 100],
  ].map(([key, visible, queryVisible, queryCollapsed, width]) => ({ key: String(key), visible: Boolean(visible), queryVisible: Boolean(queryVisible), queryCollapsed: Boolean(queryCollapsed), width: Number(width), fixed: null })),
  pageSize: 20, filters: {}, sort: { field: 'updatedAt', direction: 'desc' },
};

const view: ResolvedListView = { viewKey: 'system:default', id: '00000000-0000-4000-8000-000000000001', scope: 'SYSTEM', viewCode: 'default', viewName: '客户默认视图', baseViewId: '00000000-0000-4000-8000-000000000001', isDefault: true, allowPersonalOverride: true, readOnly: true, config, version: 1 };
const customer: Customer = { id: '00000000-0000-4000-8000-000000000002', customerCode: 'C2026090001', customerName: '演示客户', shortName: '演示', categoryValue: 'direct', address: '广州', statusValue: 'active', industryValue: 'electronics', levelValue: 'a', salesOwnerKey: 's1', salesOwnerName: '销售甲', remark: null, version: 1, createdAt: '2026-09-04T00:00:00.000Z', updatedAt: '2026-09-04T00:00:00.000Z' };

function gateway(): EnterpriseGateway {
  return {
    session: async () => ({ account: 'admin', displayName: '系统管理员' }), login: async () => ({ account: 'admin', displayName: '系统管理员' }), logout: async () => undefined,
    navigation: async () => ({ systemCode: 'demo-portal', items: [], permissionVersion: 'a'.repeat(64) }), assertPage: async () => undefined, performResourceAction: async () => ({}),
    dictionaries: async () => [], createDictionary: async () => ({}), updateDictionary: async () => ({}), createDictionaryItem: async () => ({}), updateDictionaryItem: async () => ({}), importDictionaryItems: async (_systemCode, _dictionaryId, rows) => ({ imported: rows.length }),
    listViews: async () => ({ pageCode: 'customer-directory', actionCode: 'view', selectedViewKey: view.viewKey, views: [view] }), selectListView: async () => undefined, createPersonalListView: async () => undefined,
    customers: async () => ({ items: [customer], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }), customer: async () => customer, createCustomer: async () => customer, updateCustomer: async () => customer, salesOptions: async () => [{ key: 's1', name: '销售甲' }],
  };
}

describe('customer directory list workspace', () => {
  it('uses a compact query row, list view toolbar and semantic table columns', async () => {
    const user = userEvent.setup();
    const { container } = render(<CustomerDirectoryPage systemCode="demo-portal" allowedActions={['view', 'create', 'update']} gateway={gateway()} />);
    expect(await screen.findByRole('button', { name: '查看客户 C2026090001' })).toBeInTheDocument();
    expect(container.querySelector('.enterprise-title')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '客户列表' })).toHaveClass('sr-only');
    expect(screen.getByRole('combobox', { name: '当前列表视图' })).toHaveValue('system:default');
    expect(screen.getByRole('button', { name: '修改客户 C2026090001' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /更多（3）/ })).toHaveAttribute('aria-expanded', 'false');
    const headers = within(container.querySelector('thead')!).getAllByRole('columnheader');
    expect(headers.slice(0, 3).map((header) => header.textContent)).toEqual(['序号', '操作', '客户编码']);
    await user.click(screen.getByRole('button', { name: /更多（3）/ }));
    expect(screen.getByRole('combobox', { name: '所属行业' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '设置' }));
    expect(screen.getByRole('dialog', { name: '列与视图设置' })).toBeInTheDocument();
  });

  it('removes the update operation when the role has view permission only', async () => {
    render(<CustomerDirectoryPage systemCode="demo-portal" allowedActions={['view']} gateway={gateway()} />);
    expect(await screen.findByRole('button', { name: '查看客户 C2026090001' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '修改客户 C2026090001' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新增/ })).toBeDisabled();
  });
});

const dictionaryParent: Dictionary = { id: '00000000-0000-4000-8000-000000000010', dictCode: 'material_category', dictName: '物料类别', groupCode: 'material', parentId: null, description: '物料分类父级', sortNo: 100, status: 'ACTIVE', itemsEditable: true, version: 1, items: [] };
const dictionaryChild: Dictionary = { id: '00000000-0000-4000-8000-000000000011', dictCode: 'material_major_category', dictName: '物料大类', groupCode: 'material', parentId: dictionaryParent.id, description: '物料一级分类', sortNo: 110, status: 'ACTIVE', itemsEditable: true, version: 1, items: [{ id: '00000000-0000-4000-8000-000000000012', itemCode: 'raw_material', itemValue: 'raw_material', itemName: '原材料', colorKey: 'blue', description: null, sortNo: 10, status: 'ACTIVE', version: 1 }] };

describe('database-backed dictionary workspace', () => {
  it('renders a read-only dictionary hierarchy and value-maintenance fields', async () => {
    const user = userEvent.setup(); const api = gateway(); api.dictionaries = async () => [dictionaryParent, dictionaryChild];
    render(<DictionaryAdminPage systemCode="demo-portal" canManage gateway={api} />);
    expect((await screen.findAllByText('物料类别')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /物料大类/ }));
    expect(screen.getAllByText('material_major_category').length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: '数据字典值描述' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excel 导入' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Excel 导出' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /新增字典值/ }));
    expect(screen.getByRole('dialog', { name: '新增字典值' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新增字典类别/ })).not.toBeInTheDocument();
  });

  it('keeps descendants nested when their parent collapses and allows values on the parent level', async () => {
    const user = userEvent.setup(); const api = gateway(); api.dictionaries = async () => [dictionaryParent, dictionaryChild];
    render(<DictionaryAdminPage systemCode="demo-portal" canManage gateway={api} />);
    const parent = await screen.findByRole('button', { name: /物料类别/ });
    expect(parent).not.toHaveTextContent('material_category');
    expect(screen.getByRole('button', { name: /新增字典值/ })).toBeEnabled();
    await user.click(within(parent).getByText('⌄'));
    expect(screen.queryByRole('button', { name: /物料大类/ })).not.toBeInTheDocument();
  });

  it('exports the selected database result as an Excel workbook', async () => {
    const user = userEvent.setup(); const api = gateway(); api.dictionaries = async () => [dictionaryChild];
    const createObjectURL = vi.fn(() => 'blob:dictionary-export'); const revokeObjectURL = vi.fn(); let downloadName = '';
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureDownload(this: HTMLAnchorElement) { downloadName = this.download; });
    try {
      render(<DictionaryAdminPage systemCode="demo-portal" canManage={false} gateway={api} />);
      await user.click(await screen.findByRole('button', { name: 'Excel 导出' }));
      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
      expect(downloadName).toBe('物料大类-material_major_category-字典值.xlsx');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:dictionary-export');
    } finally {
      anchorClick.mockRestore(); vi.unstubAllGlobals();
    }
  });

  it('does not expose value write actions to viewer', async () => {
    const api = gateway(); api.dictionaries = async () => [dictionaryParent, dictionaryChild];
    render(<DictionaryAdminPage systemCode="demo-portal" canManage={false} gateway={api} />);
    expect((await screen.findAllByText('物料类别')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Excel 导出' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Excel 导入' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新增字典值/ })).not.toBeInTheDocument();
  });
});
