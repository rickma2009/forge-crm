import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
};

const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: required('DATABASE_URL') }) });
const baseUrl = required('PERF_BASE_URL').replace(/\/$/, '');
const origin = new URL(baseUrl).origin;
const targetMenusPerSystem = 250;
const actionCodes = ['view', 'create', 'update', 'delete', 'import', 'export', 'approve', 'archive'];

async function clearFixture(): Promise<void> {
  const fixtureRoles = await database.iamRole.findMany({ where: { roleCode: { startsWith: 'perf-role-' } }, select: { id: true } });
  const roleIds = fixtureRoles.map((item) => item.id);
  if (roleIds.length) {
    await database.$transaction([
      database.iamRolePermission.deleteMany({ where: { roleId: { in: roleIds } } }),
      database.iamRoleUser.deleteMany({ where: { roleId: { in: roleIds } } }),
      database.iamRole.deleteMany({ where: { id: { in: roleIds } } }),
    ]);
  }
  const fixtureMenus = await database.uiMenu.findMany({ where: { menuCode: { startsWith: 'perf-' } }, select: { id: true } });
  const menuIds = fixtureMenus.map((item) => item.id);
  if (!menuIds.length) return;
  await database.$transaction([
    database.iamRolePermission.deleteMany({ where: { menuId: { in: menuIds } } }),
    database.uiMenuAction.deleteMany({ where: { menuId: { in: menuIds } } }),
    database.uiMenu.deleteMany({ where: { id: { in: menuIds } } }),
  ]);
}

async function installFixture(): Promise<void> {
  await clearFixture();
  for (const systemCode of ['demo-portal', 'secondary-demo']) {
    const existing = await database.uiMenu.count({ where: { systemCode } });
    const missing = Math.max(0, targetMenusPerSystem - existing);
    if (!missing) continue;
    await database.uiMenu.createMany({ data: Array.from({ length: missing }, (_, index) => ({
      systemCode,
      menuCode: `perf-page-${String(index + 1).padStart(3, '0')}`,
      menuName: `性能样例 ${index + 1}`,
      nodeType: 'PAGE' as const,
      routePath: `/showcase/performance/${index + 1}`,
      iconKey: 'table',
      sortNo: 1000 + index,
    })) });
    const menus = await database.uiMenu.findMany({ where: { systemCode, menuCode: { startsWith: 'perf-' } }, select: { id: true } });
    await database.uiMenuAction.createMany({ data: menus.flatMap((menu) => actionCodes.map((actionCode, index) => ({ menuId: menu.id, actionCode, actionName: actionCode, actionType: actionCode.toUpperCase(), sortNo: 10 + index }))) });
    const actions = await database.uiMenuAction.findMany({ where: { menuId: { in: menus.map((menu) => menu.id) } }, select: { id: true, menuId: true } });
    const manager = await database.iamRole.findFirstOrThrow({ where: { systemCode, isSystem: true } });
    await database.iamRolePermission.createMany({ data: [
      ...menus.map((menu) => ({ systemCode, roleId: manager.id, menuId: menu.id, permissionType: 'MENU' as const })),
      ...actions.map((action) => ({ systemCode, roleId: manager.id, menuId: action.menuId, menuActionId: action.id, permissionType: 'ACTION' as const })),
    ] });
  }
  const admin = await database.iamUser.findUniqueOrThrow({ where: { normalizedAccount: 'admin' } });
  await database.iamRole.createMany({ data: Array.from({ length: 19 }, (_, index) => ({
    systemCode: 'demo-portal',
    roleCode: `perf-role-${String(index + 1).padStart(2, '0')}`,
    roleName: `性能角色 ${index + 1}`,
    roleType: 'BUSINESS' as const,
  })) });
  const performanceRoles = await database.iamRole.findMany({ where: { systemCode: 'demo-portal', roleCode: { startsWith: 'perf-role-' } }, select: { id: true } });
  await database.iamRoleUser.createMany({ data: performanceRoles.map((role) => ({ roleId: role.id, userId: admin.id })) });
}

function mergeCookies(target: Map<string, string>, response: Response): void {
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator > 0) target.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

const cookieHeader = (cookies: Map<string, string>) => [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');

interface PerformanceNode { allowedActions?: unknown[]; children: PerformanceNode[] }
const flattenNodes = (nodes: PerformanceNode[]): PerformanceNode[] => nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);

async function main(): Promise<void> {
  await installFixture();
  const cookies = new Map<string, string>();
  try {
    const bootstrap = await fetch(`${baseUrl}/api/auth/session`);
    mergeCookies(cookies, bootstrap);
    const csrf = cookies.get('ipl_csrf');
    if (!csrf) throw new Error('CSRF_COOKIE_MISSING');
    const login = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin, 'x-csrf-token': csrf, cookie: cookieHeader(cookies) }, body: JSON.stringify({ account: 'admin', password: required('PERF_ACCOUNT_PASSWORD') }) });
    mergeCookies(cookies, login);
    if (!login.ok) throw new Error(`LOGIN_FAILED:${login.status}`);
    const requestNavigation = async (): Promise<void> => {
      const response = await fetch(`${baseUrl}/api/systems/demo-portal/navigation`, { headers: { cookie: cookieHeader(cookies) } });
      if (!response.ok) throw new Error(`NAVIGATION_FAILED:${response.status}`);
      const result = await response.json() as { systemCode?: string; items?: PerformanceNode[] };
      if (!Array.isArray(result.items)) throw new Error('NAVIGATION_SHAPE_INVALID');
      const nodes = flattenNodes(result.items);
      if (result.systemCode !== 'demo-portal' || nodes.length !== targetMenusPerSystem) throw new Error(`NAVIGATION_CONTENT_INVALID:${nodes.length}`);
      if (nodes.some((node) => (node.allowedActions?.length ?? 0) > actionCodes.length)) throw new Error('NAVIGATION_ACTION_LIMIT_EXCEEDED');
    };
    for (let index = 0; index < 100; index += 1) await requestNavigation();
    const durations: number[] = [];
    for (let index = 0; index < 100; index += 1) {
      const startedAt = performance.now();
      await requestNavigation();
      durations.push(performance.now() - startedAt);
    }
    durations.sort((left, right) => left - right);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1]!;
    console.log(`PASS navigation P95 ${p95.toFixed(1)}ms (100 samples after 100 warmups; 2 systems × 250 menus; ≤8 actions/page; admin 20 roles)`);
    if (p95 > 300) throw new Error(`PERFORMANCE_BUDGET_EXCEEDED:${p95.toFixed(1)}`);
  } finally {
    await clearFixture();
    await database.$disconnect();
  }
}

void main();
