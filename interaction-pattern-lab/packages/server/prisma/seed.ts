import { hash } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client';
import { databaseRowsToSeedDefinition } from '../src/rbac/database-definition';
import { validateSeedDefinition } from '../src/rbac/seed-definition';
import { seedDefinition } from './seed-data';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

async function main(): Promise<void> {
  const rawSystems = required('SYSTEM_CODES').split(',').map((value) => value.trim());
  if (rawSystems.some((value) => !value)) throw new Error('SYSTEM_CODES_EMPTY_ITEM');
  const parsedSystems = rawSystems.map((value) => systemCodeSchema.parse(value));
  if (new Set(parsedSystems).size !== parsedSystems.length) throw new Error('SYSTEM_CODES_DUPLICATE');
  const configuredSystems = new Set(parsedSystems);
  for (const systemCode of seedDefinition.systems) {
    if (!configuredSystems.has(systemCode)) throw new Error(`SYSTEM_CODE_NOT_ALLOWED:${systemCode}`);
  }
  const definitionErrors = validateSeedDefinition(seedDefinition);
  if (definitionErrors.length) throw new Error(`SEED_DEFINITION_INVALID\n${definitionErrors.join('\n')}`);

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: required('DATABASE_URL') }) });
  const adminPasswordHash = await hash(required('INITIAL_ADMIN_PASSWORD'));
  const viewerPasswordHash = await hash(required('INITIAL_VIEWER_PASSWORD'));

  try {
    await client.$transaction(async (database) => {
      const users = new Map<string, string>();
      for (const candidate of [
        { account: 'admin', displayName: '系统管理员', passwordHash: adminPasswordHash },
        { account: 'viewer', displayName: '受限演示用户', passwordHash: viewerPasswordHash },
      ]) {
        const user = await database.iamUser.upsert({
          where: { normalizedAccount: candidate.account },
          update: { account: candidate.account, displayName: candidate.displayName, passwordHash: candidate.passwordHash, status: 'ACTIVE', version: { increment: 1 } },
          create: { account: candidate.account, normalizedAccount: candidate.account, displayName: candidate.displayName, passwordHash: candidate.passwordHash },
        });
        users.set(candidate.account, user.id);
      }

      const roles = new Map<string, string>();
      for (const candidate of seedDefinition.roles) {
        const role = await database.iamRole.upsert({
          where: { systemCode_roleCode: { systemCode: candidate.systemCode, roleCode: candidate.roleCode } },
          update: { roleName: candidate.roleName ?? candidate.roleCode, roleType: candidate.isSystem ? 'SYSTEM' : 'BUSINESS', isSystem: candidate.isSystem, status: 'ACTIVE', version: { increment: 1 } },
          create: { systemCode: candidate.systemCode, roleCode: candidate.roleCode, roleName: candidate.roleName ?? candidate.roleCode, roleType: candidate.isSystem ? 'SYSTEM' : 'BUSINESS', isSystem: candidate.isSystem },
        });
        roles.set(`${candidate.systemCode}:${candidate.roleCode}`, role.id);
      }

      const menus = new Map<string, string>();
      for (const candidate of seedDefinition.menus) {
        const parentId = candidate.parentCode ? menus.get(`${candidate.systemCode}:${candidate.parentCode}`) : null;
        if (candidate.parentCode && !parentId) throw new Error(`SEED_PARENT_NOT_READY:${candidate.systemCode}:${candidate.menuCode}`);
        const menu = await database.uiMenu.upsert({
          where: { systemCode_menuCode: { systemCode: candidate.systemCode, menuCode: candidate.menuCode } },
          update: { menuName: candidate.menuName ?? candidate.menuCode, nodeType: candidate.nodeType, parentId, routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'overview', sortNo: candidate.sortNo ?? 0, status: 'ACTIVE', version: { increment: 1 } },
          create: { systemCode: candidate.systemCode, menuCode: candidate.menuCode, menuName: candidate.menuName ?? candidate.menuCode, nodeType: candidate.nodeType, parentId, routePath: candidate.routePath, iconKey: candidate.iconKey ?? 'overview', sortNo: candidate.sortNo ?? 0 },
        });
        menus.set(`${candidate.systemCode}:${candidate.menuCode}`, menu.id);
      }

      const actions = new Map<string, string>();
      for (const candidate of seedDefinition.actions) {
        const menuId = menus.get(`${candidate.systemCode}:${candidate.menuCode}`);
        if (!menuId) throw new Error(`SEED_ACTION_MENU_MISSING:${candidate.systemCode}:${candidate.menuCode}`);
        const action = await database.uiMenuAction.upsert({
          where: { menuId_actionCode: { menuId, actionCode: candidate.actionCode } },
          update: { actionName: candidate.actionName ?? candidate.actionCode, actionType: candidate.actionType ?? 'CUSTOM', sortNo: candidate.sortNo ?? 0, status: 'ACTIVE', version: { increment: 1 } },
          create: { menuId, actionCode: candidate.actionCode, actionName: candidate.actionName ?? candidate.actionCode, actionType: candidate.actionType ?? 'CUSTOM', sortNo: candidate.sortNo ?? 0 },
        });
        actions.set(`${candidate.systemCode}:${candidate.menuCode}:${candidate.actionCode}`, action.id);
      }

      const memberships = [
        { account: 'admin', systemCode: 'demo-portal', roleCode: 'system-manager' },
        { account: 'viewer', systemCode: 'demo-portal', roleCode: 'viewer' },
      ];
      for (const membership of memberships) {
        const userId = users.get(membership.account);
        const roleId = roles.get(`${membership.systemCode}:${membership.roleCode}`);
        if (!userId || !roleId) throw new Error('SEED_MEMBERSHIP_REFERENCE_MISSING');
        await database.iamRoleUser.upsert({
          where: { roleId_userId: { roleId, userId } },
          update: { status: 'ACTIVE' },
          create: { roleId, userId },
        });
      }

      for (const grant of seedDefinition.grants) {
        const roleId = roles.get(`${grant.systemCode}:${grant.roleCode}`);
        const menuId = menus.get(`${grant.systemCode}:${grant.menuCode}`);
        const menuActionId = grant.actionCode ? actions.get(`${grant.systemCode}:${grant.menuCode}:${grant.actionCode}`) : null;
        if (!roleId || !menuId || (grant.actionCode && !menuActionId)) throw new Error('SEED_GRANT_REFERENCE_MISSING');
        const permissionType = grant.actionCode ? 'ACTION' : 'MENU';
        const existing = await database.iamRolePermission.findFirst({ where: { roleId, menuId, menuActionId, permissionType } });
        if (existing) await database.iamRolePermission.update({ where: { id: existing.id }, data: { systemCode: grant.systemCode, status: 'ACTIVE', version: { increment: 1 } } });
        else await database.iamRolePermission.create({ data: { systemCode: grant.systemCode, roleId, menuId, menuActionId, permissionType } });
      }

      type DictionarySeed = { code: string; name: string; parentCode?: string; groupCode: string; description: string; sortNo: number; itemsEditable: boolean; items: ReadonlyArray<readonly [string, string, string]> };
      const dictionarySeeds: DictionarySeed[] = [
        { code: 'customer_category', name: '客户类别', groupCode: 'customer', description: '客户主数据的业务类别', sortNo: 10, itemsEditable: true, items: [['potential', '潜在客户', 'blue'], ['formal', '正式客户', 'green'], ['partner', '合作伙伴', 'purple']] },
        { code: 'customer_status', name: '客户状态', groupCode: 'customer', description: '客户记录的当前使用状态', sortNo: 20, itemsEditable: true, items: [['active', '启用', 'green'], ['paused', '暂停', 'orange'], ['archived', '归档', 'gray']] },
        { code: 'customer_industry', name: '所属行业', groupCode: 'customer', description: '客户所属行业分类', sortNo: 30, itemsEditable: true, items: [['manufacturing', '制造', 'blue'], ['retail', '零售', 'orange'], ['technology', '科技', 'purple'], ['service', '服务', 'green'], ['other', '其他', 'gray']] },
        { code: 'customer_level', name: '客户等级', groupCode: 'customer', description: '客户分层等级', sortNo: 40, itemsEditable: true, items: [['a', 'A', 'red'], ['b', 'B', 'orange'], ['c', 'C', 'blue'], ['d', 'D', 'gray']] },
        { code: 'material_category', name: '物料类别', groupCode: 'material', description: '物料分类总类，可独立维护字典值并包含下级分类', sortNo: 100, itemsEditable: true, items: [] },
        { code: 'material_major_category', name: '物料大类', parentCode: 'material_category', groupCode: 'material', description: '物料一级分类', sortNo: 110, itemsEditable: true, items: [['raw_material', '原材料', 'blue'], ['finished_goods', '成品', 'green']] },
        { code: 'material_middle_category', name: '物料中类', parentCode: 'material_major_category', groupCode: 'material', description: '物料二级分类', sortNo: 120, itemsEditable: true, items: [['electronic', '电子类', 'purple'], ['structural', '结构类', 'orange']] },
        { code: 'material_minor_category', name: '物料小类', parentCode: 'material_middle_category', groupCode: 'material', description: '物料三级分类', sortNo: 130, itemsEditable: true, items: [['resistor', '电阻', 'red'], ['connector', '连接器', 'gray']] },
        { code: 'yes_no', name: '是否', groupCode: 'common', description: '系统初始化固定的是/否标准值', sortNo: 200, itemsEditable: false, items: [['1', '是', 'green'], ['0', '否', 'gray']] },
      ];
      const dictionaries = new Map<string, string>();
      for (const dictionarySeed of dictionarySeeds) {
        const dictionary = await database.sysDictionary.upsert({
          where: { systemCode_dictCode: { systemCode: 'demo-portal', dictCode: dictionarySeed.code } },
          update: { dictName: dictionarySeed.name, groupCode: dictionarySeed.groupCode, description: dictionarySeed.description, sortNo: dictionarySeed.sortNo, status: 'ACTIVE', itemsEditable: dictionarySeed.itemsEditable, updatedBy: 'seed', version: { increment: 1 } },
          create: { systemCode: 'demo-portal', dictCode: dictionarySeed.code, dictName: dictionarySeed.name, groupCode: dictionarySeed.groupCode, description: dictionarySeed.description, sortNo: dictionarySeed.sortNo, itemsEditable: dictionarySeed.itemsEditable, createdBy: 'seed', updatedBy: 'seed' },
        });
        dictionaries.set(dictionarySeed.code, dictionary.id);
      }
      for (const dictionarySeed of dictionarySeeds) {
        const dictionaryId = dictionaries.get(dictionarySeed.code);
        if (!dictionaryId) throw new Error(`SEED_DICTIONARY_REFERENCE_MISSING:${dictionarySeed.code}`);
        const parentId = dictionarySeed.parentCode ? dictionaries.get(dictionarySeed.parentCode) : null;
        if (dictionarySeed.parentCode && !parentId) throw new Error(`SEED_DICTIONARY_PARENT_MISSING:${dictionarySeed.parentCode}`);
        await database.sysDictionary.update({ where: { id: dictionaryId }, data: { parentId } });
        for (const [value, name, colorKey] of dictionarySeed.items) {
          await database.sysDictionaryItem.upsert({
            where: { dictionaryId_itemValue: { dictionaryId, itemValue: value } },
            update: { itemName: name, itemCode: value, colorKey, sortNo: dictionarySeed.items.findIndex((item) => item[0] === value) * 10 + 10, status: 'ACTIVE', updatedBy: 'seed', version: { increment: 1 } },
            create: { dictionaryId, itemCode: value, itemValue: value, itemName: name, colorKey, sortNo: dictionarySeed.items.findIndex((item) => item[0] === value) * 10 + 10, createdBy: 'seed', updatedBy: 'seed' },
          });
        }
      }

      const customerViewConfig = {
        columns: [
          ['customerCode', true, true, false, 110, 'left'], ['customerName', true, true, false, 170, null], ['shortName', true, true, false, 110, null],
          ['categoryValue', true, true, false, 90, null], ['statusValue', true, true, false, 80, null], ['industryValue', true, true, true, 90, null],
          ['levelValue', true, true, true, 80, null], ['salesOwnerName', true, true, true, 90, null], ['address', true, false, false, 190, null], ['remark', false, false, false, 180, null],
        ].map(([key, visible, queryVisible, queryCollapsed, width, fixed]) => ({ key, visible, queryVisible, queryCollapsed, width, fixed })),
        pageSize: 20,
        filters: {},
        sort: { field: 'updatedAt', direction: 'desc' },
      };
      const systemView = await database.uiSystemListView.upsert({
        where: { systemCode_pageCode_actionCode_viewCode: { systemCode: 'demo-portal', pageCode: 'customer-directory', actionCode: 'view', viewCode: 'default' } },
        update: { viewName: '客户默认视图', isDefault: true, allowPersonalOverride: true, priority: 10, status: 'ACTIVE', config: customerViewConfig, updatedBy: 'seed', version: { increment: 1 } },
        create: { systemCode: 'demo-portal', pageCode: 'customer-directory', actionCode: 'view', viewCode: 'default', viewName: '客户默认视图', isDefault: true, allowPersonalOverride: true, priority: 10, config: customerViewConfig, createdBy: 'seed', updatedBy: 'seed' },
      });
      for (const roleCode of ['system-manager', 'viewer']) {
        const roleId = roles.get(`demo-portal:${roleCode}`);
        if (!roleId) throw new Error(`SEED_VIEW_ROLE_MISSING:${roleCode}`);
        await database.iamRoleListView.upsert({ where: { roleId_viewId: { roleId, viewId: systemView.id } }, update: { status: 'ACTIVE' }, create: { roleId, viewId: systemView.id } });
      }

      const customers = [
        ['C2026090001', '星海智能制造有限公司', '星海智造', 'formal', '广州市黄埔区创新大道 18 号', 'active', 'manufacturing', 'a', 'sales-lin', '林晓', '重点客户，关注年度框架合作'],
        ['C2026090002', '云杉科技服务有限公司', '云杉科技', 'potential', '深圳市南山区科技园 6 号', 'active', 'technology', 'b', 'sales-zhou', '周然', '处于方案交流阶段'],
        ['C2026090003', '远帆零售管理有限公司', '远帆零售', 'partner', '杭州市滨江区江南大道 88 号', 'paused', 'retail', 'c', 'sales-chen', '陈沐', '暂缓新增项目'],
      ];
      for (const [customerCode, customerName, shortName, categoryValue, address, statusValue, industryValue, levelValue, salesOwnerKey, salesOwnerName, remark] of customers) {
        await database.crmCustomer.upsert({
          where: { systemCode_customerCode: { systemCode: 'demo-portal', customerCode } },
          update: { customerName, shortName, categoryValue, address, statusValue, industryValue, levelValue, salesOwnerKey, salesOwnerName, remark, updatedBy: 'seed' },
          create: { systemCode: 'demo-portal', customerCode, customerName, shortName, categoryValue, address, statusValue, industryValue, levelValue, salesOwnerKey, salesOwnerName, remark, createdBy: 'seed', updatedBy: 'seed' },
        });
      }

      const systemCodes = [...configuredSystems];
      const [persistedMenus, persistedActions, persistedRoles, persistedGrants] = await Promise.all([
        database.uiMenu.findMany({ where: { systemCode: { in: systemCodes }, status: 'ACTIVE' } }),
        database.uiMenuAction.findMany({ where: { status: 'ACTIVE', menu: { systemCode: { in: systemCodes }, status: 'ACTIVE' } } }),
        database.iamRole.findMany({ where: { systemCode: { in: systemCodes }, status: 'ACTIVE' } }),
        database.iamRolePermission.findMany({ where: { systemCode: { in: systemCodes }, status: 'ACTIVE', role: { status: 'ACTIVE' }, menu: { status: 'ACTIVE' } } }),
      ]);
      const persistedDefinition = databaseRowsToSeedDefinition({ systems: systemCodes, menus: persistedMenus, actions: persistedActions, roles: persistedRoles, grants: persistedGrants });
      const persistedErrors = validateSeedDefinition(persistedDefinition);
      if (persistedErrors.length) throw new Error(`PERSISTED_RBAC_CONFIGURATION_INVALID\n${persistedErrors.join('\n')}`);
    }, { isolationLevel: 'Serializable' });
  } finally {
    await client.$disconnect();
  }
}

void main();
