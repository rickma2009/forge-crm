import { OpportunityService } from './opportunity.service';

describe('product selection projection', () => {
  it('returns middle and minor category names for the product picker', async () => {
    const now = new Date('2026-09-25T00:00:00.000Z');
    const middleId = '00000000-0000-4000-8000-000000000001';
    const minorId = '00000000-0000-4000-8000-000000000002';
    const db = {
      sysApplication: { findFirst: jest.fn().mockResolvedValue({ id: 'app', tenantId: 'tenant' }) },
      mdItem: { findMany: jest.fn().mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000003', itemCode: 'P1', itemName: '控制板', itemType: 'PRODUCT', majorCategoryId: null, middleCategoryId: middleId, minorCategoryId: minorId, model: null, productLine: null, baseUnit: '件', status: 'ACTIVE', remark: null, version: 1, createdAt: now, updatedAt: now }]), count: jest.fn().mockResolvedValue(1) },
      sysDictionaryItem: { findMany: jest.fn().mockResolvedValue([{ id: middleId, itemName: '电子类' }, { id: minorId, itemName: '控制板类' }]) },
    };
    const result = await new OpportunityService(db as never).listProducts('demo-portal', { page: 1, pageSize: 20, status: 'ACTIVE' });
    expect(result.items[0]).toMatchObject({ productCode: 'P1', middleCategoryName: '电子类', minorCategoryName: '控制板类' });
  });
});
