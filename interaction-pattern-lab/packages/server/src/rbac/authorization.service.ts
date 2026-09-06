import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { NavigationResponse } from '@interaction-pattern-lab/contracts';
import type { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config';
import { buildAuthorizedNavigation, type AuthorizationRow } from './navigation-policy';

@Injectable()
export class AuthorizationService {
  constructor(private readonly db: DatabaseService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  assertKnownSystem(systemCode: string): void {
    if (!this.config.systemCodes.has(systemCode)) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '系统不存在');
  }

  async navigation(userId: string, systemCode: string): Promise<NavigationResponse> {
    this.assertKnownSystem(systemCode);
    try {
      return await this.db.$transaction((tx) => this.navigationInTransaction(tx, userId, systemCode), { isolationLevel: 'RepeatableRead' });
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, '权限服务暂时不可用');
    }
  }

  async assertPage(userId: string, systemCode: string, routePath: string): Promise<void> {
    this.assertKnownSystem(systemCode);
    const registered = await this.db.uiMenu.findFirst({ where: { systemCode, routePath, nodeType: 'PAGE', status: 'ACTIVE' }, select: { menuCode: true } }).catch(() => { throw new ApiException('SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, '权限服务暂时不可用'); });
    if (!registered) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '页面不存在');
    const navigation = await this.navigation(userId, systemCode);
    if (!this.findPage(navigation, (node) => node.routePath === routePath)) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '无权访问该页面');
  }

  async assertAction(userId: string, systemCode: string, menuCode: string, actionCode: string): Promise<void> {
    const navigation = await this.navigation(userId, systemCode);
    const page = this.findPage(navigation, (node) => node.menuCode === menuCode);
    if (!page || !page.allowedActions?.some((action) => action.actionCode === actionCode)) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '无权执行该操作');
  }

  async executeAuthorizedAction<T>(userId: string, systemCode: string, menuCode: string, actionCode: string, operation: () => { value: T; rollback: () => void }): Promise<T> {
    this.assertKnownSystem(systemCode);
    let rollback: (() => void) | undefined;
    try {
      return await this.db.$transaction(async (tx) => {
        const navigation = await this.navigationInTransaction(tx, userId, systemCode);
        const page = this.findPage(navigation, (node) => node.menuCode === menuCode);
        if (!page || !page.allowedActions?.some((action) => action.actionCode === actionCode)) {
          throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '无权执行该操作');
        }
        const effect = operation();
        rollback = effect.rollback;
        return effect.value;
      }, { isolationLevel: 'RepeatableRead' });
    } catch (error) {
      rollback?.();
      if (error instanceof ApiException) throw error;
      throw new ApiException('SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, '权限服务暂时不可用');
    }
  }

  private async navigationInTransaction(tx: Prisma.TransactionClient, userId: string, systemCode: string): Promise<NavigationResponse> {
    const now = new Date();
    const memberships = await tx.iamRoleUser.findMany({
      where: { userId, status: 'ACTIVE', AND: [{ OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }], role: { systemCode, status: 'ACTIVE' } },
      select: { roleId: true },
    });
    const roleIds = memberships.map((item) => item.roleId);
    if (!roleIds.length) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '无权访问该系统');
    const [menus, grants] = await Promise.all([
      tx.uiMenu.findMany({
        where: { systemCode, status: 'ACTIVE' },
        include: { actions: { where: { status: 'ACTIVE' }, orderBy: [{ sortNo: 'asc' }, { actionCode: 'asc' }] } },
        orderBy: [{ sortNo: 'asc' }, { menuCode: 'asc' }],
      }),
      tx.iamRolePermission.findMany({ where: { systemCode, status: 'ACTIVE', roleId: { in: roleIds } }, select: { permissionType: true, menuId: true, menuActionId: true } }),
    ]);
    const menuGrants = new Set(grants.filter((grant) => grant.permissionType === 'MENU').map((grant) => grant.menuId));
    const actionGrants = new Set(grants.filter((grant) => grant.permissionType === 'ACTION' && grant.menuActionId).map((grant) => grant.menuActionId!));
    const rows: AuthorizationRow[] = menus.flatMap((menu): AuthorizationRow[] => {
      const base = { menuId: menu.id, menuCode: menu.menuCode, menuName: menu.menuName, nodeType: menu.nodeType, parentId: menu.parentId, routePath: menu.routePath, iconKey: menu.iconKey, sortNo: menu.sortNo, menuGranted: menuGrants.has(menu.id) };
      return menu.actions.length ? menu.actions.map((action) => ({ ...base, actionCode: action.actionCode, actionName: action.actionName, actionType: action.actionType, actionSortNo: action.sortNo, actionGranted: actionGrants.has(action.id) })) : [{ ...base, actionCode: null, actionName: null, actionType: null, actionSortNo: null, actionGranted: false }];
    });
    return buildAuthorizedNavigation(systemCode, rows);
  }

  private findPage(navigation: NavigationResponse, predicate: (node: NavigationResponse['items'][number]) => boolean) {
    const visit = (nodes: NavigationResponse['items']): NavigationResponse['items'][number] | undefined => {
      for (const node of nodes) { if (node.nodeType === 'PAGE' && predicate(node)) return node; const found = visit(node.children); if (found) return found; }
      return undefined;
    };
    return visit(navigation.items);
  }
}
