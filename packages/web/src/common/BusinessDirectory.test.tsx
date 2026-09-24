import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { businessListDefaultConfig, type ResolvedListView } from '@forge-crm/contracts';
import { BusinessDirectory } from './BusinessDirectory';

const base: ResolvedListView = { id: '11111111-1111-4111-8111-111111111111', baseViewId: '11111111-1111-4111-8111-111111111111', viewKey: 'system:base', viewCode: 'object-default', scope: 'SYSTEM', viewName: '产品默认视图', isDefault: true, allowPersonalOverride: true, readOnly: true, config: businessListDefaultConfig('product-directory'), version: 1 };
function setup() {
  let views = [base], selectedViewKey = base.viewKey;
  const gateway = {
    listViews: vi.fn(async () => ({ pageCode: 'product-directory', actionCode: 'view', selectedViewKey, views })),
    selectListView: vi.fn(async (_system: string, key: string) => { selectedViewKey = key; }),
    createPersonalListView: vi.fn(async (_system: string, input: { viewName: string; config: typeof base.config }) => {
      const personal = { ...base, ...input, id: '22222222-2222-4222-8222-222222222222', viewKey: 'user:mine', scope: 'USER' as const, readOnly: false };
      views = [base, personal]; selectedViewKey = personal.viewKey;
    }),
  };
  const loadRows = vi.fn(async () => ({ items: [{ id: 'record', productCode: 'P001' }], pagination: { total: 1 } }));
  const element = <BusinessDirectory objectCode="product-directory" systemCode="demo" gateway={gateway} loadRows={loadRows} rowKey={(row) => row.id} render={(row, key) => key === 'productCode' ? row.productCode : '测试'} />;
  return { gateway, loadRows, element };
}
describe('persistent business object views', () => {
  it('loads the object default and keeps read-only lists free of empty action columns', async () => {
    const { element, gateway, loadRows } = setup(); render(element);
    await screen.findByText('P001');
    expect(gateway.listViews).toHaveBeenCalledWith('demo', 'product-directory');
    expect(screen.queryByRole('columnheader', { name: '操作' })).not.toBeInTheDocument();
    expect(loadRows).toHaveBeenCalledWith('demo', expect.any(URLSearchParams));
  });
  it('applies saved columns and page size and restores the personal reference after re-entry', async () => {
    const user = userEvent.setup(); const { element, gateway, loadRows } = setup(); const page = render(element);
    await screen.findByText('P001'); await user.click(screen.getByRole('button', { name: '设置' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('checkbox', { name: '产品编码' })).toBeDisabled();
    await user.click(dialog.getByRole('checkbox', { name: '型号' }));
    await user.selectOptions(dialog.getByRole('combobox', { name: '每页条数' }), '50');
    await user.click(dialog.getByRole('button', { name: '保存并使用个人视图' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('combobox', { name: '当前列表视图' })).toHaveValue('user:mine'));
    expect(screen.queryByRole('columnheader', { name: '型号' })).not.toBeInTheDocument();
    expect(gateway.createPersonalListView).toHaveBeenCalledWith('demo', expect.objectContaining({ isDefault: true }), 'product-directory');
    page.unmount(); render(element); await screen.findByText('P001');
    expect(screen.getByRole('combobox', { name: '当前列表视图' })).toHaveValue('user:mine');
    const calls = loadRows.mock.calls as unknown as Array<[string, URLSearchParams]>;
    expect(calls.at(-1)?.[1].get('pageSize')).toBe('50');
  });
  it('fails closed without views and retains the previous view when selection fails', async () => {
    const { element, gateway, loadRows } = setup(); gateway.listViews.mockRejectedValue(new Error('未配置默认视图'));
    render(element); expect(await screen.findByRole('alert')).toHaveTextContent('未配置默认视图');
    expect(loadRows).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: '设置' })).toBeDisabled();
  });
});
