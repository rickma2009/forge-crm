import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuotationCreateDialog } from './QuotationCreateDialog';
import { quotationApi } from './quotation-api';
import type { EnterpriseGateway } from './gateway';
const id = '11111111-1111-4111-8111-111111111111';
const source = (version = 1) => ({ opportunity: { id, opportunityCode: 'O1', opportunityName: '当前商机', customerName: version === 1 ? '原客户' : '更新后客户', status: 'ACTIVE', version, products: [{ id: 'p1', productName: '设备', quantity: version, unitPrice: 100, requirement: '需求说明' }] } });
afterEach(() => vi.restoreAllMocks());
describe('locked quotation creation', () => {
  it('refreshes a changed source and requires a second explicit confirmation', async () => {
    const detail = vi.fn().mockResolvedValueOnce(source()).mockResolvedValueOnce(source(2));
    const create = vi.spyOn(quotationApi, 'create').mockRejectedValueOnce(new Error('商机信息已更新，请重新核对后创建')).mockResolvedValueOnce({ id: 'quote' } as never);
    const onCreated = vi.fn();
    render(<QuotationCreateDialog systemCode="demo" opportunityId={id} gateway={{ opportunityDetail: detail } as unknown as EnterpriseGateway} onClose={() => {}} onCreated={onCreated} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '确定' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('请重新核对后再次确定');
    expect(screen.getByLabelText('客户名称')).toHaveValue('更新后客户');
    expect(create).toHaveBeenCalledTimes(1); expect(onCreated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('quote'));
    expect(create.mock.calls.map((c) => c[1])).toEqual([
      { mode: 'OPPORTUNITY', opportunityId: id, opportunityVersion: 1, requestKey: expect.any(String) },
      { mode: 'OPPORTUNITY', opportunityId: id, opportunityVersion: 2, requestKey: expect.any(String) },
    ]);
    expect(create.mock.calls[1][1].requestKey).not.toBe(create.mock.calls[0][1].requestKey);
  });
  it('blocks creation on load failure and supports retry without changing context', async () => {
    const detail = vi.fn().mockRejectedValueOnce(new Error('商机加载失败')).mockResolvedValueOnce(source());
    render(<QuotationCreateDialog systemCode="demo" opportunityId={id} gateway={{ opportunityDetail: detail } as unknown as EnterpriseGateway} onClose={() => {}} onCreated={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('商机加载失败');
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '重新加载商机' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '确定' })).toBeEnabled());
    expect(screen.getByLabelText('关联商机')).toHaveValue('O1 · 当前商机');
  });
  it('rejects a source that became inactive while opening the modal', async () => {
    const result = source(); result.opportunity.status = 'DISABLED';
    render(<QuotationCreateDialog systemCode="demo" opportunityId={id} gateway={{ opportunityDetail: vi.fn().mockResolvedValue(result) } as unknown as EnterpriseGateway} onClose={() => {}} onCreated={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('商机已停用');
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  });
});
