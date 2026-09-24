export type LegacyGrantTarget = {
  menuCode: string;
  actionCode: string | null;
};

export function legacyPermissionCode(target: LegacyGrantTarget): string {
  return target.actionCode
    ? `menu.${target.menuCode}.${target.actionCode}`
    : `navigation.${target.menuCode}.access`;
}

type LegacyMenu = { id: string; menuCode: string };
type LegacyAction = { id: string; menuId: string; actionCode: string };
type LegacyGrant = { id: string; menuId: string; menuActionId: string | null };

export function validateLegacyGrantTargets(input: {
  menus: LegacyMenu[];
  actions: LegacyAction[];
  grants: LegacyGrant[];
}): string[] {
  const menus = new Map(input.menus.map((menu) => [menu.id, menu]));
  const actions = new Map(input.actions.map((action) => [action.id, action]));
  const errors: string[] = [];

  for (const grant of input.grants) {
    if (!menus.has(grant.menuId)) {
      errors.push(`LEGACY_GRANT_MENU_NOT_FOUND:${grant.id}:${grant.menuId}`);
      continue;
    }
    if (grant.menuActionId === null) continue;
    const action = actions.get(grant.menuActionId);
    if (!action || action.menuId !== grant.menuId) {
      errors.push(`LEGACY_GRANT_ACTION_NOT_FOUND:${grant.id}:${grant.menuActionId}`);
    }
  }

  return errors;
}
