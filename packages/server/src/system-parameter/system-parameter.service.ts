import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { parameterCodeSchema, parameterUpdateSchema, type ParameterCode, type SystemParameter } from '@interaction-pattern-lab/contracts';
import type { Prisma, SysParameter } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

const querySchema = z.object({ keyword: z.string().trim().max(128).optional(), status: z.enum(['ACTIVE', 'DISABLED']).optional(), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) }).strict();
type Scope = { tenantId: string; applicationId: string };
type Tx = Prisma.TransactionClient;
const pagination = (page: number, pageSize: number, total: number) => ({ page, pageSize, total, totalPages: Math.ceil(total / pageSize) });

@Injectable()
export class SystemParameterService {
  constructor(private readonly db: DatabaseService) {}

  private async context(systemCode: string): Promise<Scope> {
    const apps = await this.db.sysApplication.findMany({ where: { applicationCode: systemCode, status: 'ACTIVE', tenant: { status: 'ACTIVE' } }, select: { id: true, tenantId: true }, take: 2 });
    if (apps.length !== 1) throw new ApiException('NOT_FOUND', 404, '系统不存在或作用域不明确');
    return { applicationId: apps[0].id, tenantId: apps[0].tenantId };
  }

  private describe(row: SysParameter): SystemParameter {
    return { id: row.id, parameterCode: parameterCodeSchema.parse(row.parameterCode), parameterName: row.parameterName, value: row.value, usageNote: row.usageNote, sortNo: row.sortNo, status: row.status, version: row.version };
  }

  async list(systemCode: string, raw: Record<string, unknown>) {
    const query = querySchema.parse(raw), scope = await this.context(systemCode);
    const where: Prisma.SysParameterWhereInput = { ...scope, ...(query.status ? { status: query.status } : {}), ...(query.keyword ? { OR: [{ parameterCode: { contains: query.keyword, mode: 'insensitive' } }, { parameterName: { contains: query.keyword, mode: 'insensitive' } }] } : {}) };
    return this.db.$transaction(async (tx) => {
      const [rows, total] = await Promise.all([tx.sysParameter.findMany({ where, orderBy: [{ sortNo: 'asc' }, { parameterCode: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), tx.sysParameter.count({ where })]);
      return { items: rows.map((row) => this.describe(row)), pagination: pagination(query.page, query.pageSize, total) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  /** Trusted service API: raw text only. The consuming domain owns interpretation. */
  async getValues(systemCode: string) {
    const scope = await this.context(systemCode);
    const rows = await this.db.sysParameter.findMany({ where: { ...scope, status: 'ACTIVE' } });
    const values: Partial<Record<ParameterCode, string | null>> = {};
    for (const row of rows) values[parameterCodeSchema.parse(row.parameterCode)] = row.value || null;
    return { ...scope, values };
  }

  async getValue(systemCode: string, code: ParameterCode): Promise<string | null> {
    const key = parameterCodeSchema.parse(code);
    return (await this.getValues(systemCode)).values[key] ?? null;
  }

  async update(systemCode: string, rawId: string, actor: { id: string; account: string }, raw: unknown) {
    const id = z.string().uuid().parse(rawId), input = parameterUpdateSchema.parse(raw), scope = await this.context(systemCode);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM sys_parameter WHERE tenant_id = ${scope.tenantId}::uuid AND application_id = ${scope.applicationId}::uuid AND id = ${id}::uuid FOR UPDATE`;
      const row = await tx.sysParameter.findFirst({ where: { ...scope, id } });
      if (!row) throw new ApiException('NOT_FOUND', 404, '参数不存在');
      if (row.version !== input.version) throw new ApiException('BAD_REQUEST', 409, '参数已被其他人修改，请刷新后重试');
      const changed = await tx.sysParameter.update({ where: { id }, data: { value: input.value, status: input.status, updatedBy: actor.account, version: { increment: 1 } } });
      const requestId = randomUUID();
      await this.audit(tx, scope, actor.id, requestId, row, changed);
      return { notice: null };
    });
  }

  private audit(tx: Tx, scope: Scope, actorUserId: string, requestId: string, before: SysParameter, after: SysParameter) {
    const snapshot = (row: SysParameter) => ({ parameterCode: row.parameterCode, value: row.value, status: row.status, version: row.version });
    return tx.sysAuditLog.create({ data: { ...scope, actorUserId, requestId, actionCode: 'system-parameters.manage', resourceType: 'system-parameter', resourceId: before.id, beforeSnapshot: snapshot(before), afterSnapshot: snapshot(after) } });
  }
}
