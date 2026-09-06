import { DatabaseService } from './database.service';

const describeDatabase = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

describeDatabase('six-table migration boundary', () => {
  let database: DatabaseService;
  beforeAll(() => { database = new DatabaseService(process.env.DATABASE_URL!); });
  afterAll(async () => { await database.$disconnect(); });

  it('creates exactly the six approved logical tables', async () => {
    const tables = await database.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `;
    expect(tables.map((item) => item.tablename)).toEqual([
      'iam_role', 'iam_role_permission', 'iam_role_user', 'iam_user', 'ui_menu', 'ui_menu_action',
    ]);
  });

  it('rejects cross-system role/menu grants', async () => {
    const role = await database.iamRole.findFirstOrThrow({ where: { systemCode: 'demo-portal', roleCode: 'system-manager' } });
    const foreignMenu = await database.uiMenu.findFirstOrThrow({ where: { systemCode: 'secondary-demo', menuCode: 'overview' } });
    await expect(database.iamRolePermission.create({ data: { systemCode: 'demo-portal', roleId: role.id, menuId: foreignMenu.id, permissionType: 'MENU' } })).rejects.toThrow();
  });

  it('rejects an action paired with a different page', async () => {
    const role = await database.iamRole.findFirstOrThrow({ where: { systemCode: 'demo-portal', roleCode: 'system-manager' } });
    const overview = await database.uiMenu.findFirstOrThrow({ where: { systemCode: 'demo-portal', menuCode: 'overview' } });
    const action = await database.uiMenuAction.findFirstOrThrow({ where: { actionCode: 'manage', menu: { systemCode: 'demo-portal', menuCode: 'system-resources' } } });
    await expect(database.iamRolePermission.create({ data: { systemCode: 'demo-portal', roleId: role.id, menuId: overview.id, menuActionId: action.id, permissionType: 'ACTION' } })).rejects.toThrow();
  });

  it('rejects a second built-in system manager and an invalid membership period', async () => {
    await expect(database.iamRole.create({ data: { systemCode: 'demo-portal', roleCode: 'other-system-manager', roleName: '重复系统角色', roleType: 'SYSTEM', isSystem: true } })).rejects.toThrow();
    const membership = await database.iamRoleUser.findFirstOrThrow({ where: { user: { normalizedAccount: 'viewer' }, role: { systemCode: 'demo-portal', roleCode: 'viewer' } } });
    await expect(database.iamRoleUser.update({ where: { roleId_userId: { roleId: membership.roleId, userId: membership.userId } }, data: { effectiveAt: new Date('2026-09-04T00:00:00Z'), expiresAt: new Date('2026-09-03T00:00:00Z') } })).rejects.toThrow();
  });
});
