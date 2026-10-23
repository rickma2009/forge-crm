import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WarehousePage } from './InventoryPages';
import type { EnterpriseGateway } from './gateway';
const id = '11111111-1111-4111-8111-111111111111';
const row = { id, warehouseCode: 'W01', warehouseName: '现有仓', legalEntityId: id, legalEntityName: '法人甲', warehouseType: 'SAMPLE', warehouseNature: 'OWNED', warehouseTypeName: '样品仓', warehouseNatureName: '自有仓', status: 'ACTIVE', version: 3, sortNo: 10, remark: null };
function setup(legacy = false) {
  const dictionaries = vi.fn().mockResolvedValue([
    { dictCode: 'warehouse_type', status: 'ACTIVE', items: [{ id: 'type', itemValue: 'SAMPLE', itemName: '样品仓', status: 'ACTIVE' }, { id: 'custom', itemValue: 'custom', itemName: '自定义仓', status: 'ACTIVE' }, { id: 'disabled', itemValue: 'SCRAP', itemName: '报废仓', status: 'DISABLED' }] },
    { dictCode: 'warehouse_nature', status: 'ACTIVE', items: [{ id: 'nature', itemValue: 'OWNED', itemName: '自有仓', status: 'ACTIVE' }] },
  ]);
  const api = { dictionaries, warehouses: vi.fn().mockResolvedValue({ items: [legacy ? { ...row, warehouseNature: 'PHYSICAL', warehouseNatureName: '实体仓（已停用）' } : row] }), legalEntities: vi.fn().mockResolvedValue({ items: [{ id, entityName: '法人甲' }] }), createWarehouse: vi.fn().mockResolvedValue(row), updateWarehouse: vi.fn().mockResolvedValue(row) };
  return { api, gateway: api as unknown as EnterpriseGateway };
}
describe('warehouse dictionary fields', () => {
  it('shows names and creates using dynamic dictionary values without dictionary-management permission', async () => {
    const { api, gateway } = setup(); render(<WarehousePage systemCode="demo-portal" allowedActions={['manage']} gateway={gateway} />);
    expect(await screen.findByText('自有仓')).toBeInTheDocument(); expect(api.dictionaries).toHaveBeenCalledWith('demo-portal');
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    const type = screen.getByRole('combobox', { name: '仓库类型' });
    expect(within(type).queryByRole('option', { name: '报废仓' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('仓库代码'), { target: { value: 'NEW' } }); fireEvent.change(screen.getByLabelText('仓库名称'), { target: { value: '新仓' } });
    fireEvent.change(type, { target: { value: 'custom' } }); fireEvent.change(screen.getByLabelText('仓库性质'), { target: { value: 'OWNED' } }); fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(api.createWarehouse).toHaveBeenCalledWith('demo-portal', expect.objectContaining({ warehouseType: 'custom', warehouseNature: 'OWNED' })));
  });
  it('preserves historical classification and submits only writable fields with version', async () => {
    const { api, gateway } = setup(true); render(<WarehousePage systemCode="demo-portal" allowedActions={['manage']} gateway={gateway} />);
    fireEvent.click(await screen.findByRole('button', { name: '修改仓库 W01' }));
    expect(screen.getByRole('option', { name: '实体仓（已停用）' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('仓库名称'), { target: { value: '修改名称' } }); fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(api.updateWarehouse).toHaveBeenCalled());
    const payload = api.updateWarehouse.mock.calls[0][2]; expect(payload).toMatchObject({ warehouseNature: 'PHYSICAL', warehouseName: '修改名称', version: 3 }); expect(payload).not.toHaveProperty('warehouseCode'); expect(payload).not.toHaveProperty('id'); expect(payload).not.toHaveProperty('warehouseNatureName');
  });
  it('fails closed on dictionary load errors and permits retry', async () => {
    const { api, gateway } = setup(); api.dictionaries.mockRejectedValueOnce(new Error('字典加载失败'));
    render(<WarehousePage systemCode="demo-portal" allowedActions={['manage']} gateway={gateway} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('字典加载失败'); expect(screen.getByRole('button', { name: '新增' })).toBeDisabled(); fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '新增' })).toBeEnabled());
  });
  it('prevents creation when dictionaries have no active options and hides writes for readers', async () => {
    const { api, gateway } = setup(); api.dictionaries.mockResolvedValue([]); render(<WarehousePage systemCode="demo-portal" allowedActions={[]} gateway={gateway} />);
    expect(await screen.findByText('仓库类型或仓库性质暂无可用字典值，请先维护数据字典。')).toHaveAttribute('role', 'status'); expect(screen.queryByRole('button', { name: '新增' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: '修改仓库 W01' })).not.toBeInTheDocument();
  });
});
