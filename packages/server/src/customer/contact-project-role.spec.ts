import { CustomerService } from './customer.service';
import { DatabaseService } from '../database/database.service';
import { DictionaryService } from '../dictionary/dictionary.service';

const customerId = '00000000-0000-4000-8000-000000000002';
const contactId = '00000000-0000-4000-8000-000000000003';
function fixture(role: string | null = '旧项目经理') {
  const row = { id: contactId, customerId, name: '张三', department: null, position: null, decisionRole: role, mobile: null, phone: null, email: null, status: 'ACTIVE', remark: null, sortNo: 0, version: 3, updatedAt: new Date() };
  const db = { crmCustomer: { findFirst: jest.fn().mockResolvedValue({ id: customerId }) }, crmCustomerContact: {
    create: jest.fn().mockResolvedValue(row), findFirst: jest.fn().mockResolvedValue(row),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }), findFirstOrThrow: jest.fn().mockResolvedValue(row),
  } };
  const dictionaries = { assertActiveValues: jest.fn().mockResolvedValue(undefined) };
  return { db, dictionaries, service: new CustomerService(db as unknown as DatabaseService, dictionaries as unknown as DictionaryService) };
}

describe('contact project role dictionary', () => {
  it('persists a valid dictionary code with the route customer and system', async () => {
    const { service, db, dictionaries } = fixture('technical_selector');
    await service.createContact('demo-portal', customerId, 'admin', { name: '张三', decisionRole: 'technical_selector' });
    expect(dictionaries.assertActiveValues).toHaveBeenCalledWith('demo-portal', { contact_project_role: 'technical_selector' });
    expect(db.crmCustomerContact.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId, systemCode: 'demo-portal', decisionRole: 'technical_selector', createdBy: 'admin' }) });
  });
  it('rejects a new arbitrary role before persisting the contact', async () => {
    const { service, db, dictionaries } = fixture();
    dictionaries.assertActiveValues.mockRejectedValue(new Error('角色无效或已停用'));
    await expect(service.createContact('demo-portal', customerId, 'admin', { name: '张三', decisionRole: '任意文本' })).rejects.toThrow('角色无效');
    expect(dictionaries.assertActiveValues).toHaveBeenCalledWith('demo-portal', { contact_project_role: '任意文本' });
    expect(db.crmCustomerContact.create).not.toHaveBeenCalled();
  });
  it('preserves an unchanged historical role but validates a replacement', async () => {
    const { service, db, dictionaries } = fixture();
    await service.updateContact('demo-portal', customerId, contactId, 'admin', { name: '张三', decisionRole: '旧项目经理', version: 3 });
    expect(dictionaries.assertActiveValues).not.toHaveBeenCalled();
    expect(db.crmCustomerContact.findFirst).toHaveBeenCalledWith({ where: { id: contactId, customerId, systemCode: 'demo-portal', version: 3 } });
    await service.updateContact('demo-portal', customerId, contactId, 'admin', { name: '张三', decisionRole: 'technical_selector', version: 3 });
    expect(dictionaries.assertActiveValues).toHaveBeenCalledWith('demo-portal', { contact_project_role: 'technical_selector' });
  });
  it('rejects a missing, out-of-scope or stale contact without writing', async () => {
    const { service, db } = fixture();
    db.crmCustomerContact.findFirst.mockResolvedValue(null);
    await expect(service.updateContact('other-system', customerId, contactId, 'admin', { name: '张三', decisionRole: 'decision_maker', version: 3 })).rejects.toThrow();
    expect(db.crmCustomerContact.updateMany).not.toHaveBeenCalled();
  });
});
