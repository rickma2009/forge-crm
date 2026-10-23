import { CustomerRelatedService } from './customer-related.service';
import { ApiException } from '../http/api-exceptions';
const id = '00000000-0000-4000-8000-000000000001';
const result = { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
function fixture() {
  const customers = { assertScopedCustomer: jest.fn().mockResolvedValue(undefined) };
  const opportunities = { listOpportunities: jest.fn().mockResolvedValue(result) };
  const quotations = { list: jest.fn().mockResolvedValue(result) };
  const sales = { listOrders: jest.fn().mockResolvedValue(result), listOutbounds: jest.fn().mockResolvedValue(result) };
  const auth = { assertAction: jest.fn().mockResolvedValue(undefined) };
  const scope = { where: { salesOwnerKey: 'owner' }, fields: [] };
  const policies = { customerScope: jest.fn().mockResolvedValue(scope) };
  return { customers, opportunities, quotations, sales, auth, policies, scope,
    service: new CustomerRelatedService(customers as never, opportunities as never, quotations as never, sales as never, auth as never, policies as never) };
}
describe('customer360 authorized aggregation', () => {
  it('uses the scoped customer and ignores client attempts to override the path ID', async () => {
    const f = fixture(); await f.service.related('demo', 'actor', id, 'opportunities', { page: '2', pageSize: '10', customerId: 'other', ownerUserId: 'other' });
    expect(f.customers.assertScopedCustomer).toHaveBeenCalledWith('demo', id, f.scope);
    expect(f.opportunities.listOpportunities).toHaveBeenCalledWith('demo', { customerId: id, page: 2, pageSize: 10 });
  });
  it('does not query any source when customer row scope denies access', async () => {
    const f = fixture(); f.customers.assertScopedCustomer.mockRejectedValue(new ApiException('NOT_FOUND', 404, '客户不存在'));
    await expect(f.service.overview('demo', 'actor', id)).rejects.toThrow('客户不存在');
    expect(f.opportunities.listOpportunities).not.toHaveBeenCalled(); expect(f.quotations.list).not.toHaveBeenCalled();
  });
  it('omits unauthorized kinds and their counts, while direct access is rejected', async () => {
    const f = fixture(); f.auth.assertAction.mockImplementation(async (_a, _c, menu) => { if (menu !== 'customer-directory' && menu !== 'opportunity-directory') throw new ApiException('FORBIDDEN', 403, '无权'); });
    expect(await f.service.overview('demo', 'actor', id)).toEqual({ items: [{ kind: 'opportunities', count: 0, error: false }] });
    expect(f.sales.listOrders).not.toHaveBeenCalled(); expect(f.quotations.list).not.toHaveBeenCalled();
    await expect(f.service.related('demo', 'actor', id, 'sales-orders', {})).rejects.toThrow('无权');
  });
  it('retains quotation actor filtering and strips internal/customer fields from responses', async () => {
    const f = fixture(); f.quotations.list.mockResolvedValue({ ...result, items: [{ id, quoteCode: 'Q1', title: '设备', status: 'DRAFT', total: '10.00', quoteDate: '2026-10-03', customerName: 'hidden', lines: ['private'] }] } as never);
    const value = await f.service.related('demo', 'actor', id, 'quotations', {});
    expect(f.quotations.list).toHaveBeenCalledWith('demo', 'actor', { customerId: id, page: 1, pageSize: 20 });
    expect(value.items[0]).toEqual({ id, code: 'Q1', name: '设备', status: 'DRAFT', amount: '10.00', currency: null, date: '2026-10-03', owner: null, stage: null });
  });
  it('isolates source failures without misreporting them as zero counts', async () => {
    const f = fixture(); f.sales.listOrders.mockRejectedValue(new Error('offline'));
    const value = await f.service.overview('demo', 'actor', id);
    expect(value.items.find(x => x.kind === 'sales-orders')).toEqual({ kind: 'sales-orders', count: null, error: true });
    expect(value.items.find(x => x.kind === 'opportunities')?.count).toBe(0);
  });
  it('fails closed on authorization outages instead of treating them as missing permissions', async () => {
    const f = fixture(); f.auth.assertAction.mockRejectedValue(new ApiException('SERVICE_UNAVAILABLE', 503, '权限失败'));
    await expect(f.service.overview('demo', 'actor', id)).rejects.toThrow('权限失败');
  });
  it.each([{ page: 0 }, { pageSize: 101 }, { page: 'NaN' }])('rejects invalid pagination %j', async query => {
    const f = fixture(); await expect(f.service.related('demo', 'actor', id, 'sales-orders', query)).rejects.toThrow();
    expect(f.sales.listOrders).not.toHaveBeenCalled();
  });
});
