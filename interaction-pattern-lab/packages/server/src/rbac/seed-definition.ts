export interface SeedDefinition {
  systems: string[];
  menus: Array<{ systemCode: string; menuCode: string; menuName?: string; nodeType: 'GROUP' | 'PAGE'; parentCode: string | null; routePath: string | null; iconKey?: string; sortNo?: number }>;
  actions: Array<{ systemCode: string; menuCode: string; actionCode: string; actionName?: string; actionType?: string; sortNo?: number }>;
  roles: Array<{ systemCode: string; roleCode: string; roleName?: string; isSystem: boolean }>;
  grants: Array<{ systemCode: string; roleCode: string; menuCode: string; actionCode: string | null }>;
}

const key = (...parts: Array<string | null>) => parts.join(':');

export function validateSeedDefinition(definition: SeedDefinition): string[] {
  const errors = new Set<string>();
  const systems = new Set(definition.systems);
  const menus = new Map(definition.menus.map((menu) => [key(menu.systemCode, menu.menuCode), menu]));
  const roles = new Set(definition.roles.map((role) => key(role.systemCode, role.roleCode)));
  const actions = new Set(definition.actions.map((action) => key(action.systemCode, action.menuCode, action.actionCode)));
  const grants = new Set(definition.grants.map((grant) => key(grant.systemCode, grant.roleCode, grant.menuCode, grant.actionCode)));

  for (const systemCode of systems) {
    const managers = definition.roles.filter((role) => role.systemCode === systemCode && role.isSystem);
    if (managers.length !== 1) errors.add(`SYSTEM_MANAGER_COUNT:${systemCode}:${managers.length}`);
  }

  for (const menu of definition.menus) {
    if (!systems.has(menu.systemCode)) errors.add(`MENU_SYSTEM_NOT_FOUND:${menu.systemCode}:${menu.menuCode}`);
    if (menu.parentCode) {
      const parent = menus.get(key(menu.systemCode, menu.parentCode));
      if (!parent) errors.add(`MENU_PARENT_NOT_FOUND:${menu.systemCode}:${menu.menuCode}:${menu.parentCode}`);
      else {
        if (parent.nodeType !== 'GROUP') errors.add(`MENU_PARENT_NOT_GROUP:${menu.systemCode}:${menu.menuCode}:${menu.parentCode}`);
      }
    }
    const seen = new Set<string>([menu.menuCode]);
    let cursor = menu.parentCode;
    while (cursor) {
      if (seen.has(cursor)) {
        errors.add(`MENU_PARENT_CYCLE:${menu.systemCode}:${menu.menuCode}`);
        break;
      }
      seen.add(cursor);
      cursor = menus.get(key(menu.systemCode, cursor))?.parentCode ?? null;
    }
  }

  for (const action of definition.actions) {
    const menu = menus.get(key(action.systemCode, action.menuCode));
    if (!menu) errors.add(`ACTION_MENU_NOT_FOUND:${action.systemCode}:${action.menuCode}:${action.actionCode}`);
    else if (menu.nodeType !== 'PAGE') errors.add(`ACTION_MENU_NOT_PAGE:${action.systemCode}:${action.menuCode}:${action.actionCode}`);
  }

  for (const grant of definition.grants) {
    if (!roles.has(key(grant.systemCode, grant.roleCode))) errors.add(`GRANT_ROLE_NOT_FOUND:${grant.systemCode}:${grant.roleCode}`);
    if (!menus.has(key(grant.systemCode, grant.menuCode))) errors.add(`GRANT_MENU_NOT_FOUND:${grant.systemCode}:${grant.menuCode}`);
    if (grant.actionCode) {
      if (!actions.has(key(grant.systemCode, grant.menuCode, grant.actionCode))) errors.add(`GRANT_ACTION_NOT_FOUND:${grant.systemCode}:${grant.menuCode}:${grant.actionCode}`);
      if (!grants.has(key(grant.systemCode, grant.roleCode, grant.menuCode, null))) {
        errors.add(`ACTION_REQUIRES_MENU_GRANT:${grant.systemCode}:${grant.roleCode}:${grant.menuCode}:${grant.actionCode}`);
      }
    }
  }

  for (const manager of definition.roles.filter((role) => role.isSystem)) {
    for (const menu of definition.menus.filter((item) => item.systemCode === manager.systemCode)) {
      if (!grants.has(key(manager.systemCode, manager.roleCode, menu.menuCode, null))) {
        errors.add(`SYSTEM_MANAGER_MENU_GRANT_MISSING:${manager.systemCode}:${menu.menuCode}`);
      }
    }
    for (const action of definition.actions.filter((item) => item.systemCode === manager.systemCode)) {
      if (!grants.has(key(manager.systemCode, manager.roleCode, action.menuCode, action.actionCode))) {
        errors.add(`SYSTEM_MANAGER_ACTION_GRANT_MISSING:${manager.systemCode}:${action.menuCode}:${action.actionCode}`);
      }
    }
  }

  return [...errors].sort();
}
