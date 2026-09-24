import type { AuthenticatedRequest } from '../auth/auth.types';
import { ProductController } from '../opportunity/opportunity.controller';
import { PricingController } from '../quotation/quotation.controller';

describe('item authorization compatibility', () => {
  const request = { currentUser: { id: 'user-1', account: 'admin' } } as AuthenticatedRequest;

  it('authorizes legacy product APIs through the item directory', async () => {
    const authorization = { assertAction: jest.fn().mockResolvedValue(undefined) };
    const products = { listProducts: jest.fn().mockResolvedValue({ items: [] }) };
    const pricing = { get: jest.fn().mockResolvedValue({ history: [] }) };

    await new ProductController(products as never, authorization as never).list(request, 'demo-portal', {});
    await new PricingController(pricing as never, authorization as never).get(request, 'demo-portal', '11111111-1111-4111-8111-111111111111');

    expect(authorization.assertAction).toHaveBeenNthCalledWith(1, 'user-1', 'demo-portal', 'item-directory', 'view');
    expect(authorization.assertAction).toHaveBeenNthCalledWith(2, 'user-1', 'demo-portal', 'item-directory', 'price-view');
  });
});
