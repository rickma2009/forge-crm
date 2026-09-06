import { HttpStatus, Injectable } from '@nestjs/common';
import { listViewConfigSchema } from '@interaction-pattern-lab/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

const CUSTOMER_FIELDS = new Set(['customerCode', 'customerName', 'shortName', 'categoryValue', 'address', 'statusValue', 'industryValue', 'levelValue', 'salesOwnerName', 'remark', 'updatedAt']);
const personalInput = z.strictObject({ baseViewId: z.string().uuid(), viewName: z.string().trim().min(1).max(128), isDefault: z.boolean().default(false), config: listViewConfigSchema });
const personalUpdate = personalInput.omit({ baseViewId: true }).extend({ version: z.number().int().positive() });
const systemUpdate = z.strictObject({ viewName: z.string().trim().min(1).max(128), isDefault: z.boolean(), allowPersonalOverride: z.boolean(), config: listViewConfigSchema, version: z.number().int().positive() });

@Injectable()
export class ListViewService {
  constructor(private readonly db: DatabaseService) {}

  private validateConfig(pageCode: string, config: unknown) {
    const parsed = listViewConfigSchema.parse(config);
    const fields = pageCode === 'customer-directory' ? CUSTOMER_FIELDS : new Set<string>();
    const keys = new Set<string>();
    for (const column of parsed.columns) {
      if (!fields.has(column.key) || keys.has(column.key)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '视图包含无效或重复字段');
      keys.add(column.key);
    }
    if (!parsed.columns.some((column) => column.visible)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '至少保留一个显示字段');
    if (!fields.has(parsed.sort.field)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '排序字段无效');
    for (const key of Object.keys(parsed.filters)) if (!fields.has(key)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '过滤字段无效');
    return parsed;
  }

  private async roleIds(userId: string, systemCode: string) {
    const now = new Date();
    const rows = await this.db.iamRoleUser.findMany({ where: { userId, status: 'ACTIVE', role: { systemCode, status: 'ACTIVE' }, AND: [{ OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] }, select: { roleId: true } });
    return rows.map((row) => row.roleId);
  }

  async resolve(userId: string, systemCode: string, pageCode: string, actionCode: string) {
    const roleIds = await this.roleIds(userId, systemCode);
    const systems = await this.db.uiSystemListView.findMany({
      where: { systemCode, pageCode, actionCode, status: 'ACTIVE', roleAssignments: { some: { roleId: { in: roleIds }, status: 'ACTIVE' } } },
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
      ...personal.map((view) => ({ viewKey: `user:${view.id}`, id: view.id, scope: 'USER' as const, viewCode: null, viewName: view.viewName, baseViewId: view.baseViewId, isDefault: view.isDefault, allowPersonalOverride: true, readOnly: false, config: this.validateConfig(pageCode, view.config), version: view.version })),
    ];
    const validPreference = views.find((view) => view.viewKey === preference?.selectedViewKey)?.viewKey;
    const selectedViewKey = validPreference ?? views.find((view) => view.scope === 'USER' && view.isDefault)?.viewKey ?? views.find((view) => view.scope === 'SYSTEM' && view.isDefault)?.viewKey ?? views[0]!.viewKey;
    return { pageCode, actionCode, selectedViewKey, views };
  }

  async createPersonal(userId: string, systemCode: string, pageCode: string, actionCode: string, raw: unknown) {
    const input = personalInput.parse(raw);
    const resolved = await this.resolve(userId, systemCode, pageCode, actionCode);
    const base = resolved.views.find((view) => view.scope === 'SYSTEM' && view.id === input.baseViewId);
    if (!base?.allowPersonalOverride) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '该系统视图不允许创建个人视图');
    this.assertNarrower(base.config, input.config);
    if (await this.db.uiUserListView.count({ where: { userId, systemCode, pageCode, actionCode } }) >= 30) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '个人视图最多保存 30 个');
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.uiUserListView.updateMany({ where: { userId, systemCode, pageCode, actionCode, isDefault: true }, data: { isDefault: false } });
      return tx.uiUserListView.create({ data: { userId, systemCode, pageCode, actionCode, baseViewId: input.baseViewId, viewName: input.viewName, isDefault: input.isDefault, config: this.validateConfig(pageCode, input.config) } });
    });
  }

  async updatePersonal(userId: string, systemCode: string, pageCode: string, actionCode: string, id: string, raw: unknown) {
    const input = personalUpdate.parse(raw);
    const existing = await this.db.uiUserListView.findFirst({ where: { id, userId, systemCode, pageCode, actionCode }, include: { baseView: true } });
    if (!existing) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '个人视图不存在');
    this.assertNarrower(this.validateConfig(pageCode, existing.baseView.config), input.config);
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.uiUserListView.updateMany({ where: { userId, systemCode, pageCode, actionCode, isDefault: true, NOT: { id } }, data: { isDefault: false } });
      const result = await tx.uiUserListView.updateMany({ where: { id, userId, version: input.version }, data: { viewName: input.viewName, isDefault: input.isDefault, config: this.validateConfig(pageCode, input.config), version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '个人视图已被其他请求修改');
      return tx.uiUserListView.findUniqueOrThrow({ where: { id } });
    });
  }

  async deletePersonal(userId: string, id: string) {
    const existing = await this.db.uiUserListView.findFirst({ where: { id, userId } });
    if (!existing) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '个人视图不存在');
    await this.db.uiUserListView.delete({ where: { id } });
    await this.db.uiUserListViewPreference.deleteMany({ where: { userId, selectedViewKey: `user:${id}` } });
    return { deleted: true };
  }

  async select(userId: string, systemCode: string, pageCode: string, actionCode: string, viewKey: string) {
    const resolved = await this.resolve(userId, systemCode, pageCode, actionCode);
    if (!resolved.views.some((view) => view.viewKey === viewKey)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '视图不可用');
    await this.db.uiUserListViewPreference.upsert({ where: { userId_systemCode_pageCode_actionCode: { userId, systemCode, pageCode, actionCode } }, update: { selectedViewKey: viewKey }, create: { userId, systemCode, pageCode, actionCode, selectedViewKey: viewKey } });
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
