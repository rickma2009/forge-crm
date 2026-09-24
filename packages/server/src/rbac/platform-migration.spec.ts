import { legacyPermissionCode, validateLegacyGrantTargets } from './platform-migration';

describe('platform access migration mapping', () => {
  it('maps every legacy menu and action grant to a distinct stable permission code', () => {
    expect(legacyPermissionCode({ menuCode: 'system-users', actionCode: null })).toBe('navigation.system-users.access');
    expect(legacyPermissionCode({ menuCode: 'system-users', actionCode: 'view' })).toBe('menu.system-users.view');
  });

  it('rejects grants whose action target is missing instead of dropping authorization', () => {
    expect(validateLegacyGrantTargets({
      menus: [{ id: 'menu-1', menuCode: 'system-users' }],
      actions: [],
      grants: [{ id: 'grant-1', menuId: 'menu-1', menuActionId: 'missing-action' }],
    })).toEqual(['LEGACY_GRANT_ACTION_NOT_FOUND:grant-1:missing-action']);
  });

  it('accepts complete legacy grant references', () => {
    expect(validateLegacyGrantTargets({
      menus: [{ id: 'menu-1', menuCode: 'system-users' }],
      actions: [{ id: 'action-1', menuId: 'menu-1', actionCode: 'view' }],
      grants: [
        { id: 'grant-1', menuId: 'menu-1', menuActionId: null },
        { id: 'grant-2', menuId: 'menu-1', menuActionId: 'action-1' },
      ],
    })).toEqual([]);
  });
});
