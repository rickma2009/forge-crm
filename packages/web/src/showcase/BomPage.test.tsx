import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BomDetail } from '@forge-crm/contracts';
import { BomPage } from './BomPage';
import { bomApi } from './bom-api';
import type { EnterpriseGateway } from './gateway';

vi.mock('./bom-api', () => ({ bomApi: { detail: vi.fn(), list: vi.fn(), create: vi.fn(), save: vi.fn(), publish: vi.fn(), draft: vi.fn(), preview: vi.fn() } }));

const detail: BomDetail = {
  id: '11111111-1111-4111-8111-111111111111', itemId: '22222222-2222-4222-8222-222222222222', itemCode: 'BOM-DEMO-SCREEN', itemName: '演示·会议交互大屏', itemType: 'PRODUCT', bomCode: 'BOM-BOM-DEMO-SCREEN', revision: 1, status: 'PUBLISHED', isCurrent: true, baseQuantity: '1.0000', baseUnit: '件', lineCount: 1, rowVersion: 2, updatedAt: '2026-10-01T00:00:00.000Z', lines: [{ id: '33333333-3333-4333-8333-333333333333', bomId: '11111111-1111-4111-8111-111111111111', lineCode: 'L010', itemId: '44444444-4444-4444-8444-444444444444', itemCode: 'BOM-DEMO-BOARD', itemName: '演示·智能控制板卡', itemType: 'SEMI_FINISHED', quantity: '2.0000', baseUnit: '件', sortNo: 10, childBomId: '55555555-5555-4555-8555-555555555555', childBomRevision: 1, cumulativeQuantity: '2.0000', alternatives: [], children: [{ id: '66666666-6666-4666-8666-666666666666', bomId: '55555555-5555-4555-8555-555555555555', lineCode: 'L010', itemId: '77777777-7777-4777-8777-777777777777', itemCode: 'BOM-DEMO-CHIP', itemName: '演示·主控芯片', itemType: 'MATERIAL', quantity: '2.0000', baseUnit: '件', sortNo: 10, childBomId: null, childBomRevision: null, cumulativeQuantity: '4.0000', alternatives: [{ id: '88888888-8888-4888-8888-888888888888', itemId: '99999999-9999-4999-8999-999999999999', itemCode: 'BOM-DEMO-CHIP-ALT', itemName: '演示·替代芯片', baseUnit: '件', priority: 1, ratio: '1.0000' }], children: [] }] }],
};

describe('BOM detail interaction', () => {
  beforeEach(() => { vi.mocked(bomApi.detail).mockResolvedValue(detail); });
  it('starts read-only, expands the pinned child BOM and opens a detail drawer', async () => {
    render(<BomPage systemCode="demo-portal" bomId={detail.id} allowedActions={['view', 'edit']} gateway={{} as EnterpriseGateway} />);
    await screen.findByText('演示·会议交互大屏');
    expect(screen.queryByRole('button', { name: '添加组件' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: /BOM-DEMO-BOARD/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /BOM-DEMO-CHIP/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /BOM-DEMO-CHIP/ }));
    expect(screen.getByRole('dialog', { name: '演示·主控芯片' })).toBeTruthy();
    expect(screen.getByText(/BOM-DEMO-CHIP-ALT/)).toBeTruthy();
  });
  it('edits a draft only after switching mode and saves the current form values', async () => {
    const draft = { ...detail, status: 'DRAFT' as const, isCurrent: false };
    vi.mocked(bomApi.detail).mockResolvedValue(draft);
    vi.mocked(bomApi.save).mockResolvedValue({ ...draft, baseQuantity: '2.0000', rowVersion: 3 });
    const gateway = { items: vi.fn().mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } }) } as unknown as EnterpriseGateway;
    render(<BomPage systemCode="demo-portal" bomId={detail.id} allowedActions={['view', 'edit']} gateway={gateway} />);
    await screen.findByText('演示·会议交互大屏');
    expect(screen.queryByRole('button', { name: '保存草稿' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '编辑草稿' }));
    fireEvent.change(screen.getByLabelText(/基准数量/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await waitFor(() => expect(bomApi.save).toHaveBeenCalledWith('demo-portal', detail.id, expect.objectContaining({ baseQuantity: '2', rowVersion: 2 })));
    await screen.findByText('BOM草稿已保存');
  });
});
