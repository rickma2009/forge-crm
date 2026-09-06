import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './http/api-exception.filter';
import { DemoResourceService } from './demo-resource/demo-resource.service';
import { DatabaseService } from './database/database.service';

const describeDatabase = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;
const origin = 'http://localhost:5173';
const testPassword = (name: 'INITIAL_ADMIN_PASSWORD' | 'INITIAL_VIEWER_PASSWORD'): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED_FOR_DB_TESTS`);
  return value;
};
const csrfFrom = (response: request.Response): string => {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  const value = cookies?.map((cookie) => cookie.match(/^ipl_csrf=([^;]+)/)?.[1]).find(Boolean);
  if (!value) throw new Error('CSRF_COOKIE_MISSING');
  return value;
};
type TestNavigationNode = { menuCode: string; allowedActions?: Array<{ actionCode: string }>; children: TestNavigationNode[] };
const systemChildren = (body: { items: TestNavigationNode[] }): TestNavigationNode[] => body.items.find((node) => node.menuCode === 'system')?.children ?? [];

describeDatabase('database-backed auth and authorization API', () => {
  let app: INestApplication;
  let resources: DemoResourceService;
  let database: DatabaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    resources = app.get(DemoResourceService);
    database = app.get(DatabaseService);
  });
  afterAll(async () => { await app.close(); });

  const login = async (account: string, password: string) => {
    const agent = request.agent(app.getHttpServer());
    const anonymous = await agent.get('/api/auth/session');
    expect(anonymous.status).toBe(401);
    const csrf = csrfFrom(anonymous);
    const response = await agent.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({ account, password });
    expect(response.status).toBe(201);
    return { agent, csrf };
  };

  it('reports database and migration readiness with a request id', async () => {
    const response = await request(app.getHttpServer()).get('/api/health/ready').set('X-Request-Id', 'health-check-004');
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('health-check-004');
    expect(response.body).toEqual({ status: 'ok', database: 'ready', migrations: 'ready' });
  });

  it('derives admin navigation from explicit demo-portal role grants and isolates the second system', async () => {
    const { agent } = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const navigation = await agent.get('/api/systems/demo-portal/navigation');
    expect(navigation.status).toBe(200);
    expect(navigation.body.items.length).toBeGreaterThan(0);
    expect(systemChildren(navigation.body).map((node) => node.menuCode)).toContain('system-users');
    expect(navigation.body.permissionVersion).toMatch(/^[a-f0-9]{64}$/);

    const isolated = await agent.get('/api/systems/secondary-demo/navigation');
    expect(isolated.status).toBe(403);
    expect(JSON.stringify(isolated.body)).not.toContain('资源目录');
  });

  it('rejects malformed and unknown systems and distinguishes unauthorized from unregistered pages', async () => {
    const { agent } = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    expect((await agent.get('/api/systems/Bad!/navigation')).status).toBe(400);
    expect((await agent.get('/api/systems/not-registered/navigation')).status).toBe(404);
    expect((await agent.get('/api/systems/demo-portal/page-access').query({ routePath: '/showcase/system/users' })).status).toBe(403);
    expect((await agent.get('/api/systems/demo-portal/page-access').query({ routePath: '/showcase/not-registered' })).status).toBe(404);
  });

  it('limits viewer navigation and rejects protected actions before mutation', async () => {
    const { agent, csrf } = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    const navigation = await agent.get('/api/systems/demo-portal/navigation');
    expect(navigation.status).toBe(200);
    expect(systemChildren(navigation.body).map((node) => node.menuCode)).toEqual(['system-resources']);
    expect((systemChildren(navigation.body)[0] as { allowedActions: Array<{ actionCode: string }> }).allowedActions.map((action) => action.actionCode)).toEqual(['view']);

    const before = resources.currentRevision();
    const denied = await agent.post('/api/systems/demo-portal/demo-resources/maintain').set('Origin', origin).set('X-CSRF-Token', csrf);
    expect(denied.status).toBe(403);
    expect(resources.currentRevision()).toBe(before);
  });

  it('requires same-origin CSRF and allows an explicitly granted admin operation', async () => {
    const { agent, csrf } = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    expect((await agent.post('/api/systems/demo-portal/demo-resources/maintain')).status).toBe(403);
    const allowed = await agent.post('/api/systems/demo-portal/demo-resources/maintain').set('Origin', origin).set('X-CSRF-Token', csrf);
    expect(allowed.status).toBe(201);
    expect(allowed.body.revision).toBeGreaterThan(0);
  });

  it('keeps the double-submit CSRF token usable across logout so another account can sign in', async () => {
    const { agent, csrf } = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const logout = await agent.post('/api/auth/logout').set('Origin', origin).set('X-CSRF-Token', csrf);
    expect(logout.status).toBe(204);

    const relogin = await agent.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({ account: 'viewer', password: testPassword('INITIAL_VIEWER_PASSWORD') });
    expect(relogin.status).toBe(201);
    expect(relogin.body.account).toBe('viewer');
  });

  it('applies role-membership revocation on the next request without an admin account bypass', async () => {
    const { agent } = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const membership = await database.iamRoleUser.findFirstOrThrow({ where: { user: { normalizedAccount: 'admin' }, role: { systemCode: 'demo-portal', roleCode: 'system-manager' } } });
    try {
      await database.iamRoleUser.update({ where: { roleId_userId: { roleId: membership.roleId, userId: membership.userId } }, data: { status: 'DISABLED' } });
      const revoked = await agent.get('/api/systems/demo-portal/navigation');
      expect(revoked.status).toBe(403);
      expect(JSON.stringify(revoked.body)).not.toContain('系统管理');
    } finally {
      await database.iamRoleUser.update({ where: { roleId_userId: { roleId: membership.roleId, userId: membership.userId } }, data: { status: 'ACTIVE' } });
    }
  });

  it('applies active menu, action, role, membership and grant changes on the next request', async () => {
    const { agent } = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    const role = await database.iamRole.findFirstOrThrow({ where: { systemCode: 'demo-portal', roleCode: 'viewer' } });
    const menu = await database.uiMenu.findFirstOrThrow({ where: { systemCode: 'demo-portal', menuCode: 'system-resources' } });
    const action = await database.uiMenuAction.findFirstOrThrow({ where: { menuId: menu.id, actionCode: 'view' } });
    const membership = await database.iamRoleUser.findFirstOrThrow({ where: { roleId: role.id } });
    const menuGrant = await database.iamRolePermission.findFirstOrThrow({ where: { roleId: role.id, menuId: menu.id, permissionType: 'MENU' } });

    try {
      await database.uiMenu.update({ where: { id: menu.id }, data: { status: 'DISABLED' } });
      expect(systemChildren((await agent.get('/api/systems/demo-portal/navigation')).body)).toEqual([]);
    } finally { await database.uiMenu.update({ where: { id: menu.id }, data: { status: 'ACTIVE' } }); }

    try {
      await database.uiMenuAction.update({ where: { id: action.id }, data: { status: 'DISABLED' } });
      const result = await agent.get('/api/systems/demo-portal/navigation');
      expect((systemChildren(result.body)[0] as { allowedActions: unknown[] }).allowedActions).toEqual([]);
    } finally { await database.uiMenuAction.update({ where: { id: action.id }, data: { status: 'ACTIVE' } }); }

    try {
      await database.iamRole.update({ where: { id: role.id }, data: { status: 'DISABLED' } });
      expect((await agent.get('/api/systems/demo-portal/navigation')).status).toBe(403);
    } finally { await database.iamRole.update({ where: { id: role.id }, data: { status: 'ACTIVE' } }); }

    try {
      await database.iamRoleUser.update({ where: { roleId_userId: { roleId: membership.roleId, userId: membership.userId } }, data: { expiresAt: new Date(Date.now() - 1_000) } });
      expect((await agent.get('/api/systems/demo-portal/navigation')).status).toBe(403);
    } finally { await database.iamRoleUser.update({ where: { roleId_userId: { roleId: membership.roleId, userId: membership.userId } }, data: { expiresAt: null } }); }

    try {
      await database.iamRolePermission.update({ where: { id: menuGrant.id }, data: { status: 'DISABLED' } });
      expect(systemChildren((await agent.get('/api/systems/demo-portal/navigation')).body)).toEqual([]);
    } finally { await database.iamRolePermission.update({ where: { id: menuGrant.id }, data: { status: 'ACTIVE' } }); }
  });

  it('serves dictionaries, role views and customers from the database and enforces customer actions', async () => {
    const viewer = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    const viewerDictionaries = await viewer.agent.get('/api/systems/demo-portal/dictionaries');
    expect(viewerDictionaries.status).toBe(200);
    expect(viewerDictionaries.body.map((item: { dictCode: string }) => item.dictCode)).toEqual(expect.arrayContaining(['customer_category', 'customer_status', 'customer_industry', 'customer_level']));
    const viewerViews = await viewer.agent.get('/api/systems/demo-portal/list-views/customer-directory/view');
    expect(viewerViews.status).toBe(200);
    expect(viewerViews.body.views[0]).toMatchObject({ scope: 'SYSTEM', viewName: '客户默认视图' });
    const viewerCustomers = await viewer.agent.get('/api/systems/demo-portal/customers');
    expect(viewerCustomers.status).toBe(200);
    expect(viewerCustomers.body.pagination.total).toBeGreaterThanOrEqual(3);
    expect((await viewer.agent.post('/api/systems/demo-portal/customers').set('Origin', origin).set('X-CSRF-Token', viewer.csrf).send({ customerName: '受限写入', shortName: '受限', categoryValue: 'potential', statusValue: 'active' })).status).toBe(403);

    const admin = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const customerName = `集成测试客户-${Date.now()}`;
    try {
      const created = await admin.agent.post('/api/systems/demo-portal/customers').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ customerName, shortName: '集成测试', categoryValue: 'potential', statusValue: 'active', industryValue: 'technology', levelValue: 'b', salesOwnerKey: 'sales-lin', address: '本地集成测试地址', remark: '测试完成后清理' });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ customerName, salesOwnerName: '林晓', version: 1 });
      expect(created.body.customerCode).toMatch(/^C\d{10}$/);
    } finally {
      await database.crmCustomer.deleteMany({ where: { systemCode: 'demo-portal', customerName } });
    }
  });

  it('serves hierarchical initialized dictionaries and transactionally maintains dictionary values', async () => {
    const admin = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const dictionaries = await admin.agent.get('/api/systems/demo-portal/dictionaries').query({ includeDisabled: 'true' });
    expect(dictionaries.status).toBe(200);
    const material = dictionaries.body.find((item: { dictCode: string }) => item.dictCode === 'material_category');
    const materialMajor = dictionaries.body.find((item: { dictCode: string }) => item.dictCode === 'material_major_category');
    const customerCategory = dictionaries.body.find((item: { dictCode: string }) => item.dictCode === 'customer_category');
    const fixedYesNo = dictionaries.body.find((item: { dictCode: string }) => item.dictCode === 'yes_no');
    expect(material).toMatchObject({ parentId: null, itemsEditable: true });
    expect(materialMajor).toMatchObject({ parentId: material.id, itemsEditable: true });
    expect(fixedYesNo).toMatchObject({ itemsEditable: false });

    const suffix = String(Date.now()); const parentValue = `parent_${suffix}`; const singleValue = `single_${suffix}`; const importA = `import_a_${suffix}`; const importB = `import_b_${suffix}`; const duplicate = `duplicate_${suffix}`;
    try {
      const parentCreated = await admin.agent.post('/api/systems/demo-portal/dictionaries/items').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ dictionaryId: material.id, itemValue: parentValue, itemName: '父级也可维护', status: 'ACTIVE', sortNo: 900 });
      expect(parentCreated.status).toBe(201);

      const created = await admin.agent.post('/api/systems/demo-portal/dictionaries/items').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ dictionaryId: customerCategory.id, itemValue: singleValue, itemName: '单条新增', status: 'ACTIVE', sortNo: 910 });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ itemValue: singleValue, itemName: '单条新增', version: 1 });

      const imported = await admin.agent.post(`/api/systems/demo-portal/dictionaries/${customerCategory.id}/items/import`).set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ rows: [{ rowNumber: 2, itemValue: importA, itemName: '批量值 A', status: 'ACTIVE', sortNo: 920 }, { rowNumber: 3, itemValue: importB, itemName: '批量值 B', status: 'DISABLED', sortNo: 930 }] });
      expect(imported.status).toBe(201);
      expect(imported.body).toEqual({ imported: 2 });

      const rejected = await admin.agent.post(`/api/systems/demo-portal/dictionaries/${customerCategory.id}/items/import`).set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ rows: [{ rowNumber: 2, itemValue: duplicate, itemName: '重复一', status: 'ACTIVE', sortNo: 940 }, { rowNumber: 3, itemValue: duplicate, itemName: '重复二', status: 'ACTIVE', sortNo: 950 }] });
      expect(rejected.status).toBe(409);
      expect(rejected.body.message).toContain('第 3 行');
      expect(await database.sysDictionaryItem.count({ where: { dictionaryId: customerCategory.id, itemValue: duplicate } })).toBe(0);

      const fixedRejected = await admin.agent.post('/api/systems/demo-portal/dictionaries/items').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ dictionaryId: fixedYesNo.id, itemValue: `fixed_${suffix}`, itemName: '不可写', status: 'ACTIVE', sortNo: 10 });
      expect(fixedRejected.status).toBe(403);

      const viewer = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
      const viewerRejected = await viewer.agent.post(`/api/systems/demo-portal/dictionaries/${customerCategory.id}/items/import`).set('Origin', origin).set('X-CSRF-Token', viewer.csrf).send({ rows: [{ rowNumber: 2, itemValue: `viewer_${suffix}`, itemName: '越权写入', status: 'ACTIVE', sortNo: 960 }] });
      expect(viewerRejected.status).toBe(403);
    } finally {
      await database.sysDictionaryItem.deleteMany({ where: { dictionaryId: material.id, itemValue: parentValue } });
      await database.sysDictionaryItem.deleteMany({ where: { dictionaryId: customerCategory.id, itemValue: { in: [singleValue, importA, importB, duplicate, `viewer_${suffix}`] } } });
    }
  });

});
