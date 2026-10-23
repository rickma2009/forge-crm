import { CustomerService } from './customer.service';
import type { DatabaseService } from '../database/database.service';
import type { DictionaryService } from '../dictionary/dictionary.service';
function fixture() { const db = { crmCustomer: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(120) } }; return { db, service: new CustomerService(db as unknown as DatabaseService, {} as DictionaryService) }; }
describe('customer server grid', () => {
  it('filters and sorts the full data before taking page two', async () => {
    const { db, service } = fixture();
    await service.list('demo', { page: '2', pageSize: '25', columnFilters: JSON.stringify({ customerName: '测试', categoryValue: 'formal' }), orderBy: 'categoryValue', order: 'asc' });
    expect(db.crmCustomer.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ systemCode: 'demo', AND: [{ customerName: { contains: '测试', mode: 'insensitive' } }, { categoryValue: { contains: 'formal', mode: 'insensitive' } }] }), skip: 25, take: 25, orderBy: [{ categoryValue: 'asc' }, { id: 'asc' }] }));
    expect(db.crmCustomer.count.mock.calls[0][0].where).toEqual(db.crmCustomer.findMany.mock.calls[0][0].where);
  });
  it('rejects filtering a hidden field before reading records', async () => {
    const { db, service } = fixture();
    await expect(service.list('demo', { columnFilters: JSON.stringify({ address: 'X' }) }, { fields: [{ field: 'address', visible: false, mask: 'NONE' }], where: {} } as never)).rejects.toThrow('隐藏或脱敏');
    expect(db.crmCustomer.findMany).not.toHaveBeenCalled();
  });
  it('rejects unknown fields instead of querying arbitrary database columns', async () => {
    const { db, service } = fixture(); await expect(service.list('demo', { columnFilters: JSON.stringify({ systemCode: 'other' }) })).rejects.toThrow('无效'); expect(db.crmCustomer.findMany).not.toHaveBeenCalled();
  });
});
