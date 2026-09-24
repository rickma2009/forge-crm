import { PricingService } from './pricing.service';

describe('quotation product eligibility without product-line coupling', () => {
  it.each([null, '', 'disabled-line', 'unknown-line'])('accepts an active product with line %s without dictionary access', async (productLine) => {
    const item = { id: 'p', itemCode: 'P1', itemName: '设备', baseUnit: '件', status: 'ACTIVE', productLine };
    const findFirst = jest.fn().mockResolvedValue(item);
    const dictionary = jest.fn();
    const tx = { mdItem: { findFirst }, sysDictionaryItem: { findFirst: dictionary } };
    const service = new PricingService({} as never);
    expect(await service.eligible(tx as never, 'app', 'tenant', 'p')).toMatchObject({ productLine, productCode: 'P1' });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'p', tenantId: 'tenant', itemType: 'PRODUCT', status: 'ACTIVE' } });
    expect(dictionary).not.toHaveBeenCalled();
  });
  it('rejects unavailable or out-of-scope products', async () => {
    const service = new PricingService({} as never);
    await expect(service.eligible({ mdItem: { findFirst: jest.fn().mockResolvedValue(null) } } as never, 'app', 'tenant', 'p')).rejects.toThrow('产品不存在或已停用');
  });
});
