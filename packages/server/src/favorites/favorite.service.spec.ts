import { FavoriteService } from './favorite.service';
import type { DatabaseService } from '../database/database.service';
import type { AuthorizationService } from '../rbac/authorization.service';
import type { RolePolicyService } from '../role-management/role-policy.service';

describe('FavoriteService', () => {
  const tenantId = '10000000-0000-4000-8000-000000000001';
  const applicationId = '20000000-0000-4000-8000-000000000002';
  const userId = '30000000-0000-4000-8000-000000000003';
  const targetId = '40000000-0000-4000-8000-000000000004';
  const favoriteId = '50000000-0000-4000-8000-000000000005';
  const createdAt = new Date('2026-10-06T01:02:03.000Z');

  function setup() {
    const db = {
      sysApplication: { findFirst: jest.fn().mockResolvedValue({ id: applicationId, tenantId }) },
      sysUserFavorite: {
        findMany: jest.fn().mockResolvedValue([{ id: favoriteId, tenantId, applicationId, userId, targetType: 'PRODUCT', targetId, createdAt }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: favoriteId, targetType: 'PRODUCT', targetId, createdAt }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      mdProduct: { findMany: jest.fn().mockResolvedValue([{ id: targetId, productName: '当前产品名称' }]) },
    } as unknown as DatabaseService;
    const authorization = {
      navigation: jest.fn().mockResolvedValue({ items: [{ menuCode: 'product-directory', allowedActions: [{ actionCode: 'view' }], children: [] }] }),
    } as unknown as AuthorizationService;
    const policies = {} as RolePolicyService;
    return { service: new FavoriteService(db, authorization, policies), db, authorization };
  }

  it('resolves the current target name and returns newest-first scoped favorites', async () => {
    const { service, db } = setup();
    await expect(service.list('demo-portal', userId)).resolves.toEqual([{
      id: favoriteId, targetType: 'PRODUCT', targetId, createdAt: createdAt.toISOString(),
      objectTypeName: '产品', objectValue: '当前产品名称', available: true,
      routePath: `/showcase/products/${targetId}`,
    }]);
    expect(db.sysUserFavorite.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId, applicationId, userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }));
  });

  it('adds the relationship idempotently within the current user and application scope', async () => {
    const { service, db, authorization } = setup();
    await service.add('demo-portal', userId, { targetType: 'PRODUCT', targetId });
    expect(authorization.navigation).toHaveBeenCalledWith(userId, 'demo-portal');
    expect(db.sysUserFavorite.createMany).toHaveBeenCalledWith({ data: [{ tenantId, applicationId, userId, targetType: 'PRODUCT', targetId }], skipDuplicates: true });
  });

  it('removes only the current user favorite in the current application scope', async () => {
    const { service, db } = setup();
    await service.remove('demo-portal', userId, favoriteId);
    expect(db.sysUserFavorite.deleteMany).toHaveBeenCalledWith({ where: { id: favoriteId, tenantId, applicationId, userId } });
  });
});
