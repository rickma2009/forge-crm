import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { NavigationResponse } from '@forge-crm/contracts';
import type { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config';
import { buildAuthorizedNavigation, type AuthorizationRow } from './navigation-policy';

import { effectiveRoleWhere, resolveEffectiveRoleIds } from './role-scope';
export { effectiveRoleWhere } from './role-scope';

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
    // 动态详情路由：/showcase/customers/:id 视为 /showcase/customers 权限
    const effectivePath = routePath.match(/^\/showcase\/customers\/[\w-]+$/) ? '/showcase/customers'
      : routePath.match(/^\/showcase\/opportunities\/[\w-]+$/) ? '/showcase/opportunities'
      : routePath.match(/^\/showcase\/products\/[\w-]+$/) ? '/showcase/products'
      : routePath.match(/^\/showcase\/boms\/[\w-]+$/) ? '/showcase/boms'
      : routePath.match(/^\/showcase\/inbound-orders\/[\w-]+$/) ? '/showcase/inbound-orders'
      : routePath.match(/^\/showcase\/quotations\/[\w-]+$/) ? '/showcase/quotations' : routePath;
    const registered = await this.db.uiMenu.findFirst({ where: { systemCode, routePath: effectivePath, nodeType: 'PAGE', status: 'ACTIVE' }, select: { menuCode: true } }).catch(() => { throw new ApiException('SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, '权限服务暂时不可用'); });
    if (!registered) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '页面不存在');
    const navigation = await this.navigation(userId, systemCode);
    if (!this.findPage(navigation, (node) => node.routePath === effectivePath)) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '无权访问该页面');
  }

  async assertAction(userId: string, systemCode: string, menuCode: string, actionCode: string): Promise<void> {
    const navigation = await this.navigation(userId, systemCode);
    const page = this.findPage(navigation, (node) => node.menuCode === menuCode);
    if (!page || !page.allowedActions?.some((action) => action.actionCode === actionCode)) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '无权执行该操作');
  }

  async assertPermission(userId: string, systemCode: string, permissionCode: string): Promise<void> {
    this.assertKnownSystem(systemCode);
    const now = new Date();
    const application = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
    if (!application) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    const roleIds = await resolveEffectiveRoleIds(this.db, application.id, userId, now);
    const grant = await this.db.iamRolePermission.findFirst({
      where: {
        status: 'ACTIVE',
        permission: { permissionCode, status: 'ACTIVE', application: { applicationCode: systemCode, status: 'ACTIVE' } },
        role: {
          ...effectiveRoleWhere(now),
          applicationId: application.id, id: { in: roleIds },
        },
      },
      select: { id: true },
    }).catch(() => { throw new ApiException('SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, '权限服务暂时不可用'); });
    if (!grant) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '无权执行该操作');
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
    const application = await tx.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' }, select: { id: true } });
    if (!application) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '系统不存在');
    const roleIds = await resolveEffectiveRoleIds(tx, application.id, userId, now);
    if (!roleIds.length) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '无权访问该系统');
    const [menus, grants] = await Promise.all([
      tx.uiMenu.findMany({
        where: { applicationId: application.id, status: 'ACTIVE' },
        include: { actions: { where: { status: 'ACTIVE' }, orderBy: [{ sortNo: 'asc' }, { actionCode: 'asc' }] } },
        orderBy: [{ sortNo: 'asc' }, { menuCode: 'asc' }],
      }),
      tx.iamRolePermission.findMany({ where: { status: 'ACTIVE', roleId: { in: roleIds }, permission: { applicationId: application.id, status: 'ACTIVE' } }, select: { permissionId: true } }),
    ]);
    const permissionGrants = new Set(grants.map((grant) => grant.permissionId));
    const rows: AuthorizationRow[] = menus.flatMap((menu): AuthorizationRow[] => {
      const base = { menuId: menu.id, menuCode: menu.menuCode, menuName: menu.menuName, nodeType: menu.nodeType, parentId: menu.parentId, routePath: menu.routePath, iconKey: menu.iconKey, sortNo: menu.sortNo, menuGranted: !!menu.accessPermissionId && permissionGrants.has(menu.accessPermissionId) };
      return menu.actions.length ? menu.actions.map((action) => ({ ...base, actionCode: action.actionCode, actionName: action.actionName, actionType: action.actionType, actionSortNo: action.sortNo, actionGranted: !!action.permissionId && permissionGrants.has(action.permissionId) })) : [{ ...base, actionCode: null, actionName: null, actionType: null, actionSortNo: null, actionGranted: false }];
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
