import { DatabaseService } from './database.service';

const describeDatabase = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

describeDatabase('platform access migration boundary', () => {
  let database: DatabaseService;
  beforeAll(() => { database = new DatabaseService(process.env.DATABASE_URL!); });
  afterAll(async () => { await database.$disconnect(); });

  it('creates the governed sys platform tables', async () => {
    const tables = await database.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `;
    expect(tables.map((item) => item.tablename)).toEqual(expect.arrayContaining([
      'sys_tenant', 'sys_application', 'sys_user', 'sys_role_group', 'sys_role', 'sys_role_user',
      'sys_permission', 'sys_role_permission', 'sys_menu', 'sys_menu_action', 'sys_audit_log',
      'sys_page_resource', 'sys_page_button', 'sys_page_tab',
    ]));
  });

  it('rejects cross-system role/menu grants', async () => {
    const role = await database.iamRole.findFirstOrThrow({ where: { systemCode: 'demo-portal', roleCode: 'system-manager' } });
    const tenant = await database.sysTenant.findUniqueOrThrow({ where: { tenantCode: 'default' } });
    const foreignApplication = await database.sysApplication.create({ data: { tenantId: tenant.id, applicationCode: 'migration-test-foreign', applicationName: '迁移隔离测试' } });
    try {
      const foreignPermission = await database.sysPermission.create({ data: { applicationId: foreignApplication.id, permissionCode: 'test.foreign.view', permissionName: '跨系统测试权限', resourceCode: 'test', actionCode: 'view' } });
      await expect(database.iamRolePermission.create({ data: { applicationId: role.applicationId!, roleId: role.id, permissionId: foreignPermission.id } })).rejects.toThrow();
    } finally {
      await database.sysPermission.deleteMany({ where: { applicationId: foreignApplication.id } });
      await database.sysApplication.delete({ where: { id: foreignApplication.id } });
    }
  });

  it('scopes normalized account uniqueness to the tenant', async () => {
    const tenant = await database.sysTenant.create({
      data: { tenantCode: 'migration-account-scope', tenantName: '账号范围迁移测试' },
    });
    try {
      const user = await database.iamUser.create({
        data: {
          tenantId: tenant.id,
          account: 'admin',
          normalizedAccount: 'admin',
          displayName: '另一租户管理员',
          passwordHash: 'integration-test-not-used',
        },
      });
      expect(user.tenantId).toBe(tenant.id);
      await expect(database.iamUser.create({
        data: {
          tenantId: tenant.id,
          account: 'ADMIN',
          normalizedAccount: 'admin',
          displayName: '重复管理员',
          passwordHash: 'integration-test-not-used',
        },
      })).rejects.toThrow();
    } finally {
      await database.iamUser.deleteMany({ where: { tenantId: tenant.id } });
      await database.sysTenant.delete({ where: { id: tenant.id } });
    }
  });

  it('rejects a second built-in system manager and an invalid membership period', async () => {
    await expect(database.iamRole.create({ data: { systemCode: 'demo-portal', roleCode: 'other-system-manager', roleName: '重复系统角色', roleType: 'SYSTEM', isSystem: true } })).rejects.toThrow();
    const membership = await database.iamRoleUser.findFirstOrThrow({ where: { user: { normalizedAccount: 'viewer' }, role: { systemCode: 'demo-portal', roleCode: 'viewer' } } });
    await expect(database.iamRoleUser.update({ where: { id: membership.id }, data: { effectiveAt: new Date('2026-09-04T00:00:00Z'), expiresAt: new Date('2026-09-03T00:00:00Z') } })).rejects.toThrow();
  });
});
