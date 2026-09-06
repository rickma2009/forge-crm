import type { SeedDefinition } from './seed-definition';

interface MenuRow {
  id: string;
  systemCode: string;
  menuCode: string;
  menuName: string;
  nodeType: 'GROUP' | 'PAGE';
  parentId: string | null;
  routePath: string | null;
}

interface ActionRow {
  id: string;
  menuId: string;
  actionCode: string;
  actionName: string;
  actionType: string;
}

interface RoleRow {
  id: string;
  systemCode: string;
  roleCode: string;
  roleName: string;
  isSystem: boolean;
}

interface GrantRow {
  systemCode: string;
  roleId: string;
  menuId: string;
  menuActionId: string | null;
}

export interface DatabaseDefinitionRows {
  systems: string[];
  menus: MenuRow[];
  actions: ActionRow[];
  roles: RoleRow[];
  grants: GrantRow[];
}

export function databaseRowsToSeedDefinition(rows: DatabaseDefinitionRows): SeedDefinition {
  const menusById = new Map(rows.menus.map((menu) => [menu.id, menu]));
  const rolesById = new Map(rows.roles.map((role) => [role.id, role]));
  const actionsById = new Map(rows.actions.map((action) => [action.id, action]));

  return {
    systems: rows.systems,
    menus: rows.menus.map((menu) => ({
      systemCode: menu.systemCode,
      menuCode: menu.menuCode,
      menuName: menu.menuName,
      nodeType: menu.nodeType,
      parentCode: menu.parentId ? (menusById.get(menu.parentId)?.menuCode ?? `__missing_parent__${menu.parentId}`) : null,
      routePath: menu.routePath,
    })),
    actions: rows.actions.map((action) => {
      const menu = menusById.get(action.menuId);
      return {
        systemCode: menu?.systemCode ?? '__missing_system__',
        menuCode: menu?.menuCode ?? `__missing_menu__${action.menuId}`,
        actionCode: action.actionCode,
        actionName: action.actionName,
        actionType: action.actionType,
      };
    }),
    roles: rows.roles.map((role) => ({
      systemCode: role.systemCode,
      roleCode: role.roleCode,
      roleName: role.roleName,
      isSystem: role.isSystem,
    })),
    grants: rows.grants.map((grant) => {
      const role = rolesById.get(grant.roleId);
      const menu = menusById.get(grant.menuId);
      const action = grant.menuActionId ? actionsById.get(grant.menuActionId) : null;
      return {
        systemCode: grant.systemCode,
        roleCode: role?.roleCode ?? `__missing_role__${grant.roleId}`,
        menuCode: menu?.menuCode ?? `__missing_menu__${grant.menuId}`,
        actionCode: grant.menuActionId ? (action?.actionCode ?? `__missing_action__${grant.menuActionId}`) : null,
      };
    }),
  };
}
