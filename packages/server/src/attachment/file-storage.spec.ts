import { safeFileName, storageKey } from './file-storage';

describe('attachment file storage', () => {
  it('removes traversal and produces an owner-scoped relative key', () => {
    expect(safeFileName('../../产品 规格.pdf')).toBe('产品_规格.pdf');
    expect(storageKey('PRODUCT', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '../../产品 规格.pdf', new Date('2026-09-23T00:00:00Z'))).toBe('product/2026/09/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/产品_规格.pdf');
  });
});
