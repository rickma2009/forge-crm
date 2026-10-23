import { HttpStatus, Injectable } from '@nestjs/common';
import { listViewConfigSchema, businessListDefaultConfig, businessListObjects, isBusinessListObject } from '@forge-crm/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { resolveEffectiveRoleIds } from '../rbac/role-scope';

const CUSTOMER_FIELDS = new Set(['customerCode', 'customerName', 'shortName', 'categoryValue', 'address', 'statusValue', 'industryValue', 'levelValue', 'salesOwnerName', 'remark', 'updatedAt']);
const personalInput = z.strictObject({ baseViewId: z.string().uuid(), viewName: z.string().trim().min(1).max(128), isDefault: z.boolean().default(false), config: listViewConfigSchema });
const personalUpdate = personalInput.omit({ baseViewId: true }).extend({ version: z.number().int().positive() });
const systemUpdate = z.strictObject({ viewName: z.string().trim().min(1).max(128), isDefault: z.boolean(), allowPersonalOverride: z.boolean(), config: listViewConfigSchema, version: z.number().int().positive() });

@Injectable()
export class ListViewService {
  constructor(private readonly db: DatabaseService) {}

  private async applicationId(systemCode: string) {
    const application = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' }, select: { id: true } });
    if (!application) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '系统不存在');
    return application.id;
  }

  private validateConfig(pageCode: string, config: unknown) {
    const parsed = listViewConfigSchema.parse(config);
    if ((parsed.viewMode === 'KANBAN' || parsed.kanban) && pageCode !== 'opportunity-directory') throw new ApiException('BAD_REQUEST', 400, '该对象不支持看板');
    if (parsed.viewMode === 'KANBAN' && !parsed.kanban) throw new ApiException('BAD_REQUEST', 400, '看板必须指定模板');
    if (parsed.kanban?.cardFields.some(key => !parsed.columns.some(column => column.key === key && column.visible))) throw new ApiException('BAD_REQUEST', 400, '看板字段必须在本视图的显示字段范围内');
    // Old personal layouts predate these lifecycle fields. Add only missing fields;
    // preserve an explicit visibility choice after the user has configured them.
    if (pageCode === 'opportunity-directory') {
      let position = Math.max(0, parsed.columns.findIndex(c => c.key === 'customerName') + 1);
      for (const column of businessListDefaultConfig(pageCode).columns.filter(c => ['businessStatus', 'expectedSignDate', 'signedDate', 'lostDate'].includes(c.key))) {
        if (parsed.columns.some(c => c.key === column.key)) continue;
        if (column.visible) parsed.columns.splice(position++, 0, column); else parsed.columns.push(column);
      }
    }
    const fields = pageCode === 'customer-directory' ? CUSTOMER_FIELDS : new Set(isBusinessListObject(pageCode) ? Object.keys(businessListObjects[pageCode].fields) : []);
    const keys = new Set<string>();
    for (const column of parsed.columns) {
      if (!fields.has(column.key) || keys.has(column.key)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '视图包含无效或重复字段');
      keys.add(column.key);
    }
    if (!parsed.columns.some((column) => column.visible)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '至少保留一个显示字段');
    if (!fields.has(parsed.sort.field) && !(isBusinessListObject(pageCode) && parsed.sort.field === 'updatedAt')) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '排序字段无效');
    for (const key of Object.keys(parsed.filters)) if (!fields.has(key)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '过滤字段无效');
    for (const key of Object.keys(parsed.columnFilters ?? {})) if (!fields.has(key)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '列筛选字段无效');
    if (isBusinessListObject(pageCode)) {
      if (!parsed.columns.some((column) => column.key === businessListObjects[pageCode].identity && column.visible)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '必须保留记录详情入口字段');
      if (pageCode === 'item-directory' && (Object.keys(parsed.filters).length || parsed.columns.some((column) => column.queryVisible || column.queryCollapsed))) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '物料产品查询条件由顶部查询栏和列筛选维护');
      if (pageCode !== 'item-directory' && (parsed.sort.field !== 'updatedAt' || parsed.sort.direction !== 'desc' || Object.keys(parsed.filters).length || parsed.columns.some((column) => column.queryVisible || column.queryCollapsed || column.fixed !== null))) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '该对象仅支持列显示、列顺序、列宽和分页设置；查询条件由页面维护，按更新时间倒序');
    }
    return parsed;
  }

  private async roleIds(userId: string, systemCode: string) {
    return resolveEffectiveRoleIds(this.db, await this.applicationId(systemCode), userId);
  }

  async resolve(userId: string, systemCode: string, pageCode: string, actionCode: string) {
    const roleIds = await this.roleIds(userId, systemCode);
    if (!roleIds.length) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '当前用户没有有效角色');
    if ((pageCode === 'inbound-order-directory' || pageCode === 'bom-directory') && actionCode === 'view') {
      await this.db.uiSystemListView.upsert({
        where: { systemCode_pageCode_actionCode_viewCode: { systemCode, pageCode, actionCode, viewCode: 'object-default' } },
        update: {},
        create: { applicationId: await this.applicationId(systemCode), systemCode, pageCode, actionCode, viewCode: 'object-default', viewName: `${businessListObjects[pageCode].name}默认视图`, isDefault: true, allowPersonalOverride: true, priority: 100, status: 'ACTIVE', config: businessListDefaultConfig(pageCode), createdBy: 'system:list-view-bootstrap', updatedBy: 'system:list-view-bootstrap' },
      });
    }
    const systems = await this.db.uiSystemListView.findMany({
      where: { systemCode, pageCode, actionCode, status: 'ACTIVE', OR: [
        { roleAssignments: { some: { roleId: { in: roleIds }, status: 'ACTIVE' } } },
        ...(isBusinessListObject(pageCode) ? [{ viewCode: 'object-default', roleAssignments: { none: {} } }] : []),
      ] },
      orderBy: [{ priority: 'asc' }, { viewCode: 'asc' }],
    });
    if (!systems.length) throw new ApiException('SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, '当前页面没有可用的系统视图');
    const systemIds = systems.map((view) => view.id);
    const [personal, preference] = await Promise.all([
      this.db.uiUserListView.findMany({ where: { userId, systemCode, pageCode, actionCode, baseViewId: { in: systemIds } }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] }),
      this.db.uiUserListViewPreference.findUnique({ where: { userId_systemCode_pageCode_actionCode: { userId, systemCode, pageCode, actionCode } } }),
    ]);
    const views = [
      ...systems.map((view) => ({ viewKey: `system:${view.id}`, id: view.id, scope: 'SYSTEM' as const, viewCode: view.viewCode, viewName: view.viewName, baseViewId: view.id, isDefault: view.isDefault, allowPersonalOverride: view.allowPersonalOverride, readOnly: true, config: this.validateConfig(pageCode, view.config), version: view.version })),
      ...personal.flatMap((view) => {
        const base = systems.find((item) => item.id === view.baseViewId);
        if (!base?.allowPersonalOverride) return [];
        try {
          const config = this.validateConfig(pageCode, view.config);
          this.assertNarrower(this.validateConfig(pageCode, base.config), config);
          return [{ viewKey: `user:${view.id}`, id: view.id, scope: 'USER' as const, viewCode: null, viewName: view.viewName, baseViewId: view.baseViewId, isDefault: view.isDefault, allowPersonalOverride: true, readOnly: false, config, version: view.version }];
        } catch { return []; } // Stale personal settings fall back; they cannot widen a changed baseline.
      }),
    ];
    const validPreference = views.find((view) => view.viewKey === preference?.selectedViewKey)?.viewKey;
    const systemDefault = views.find((view) => view.scope === 'SYSTEM' && view.isDefault)?.viewKey;
    const stalePreference = !!preference && !validPreference;
    const selectedViewKey = validPreference ?? (!stalePreference ? views.find((view) => view.scope === 'USER' && view.isDefault)?.viewKey : undefined) ?? systemDefault;
    if (!selectedViewKey) throw new ApiException('SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, '当前页面没有可用的默认视图，请联系管理员配置');
    return { pageCode, actionCode, selectedViewKey, views, ...(stalePreference ? { fallbackNotice: '原引用视图已失效，已恢复系统默认视图' } : {}) };
  }

  async createPersonal(userId: string, systemCode: string, pageCode: string, actionCode: string, raw: unknown) {
    const applicationId = await this.applicationId(systemCode);
    const input = personalInput.parse(raw);
    const resolved = await this.resolve(userId, systemCode, pageCode, actionCode);
    const base = resolved.views.find((view) => view.scope === 'SYSTEM' && view.id === input.baseViewId);
    if (!base?.allowPersonalOverride) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '该系统视图不允许创建个人视图');
    this.assertNarrower(base.config, input.config);
    if (await this.db.uiUserListView.count({ where: { userId, systemCode, pageCode, actionCode } }) >= 30) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '个人视图最多保存 30 个');
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.uiUserListView.updateMany({ where: { userId, systemCode, pageCode, actionCode, isDefault: true }, data: { isDefault: false } });
      const created = await tx.uiUserListView.create({ data: { applicationId, userId, systemCode, pageCode, actionCode, baseViewId: input.baseViewId, viewName: input.viewName, isDefault: input.isDefault, config: this.validateConfig(pageCode, input.config) } });
      if (input.isDefault) await tx.uiUserListViewPreference.upsert({ where: { userId_systemCode_pageCode_actionCode: { userId, systemCode, pageCode, actionCode } }, create: { applicationId, userId, systemCode, pageCode, actionCode, selectedViewKey: `user:${created.id}` }, update: { applicationId, selectedViewKey: `user:${created.id}` } });
      return created;
    });
  }

  async updatePersonal(userId: string, systemCode: string, pageCode: string, actionCode: string, id: string, raw: unknown) {
    const input = personalUpdate.parse(raw);
    const existing = await this.db.uiUserListView.findFirst({ where: { id, userId, systemCode, pageCode, actionCode }, include: { baseView: true } });
    if (!existing) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '个人视图不存在');
    const resolved = await this.resolve(userId, systemCode, pageCode, actionCode);
    if (!resolved.views.some((view) => view.scope === 'SYSTEM' && view.id === existing.baseViewId && view.allowPersonalOverride)) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '原系统视图已不可用或不允许个人设置');
    this.assertNarrower(this.validateConfig(pageCode, existing.baseView.config), input.config);
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.uiUserListView.updateMany({ where: { userId, systemCode, pageCode, actionCode, isDefault: true, NOT: { id } }, data: { isDefault: false } });
      const result = await tx.uiUserListView.updateMany({ where: { id, userId, version: input.version }, data: { viewName: input.viewName, isDefault: input.isDefault, config: this.validateConfig(pageCode, input.config), version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '个人视图已被其他请求修改');
      return tx.uiUserListView.findUniqueOrThrow({ where: { id } });
    });
  }

  async deletePersonal(userId: string, systemCode: string, pageCode: string, actionCode: string, id: string) {
    const existing = await this.db.uiUserListView.findFirst({ where: { id, userId, systemCode, pageCode, actionCode } });
    if (!existing) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '个人视图不存在');
    await this.db.uiUserListView.delete({ where: { id } });
    await this.db.uiUserListViewPreference.deleteMany({ where: { userId, systemCode, pageCode, actionCode, selectedViewKey: `user:${id}` } });
    return { deleted: true };
  }

  async select(userId: string, systemCode: string, pageCode: string, actionCode: string, viewKey: string) {
    const applicationId = await this.applicationId(systemCode);
    const resolved = await this.resolve(userId, systemCode, pageCode, actionCode);
    if (!resolved.views.some((view) => view.viewKey === viewKey)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '视图不可用');
    await this.db.uiUserListViewPreference.upsert({ where: { userId_systemCode_pageCode_actionCode: { userId, systemCode, pageCode, actionCode } }, update: { applicationId, selectedViewKey: viewKey }, create: { applicationId, userId, systemCode, pageCode, actionCode, selectedViewKey: viewKey } });
    return { selectedViewKey: viewKey };
  }

  async updateSystem(systemCode: string, pageCode: string, actionCode: string, id: string, actor: string, raw: unknown) {
    const input = systemUpdate.parse(raw);
    const config = this.validateConfig(pageCode, input.config);
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.uiSystemListView.updateMany({ where: { systemCode, pageCode, actionCode, isDefault: true, NOT: { id } }, data: { isDefault: false, updatedBy: actor } });
      const result = await tx.uiSystemListView.updateMany({ where: { id, systemCode, pageCode, actionCode, version: input.version }, data: { viewName: input.viewName, isDefault: input.isDefault, allowPersonalOverride: input.allowPersonalOverride, config, updatedBy: actor, version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '系统视图不存在或已被其他用户修改');
      return tx.uiSystemListView.findUniqueOrThrow({ where: { id } });
    });
  }

  private assertNarrower(base: ReturnType<typeof listViewConfigSchema.parse>, candidate: ReturnType<typeof listViewConfigSchema.parse>) {
    const allowed = new Set(base.columns.map((column) => column.key));
    if (candidate.columns.some((column) => !allowed.has(column.key))) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '个人视图不能使用系统基线之外的字段');
  }
}
