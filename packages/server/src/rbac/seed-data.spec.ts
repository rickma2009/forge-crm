// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- canonical seed intentionally lives outside src/rootDir.
// @ts-ignore Import is valid under Jest/ts-jest; the production compiler deliberately excludes prisma seed definitions.
import { seedDefinition } from '../../prisma/seed-data';

describe('digital employee navigation seed', () => {
  const menus = seedDefinition.menus.filter((menu) => menu.systemCode === 'demo-portal');

  it('keeps the legacy workbench route as a page under the digital employee directory', () => {
    const root = menus.find((menu) => menu.menuCode === 'digital-employee');
    const home = menus.find((menu) => menu.menuCode === 'digital-employee-home');
    expect(root).toMatchObject({ nodeType: 'GROUP', parentCode: null, routePath: null });
    expect(home).toMatchObject({ nodeType: 'PAGE', parentCode: 'digital-employee', routePath: '/showcase/digital-employee' });
  });

  it('places active scenarios and mail processing under the agreed second-level categories', () => {
    const categories = menus.filter((menu) => menu.parentCode === 'digital-employee' && menu.nodeType === 'GROUP');
    expect(categories.map((menu) => menu.menuName)).toEqual(['公共', '营销', '供应链', '研发', '财务', '生产与质量']);
    const scenarios = menus.filter((menu) => menu.menuCode.startsWith('de-scene-'));
    expect(scenarios).toHaveLength(9);
    expect(scenarios.every((menu) => menu.nodeType === 'PAGE' && menu.routePath?.startsWith('/showcase/digital-employee/scenarios/'))).toBe(true);
    expect(new Set(scenarios.map((menu) => menu.routePath)).size).toBe(scenarios.length);
    expect(scenarios.every((scene) => categories.some((category) => category.menuCode === scene.parentCode))).toBe(true);
    expect(menus.find((menu) => menu.menuCode === 'de-mail-processing')).toMatchObject({ menuName: '邮件处理', parentCode: 'de-public', routePath: '/showcase/digital-employee/mail' });
    expect(seedDefinition.actions.filter((action) => action.menuCode === 'de-mail-processing').map((action) => action.actionCode)).toEqual(expect.arrayContaining(['manage', 'execute']));
    expect(['de-scene-rfq', 'de-scene-smt', 'de-scene-trace'].some((code) => menus.some((menu) => menu.menuCode === code))).toBe(false);
    expect(scenarios.map((menu) => menu.menuName)).toEqual(['舆情监控', '电商评论', '采购订单执行', '生产工单执行', '库存管理', '研发过程执行', '大宗商品监控', '质量过程执行', '客诉及质量事件']);
  });

  it('grants scene actions only through the manager role seed', () => {
    const scenarioCodes = new Set(menus.filter((menu) => menu.menuCode.startsWith('de-scene-')).map((menu) => menu.menuCode));
    const managerGrants = seedDefinition.grants.filter((grant) => grant.roleCode === 'system-manager');
    const viewerGrants = seedDefinition.grants.filter((grant) => grant.roleCode === 'viewer');
    for (const menuCode of scenarioCodes) {
      expect(managerGrants.some((grant) => grant.menuCode === menuCode && grant.actionCode === null)).toBe(true);
      expect(viewerGrants.some((grant) => grant.menuCode === menuCode)).toBe(false);
      expect(seedDefinition.actions.some((action) => action.menuCode === menuCode && action.actionCode === 'view')).toBe(true);
      expect(seedDefinition.actions.some((action) => action.menuCode === menuCode && action.actionCode === 'manage')).toBe(true);
      expect(seedDefinition.actions.some((action) => action.menuCode === menuCode && action.actionCode === 'execute')).toBe(true);
    }
  });
});
