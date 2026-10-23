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
const obsoleteResourceCodes = ['business-demo', 'components', 'foundations', 'templates', 'component-actions', 'component-data', 'component-feedback', 'component-forms', 'foundation-colors', 'foundation-icons', 'foundation-spacing', 'foundation-typography', 'interaction-patterns', 'overview', 'page-states', 'scenarios', 'template-detail', 'template-filter', 'template-form', 'template-list', 'template-master-detail', 'template-workbench'];

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
    expect(isolated.status).toBe(404);
    expect(JSON.stringify(isolated.body)).not.toContain('资源目录');
  });

  it('rejects malformed and unknown systems and distinguishes unauthorized from unregistered pages', async () => {
    const { agent } = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    expect((await agent.get('/api/systems/Bad!/navigation')).status).toBe(400);
    expect((await agent.get('/api/systems/not-registered/navigation')).status).toBe(404);
    expect((await agent.get('/api/systems/demo-portal/page-access').query({ routePath: '/showcase/system/menus' })).status).toBe(403);
    expect((await agent.get('/api/systems/demo-portal/page-access').query({ routePath: '/showcase/not-registered' })).status).toBe(404);
  });

  it('limits viewer navigation and rejects protected actions before mutation', async () => {
    const { agent, csrf } = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    const navigation = await agent.get('/api/systems/demo-portal/navigation');
    expect(navigation.status).toBe(200);
    expect(systemChildren(navigation.body).map((node) => node.menuCode)).toEqual(['system-users', 'system-roles', 'system-policies', 'system-resources']);
    expect(systemChildren(navigation.body).every((node) => node.allowedActions?.every((action) => action.actionCode === 'view'))).toBe(true);

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
      await database.iamRoleUser.update({ where: { id: membership.id }, data: { status: 'DISABLED' } });
      const revoked = await agent.get('/api/systems/demo-portal/navigation');
      expect(revoked.status).toBe(403);
      expect(JSON.stringify(revoked.body)).not.toContain('系统管理');
    } finally {
      await database.iamRoleUser.update({ where: { id: membership.id }, data: { status: 'ACTIVE' } });
    }
  });

  it('applies active menu, action, role, membership and grant changes on the next request', async () => {
    const { agent } = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    const role = await database.iamRole.findFirstOrThrow({ where: { systemCode: 'demo-portal', roleCode: 'viewer' } });
    const menu = await database.uiMenu.findFirstOrThrow({ where: { systemCode: 'demo-portal', menuCode: 'system-resources' } });
    const action = await database.uiMenuAction.findFirstOrThrow({ where: { menuId: menu.id, actionCode: 'view' } });
    const membership = await database.iamRoleUser.findFirstOrThrow({ where: { roleId: role.id } });
    const menuGrant = await database.iamRolePermission.findFirstOrThrow({ where: { roleId: role.id, permissionId: menu.accessPermissionId! } });

    try {
      await database.uiMenu.update({ where: { id: menu.id }, data: { status: 'DISABLED' } });
      expect(systemChildren((await agent.get('/api/systems/demo-portal/navigation')).body).map((node) => node.menuCode)).not.toContain('system-resources');
    } finally { await database.uiMenu.update({ where: { id: menu.id }, data: { status: 'ACTIVE' } }); }

    try {
      await database.uiMenuAction.update({ where: { id: action.id }, data: { status: 'DISABLED' } });
      const result = await agent.get('/api/systems/demo-portal/navigation');
      expect(systemChildren(result.body).find((node) => node.menuCode === 'system-resources')?.allowedActions).toEqual([]);
    } finally { await database.uiMenuAction.update({ where: { id: action.id }, data: { status: 'ACTIVE' } }); }

    try {
      await database.iamRole.update({ where: { id: role.id }, data: { status: 'DISABLED' } });
      expect((await agent.get('/api/systems/demo-portal/navigation')).status).toBe(403);
    } finally { await database.iamRole.update({ where: { id: role.id }, data: { status: 'ACTIVE' } }); }

    try {
      await database.iamRoleUser.update({ where: { id: membership.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
      expect((await agent.get('/api/systems/demo-portal/navigation')).status).toBe(403);
    } finally { await database.iamRoleUser.update({ where: { id: membership.id }, data: { expiresAt: null } }); }

    try {
      await database.iamRolePermission.update({ where: { id: menuGrant.id }, data: { status: 'DISABLED' } });
      expect(systemChildren((await agent.get('/api/systems/demo-portal/navigation')).body).map((node) => node.menuCode)).not.toContain('system-resources');
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

  it('serves application-scoped access administration and limits viewer to read operations', async () => {
    const admin = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const users = await admin.agent.get('/api/systems/demo-portal/access/users');
    expect(users.status).toBe(200);
    expect(users.body.items.map((item: { account: string }) => item.account)).toEqual(expect.arrayContaining(['admin', 'viewer']));
    expect(JSON.stringify(users.body)).not.toContain('passwordHash');
    const roles = await admin.agent.get('/api/systems/demo-portal/access/roles');
    expect(roles.status).toBe(200);
    expect(roles.body.items.map((item: { roleCode: string }) => item.roleCode)).toEqual(expect.arrayContaining(['system-manager', 'viewer']));
    const permissions = await admin.agent.get('/api/systems/demo-portal/access/permissions').query({ pageSize: 100 });
    expect(permissions.status).toBe(200);
    expect(permissions.body.items.map((item: { permissionCode: string }) => item.permissionCode)).toContain('access.user.view');

    const roleCode = `integration-role-${Date.now()}`;
    try {
      const created = await admin.agent.post('/api/systems/demo-portal/access/roles').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ roleCode, roleName: '集成测试角色', description: '测试后清理' });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ roleCode, isSystem: false, status: 'ACTIVE' });
    } finally {
      const role = await database.iamRole.findFirst({ where: { systemCode: 'demo-portal', roleCode } });
      if (role) {
        await database.iamRolePermission.deleteMany({ where: { roleId: role.id } });
        await database.iamRoleUser.deleteMany({ where: { roleId: role.id } });
        await database.iamRole.delete({ where: { id: role.id } });
        await database.sysAuditLog.deleteMany({ where: { resourceId: role.id } });
      }
    }

    const viewer = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    expect((await viewer.agent.get('/api/systems/demo-portal/access/users')).status).toBe(200);
    expect((await viewer.agent.get('/api/systems/demo-portal/access/roles')).status).toBe(200);
    expect((await viewer.agent.get('/api/systems/demo-portal/access/permissions')).status).toBe(200);
    expect((await viewer.agent.post('/api/systems/demo-portal/access/roles').set('Origin', origin).set('X-CSRF-Token', viewer.csrf).send({ roleCode: 'viewer-cannot-create', roleName: '不可创建' })).status).toBe(403);
  });

  it('serves the tenant organization tree from the database and enforces role permissions', async () => {
    const admin = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const navigation = await admin.agent.get('/api/systems/demo-portal/navigation');
    expect(systemChildren(navigation.body).map((node) => node.menuCode)).toContain('system-organization');

    const tree = await admin.agent.get('/api/systems/demo-portal/organization/units');
    expect(tree.status).toBe(200);
    const root = tree.body.items.find((item: { unitCode: string }) => item.unitCode === 'component-bg');
    const team = tree.body.items.find((item: { unitCode: string }) => item.unitCode === 'tv-rd-center');
    expect(root).toMatchObject({ parentId: null, depth: 0, unitType: 'COMPANY' });
    expect(team.depth).toBe(2);
    expect(root.managerEmployeeId).toBeTruthy();
    const analytics = await admin.agent.get('/api/systems/demo-portal/opportunity-analysis');
    expect(analytics.status).toBe(200);
    expect(analytics.body.organizations.every((item: { id: string }) => tree.body.items.find((unit: { id: string }) => unit.id === item.id)?.isSalesOrg === true)).toBe(true);
    expect((await admin.agent.get(`/api/systems/demo-portal/opportunity-analysis?orgUnitId=${root.id}`)).status).toBe(400);
    const managers = await admin.agent.get('/api/systems/demo-portal/organization/units/manager-options');
    expect(managers.status).toBe(200);
    expect(managers.body.items.some((item: { id: string }) => item.id === root.managerEmployeeId)).toBe(true);
    expect(root).not.toHaveProperty('tenantId');
    expect(root).not.toHaveProperty('createdBy');

    const unitCode = `integration-unit-${Date.now()}`;
    let createdId: string | undefined;
    try {
      const missingManager = await admin.agent.post('/api/systems/demo-portal/organization/units').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ parentId: root.id, unitCode: `${unitCode}-missing`, unitName: '未指定负责人', unitType: 'DEPARTMENT', effectiveAt: '2026-01-01T00:00:00.000Z' });
      expect(missingManager.status).toBe(400);
      const created = await admin.agent.post('/api/systems/demo-portal/organization/units').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ parentId: root.id, unitCode, unitName: '集成测试组织', unitType: 'DEPARTMENT', managerEmployeeId: root.managerEmployeeId, isSalesOrg: true, isRdOrg: true, isPlatformOrg: false, sortNo: 900, status: 'ACTIVE', effectiveAt: '2026-01-01T00:00:00.000Z', expiresAt: null, remark: '测试完成后清理' });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ depth: 1, isSalesOrg: true, isRdOrg: true, isPlatformOrg: false, managerEmployeeId: root.managerEmployeeId });
      createdId = created.body.id;
      const selfParent = await admin.agent.patch(`/api/systems/demo-portal/organization/units/${createdId}`).set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ parentId: createdId, unitCode, unitName: '集成测试组织', unitType: 'DEPARTMENT', managerEmployeeId: root.managerEmployeeId, isSalesOrg: true, isRdOrg: true, isPlatformOrg: false, sortNo: 900, status: 'ACTIVE', effectiveAt: '2026-01-01T00:00:00.000Z', expiresAt: null, remark: null, version: 1 });
      expect(selfParent.status).toBe(409);
    } finally {
      if (createdId) {
        await database.orgUnit.deleteMany({ where: { id: createdId } });
        await database.sysAuditLog.deleteMany({ where: { resourceId: createdId } });
      }
    }

    const viewer = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    expect(systemChildren((await viewer.agent.get('/api/systems/demo-portal/navigation')).body).map((node) => node.menuCode)).not.toContain('system-organization');
    expect((await viewer.agent.get('/api/systems/demo-portal/organization/units')).status).toBe(403);
  });

  it('creates an employee with a required organization, login account and viewer access role', async () => {
    const admin = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const navigation = await admin.agent.get('/api/systems/demo-portal/navigation');
    expect(systemChildren(navigation.body).map((node) => node.menuCode)).toContain('system-employees');
    const options = await admin.agent.get('/api/systems/demo-portal/organization/employees/options');
    expect(options.status).toBe(200);
    expect(options.body.posts.some((item: { value: string }) => item.value === 'sales-representative')).toBe(true);
    expect(options.body.jobTitles.some((item: { value: string }) => item.value === 'SPECIALIST')).toBe(true);
    const organization = options.body.organizations.find((item: { unitName: string }) => item.unitName === '销售一部');
    const position = options.body.positions.find((item: { positionCode: string }) => item.positionCode === 'sales-representative');
    const suffix = Date.now().toString(); const account = `employee.${suffix}`; let employeeId: string | undefined;
    try {
      const rejected = await admin.agent.post('/api/systems/demo-portal/organization/employees').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ employeeName: '缺少部门', account, initialPassword: testPassword('INITIAL_VIEWER_PASSWORD'), positionId: position.id, employmentType: 'FULL_TIME', status: 'ACTIVE', effectiveAt: '2026-01-01T00:00:00.000Z' });
      expect(rejected.status).toBe(400);
      const created = await admin.agent.post('/api/systems/demo-portal/organization/employees').set('Origin', origin).set('X-CSRF-Token', admin.csrf).send({ employeeName: '集成员工', account, initialPassword: testPassword('INITIAL_VIEWER_PASSWORD'), orgUnitId: organization.id, postValue: 'sales-representative', jobTitleValue: 'SPECIALIST', employmentType: 'FULL_TIME', email: 'integration@example.com', mobile: '13800000000', status: 'ACTIVE', effectiveAt: '2026-01-01T00:00:00.000Z', remark: '测试完成后清理' });
      expect(created.status).toBe(201); employeeId = created.body.id;
      expect(created.body.employeeNo).toMatch(/^1[0-9]{6}$/);
      expect(created.body).toMatchObject({ account, orgUnitName: '销售一部', positionName: '销售代表', postValue: 'sales-representative', jobTitleValue: 'SPECIALIST' });
      const list = await admin.agent.get(`/api/systems/demo-portal/organization/employees?keyword=${created.body.employeeNo}`);
      expect(list.status).toBe(200); expect(list.body.items[0]).not.toHaveProperty('email'); expect(list.body.items[0].maskedMobile).toBe('138****0000');
      const employeeLogin = await login(account, testPassword('INITIAL_VIEWER_PASSWORD'));
      expect((await employeeLogin.agent.get('/api/systems/demo-portal/navigation')).status).toBe(200);
      expect((await employeeLogin.agent.get('/api/systems/demo-portal/organization/employees')).status).toBe(403);
    } finally {
      if (employeeId) {
        const user = await database.iamUser.findFirst({ where: { employeeId } });
        if (user) { await database.iamRoleUser.deleteMany({ where: { userId: user.id } }); await database.orgUserAssignment.deleteMany({ where: { userId: user.id } }); await database.iamUser.delete({ where: { id: user.id } }); }
        await database.orgEmployeeAssignment.deleteMany({ where: { employeeId } });
        await database.orgEmployment.deleteMany({ where: { employeeId } });
        await database.orgEmployee.delete({ where: { id: employeeId } });
        await database.sysAuditLog.deleteMany({ where: { resourceId: employeeId } });
      }
    }
    const viewer = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    expect((await viewer.agent.get('/api/systems/demo-portal/organization/employees')).status).toBe(403);
  });

  it('serves the database-backed resource menu only to the authorized system manager', async () => {
    const admin = await login('admin', testPassword('INITIAL_ADMIN_PASSWORD'));
    const navigation = await admin.agent.get('/api/systems/demo-portal/navigation');
    const menu = systemChildren(navigation.body).find((node) => node.menuCode === 'system-menus');
    expect(menu).toBeDefined();
    expect(menu?.allowedActions?.map((action) => action.actionCode)).toEqual(expect.arrayContaining(['view', 'manage', 'export']));

    const pages = await admin.agent.get('/api/systems/demo-portal/resource-menu/pages');
    expect(pages.status).toBe(200);
    expect(pages.body.every((page: { status: string }) => page.status === 'ACTIVE')).toBe(true);
    const demoApplication = await database.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } });
    expect(await database.sysPageResource.count({ where: { applicationId: demoApplication.id, pageCode: { in: obsoleteResourceCodes } } })).toBe(0);
    expect(await database.uiMenu.count({ where: { systemCode: 'demo-portal', menuCode: { in: obsoleteResourceCodes } } })).toBe(0);
    expect(await database.sysPermission.count({ where: { applicationId: demoApplication.id, resourceCode: { in: obsoleteResourceCodes } } })).toBe(0);
    expect(pages.body.map((page: { pageCode: string }) => page.pageCode)).toEqual(expect.arrayContaining(['demo-portal', 'system', 'system-menus']));
    const resourceMenu = pages.body.find((page: { pageCode: string }) => page.pageCode === 'system-menus');
    expect(resourceMenu).toMatchObject({ pageName: '资源菜单', pageType: 'PAGE', routePath: '/showcase/system/menus' });
    expect(resourceMenu).not.toHaveProperty('tenantId');
    expect(resourceMenu).not.toHaveProperty('applicationId');
    expect(resourceMenu).not.toHaveProperty('createdBy');
    expect(resourceMenu).not.toHaveProperty('updatedBy');

    const buttons = await admin.agent.get(`/api/systems/demo-portal/resource-menu/pages/${resourceMenu.id}/buttons`);
    expect(buttons.status).toBe(200);
    expect(buttons.body.tool.map((button: { buttonCode: string }) => button.buttonCode)).toEqual(expect.arrayContaining(['view', 'manage', 'export']));
    expect(buttons.body.tool[0]).not.toHaveProperty('createdBy');
    expect(buttons.body.tool[0]).not.toHaveProperty('updatedBy');
    expect((await admin.agent.get('/api/systems/demo-portal/resource-menu/navigation-mounts')).status).toBe(200);
    expect((await admin.agent.get('/api/systems/demo-portal/resource-menu/export')).status).toBe(200);

    const viewer = await login('viewer', testPassword('INITIAL_VIEWER_PASSWORD'));
    expect((await viewer.agent.get('/api/systems/demo-portal/resource-menu/pages')).status).toBe(403);
    expect((await viewer.agent.get('/api/systems/demo-portal/resource-menu/export')).status).toBe(403);
  });

});
