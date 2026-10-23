import { HttpStatus, Injectable } from '@nestjs/common';
import { organizationUnitUpdateSchema, organizationUnitWriteSchema } from '@forge-crm/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

type OrganizationRow = { id: string; parentId: string | null; unitCode: string; unitName: string; unitType: 'COMPANY' | 'DIVISION' | 'DEPARTMENT' | 'TEAM'; isSalesOrg: boolean; isRdOrg: boolean; isPlatformOrg: boolean; managerEmployeeId: string | null; manager?: { employeeName: string } | null; sortNo: number; status: 'ACTIVE' | 'DISABLED'; effectiveAt: Date; expiresAt: Date | null; remark: string | null; version: number; updatedAt: Date };
const querySchema = z.object({ keyword: z.string().trim().max(128).optional(), unitType: z.enum(['COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM']).optional(), status: z.enum(['ACTIVE', 'DISABLED']).optional(), isSalesOrg: z.enum(['true', 'false']).transform((v) => v === 'true').optional(), isRdOrg: z.enum(['true', 'false']).transform((v) => v === 'true').optional(), isPlatformOrg: z.enum(['true', 'false']).transform((v) => v === 'true').optional() });

export function orderOrganizationTree(rows: OrganizationRow[]): Array<OrganizationRow & { depth: number }> {
  const children = new Map<string | null, OrganizationRow[]>();
  for (const row of rows) children.set(row.parentId, [...(children.get(row.parentId) ?? []), row]);
  for (const siblings of children.values()) siblings.sort((a, b) => a.sortNo - b.sortNo || a.unitCode.localeCompare(b.unitCode));
  const result: Array<OrganizationRow & { depth: number }> = [];
  const seen = new Set<string>();
  const visit = (parentId: string | null, depth: number) => { for (const row of children.get(parentId) ?? []) { if (seen.has(row.id)) continue; seen.add(row.id); result.push({ ...row, depth }); visit(row.id, depth + 1); } };
  visit(null, 0);
  for (const row of rows) if (!seen.has(row.id)) result.push({ ...row, depth: 0 });
  return result;
}

export function wouldCreateOrganizationCycle(unitId: string, parentId: string | null, parents: Map<string, string | null>): boolean {
  let current = parentId;
  const visited = new Set<string>();
  while (current) { if (current === unitId) return true; if (visited.has(current)) return true; visited.add(current); current = parents.get(current) ?? null; }
  return false;
}

@Injectable()
export class OrganizationService {
  constructor(private readonly db: DatabaseService) {}
  private async application(systemCode: string) { const application = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' } }); if (!application) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '系统不存在'); return application; }
  private serialize(row: OrganizationRow & { depth: number }) {
    return {
      id: row.id, parentId: row.parentId, unitCode: row.unitCode, unitName: row.unitName,
      unitType: row.unitType, sortNo: row.sortNo, status: row.status,
      isSalesOrg: row.isSalesOrg, isRdOrg: row.isRdOrg, isPlatformOrg: row.isPlatformOrg,
      managerEmployeeId: row.managerEmployeeId, managerEmployeeName: row.manager?.employeeName ?? null,
      effectiveAt: row.effectiveAt.toISOString(), expiresAt: row.expiresAt?.toISOString() ?? null,
      remark: row.remark, depth: row.depth, version: row.version, updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(systemCode: string, raw: unknown) {
    const application = await this.application(systemCode); const query = querySchema.parse(raw);
    const rows = await this.db.orgUnit.findMany({ where: { tenantId: application.tenantId }, include: { manager: { select: { employeeName: true } } }, orderBy: [{ sortNo: 'asc' }, { unitCode: 'asc' }] });
    let included = rows;
    if (query.keyword || query.unitType || query.status || query.isSalesOrg !== undefined || query.isRdOrg !== undefined || query.isPlatformOrg !== undefined) {
      const byId = new Map(rows.map((row) => [row.id, row])); const keep = new Set<string>();
      for (const row of rows) if ((!query.keyword || row.unitCode.toLowerCase().includes(query.keyword.toLowerCase()) || row.unitName.toLowerCase().includes(query.keyword.toLowerCase())) && (!query.unitType || row.unitType === query.unitType) && (!query.status || row.status === query.status) && (query.isSalesOrg === undefined || row.isSalesOrg === query.isSalesOrg) && (query.isRdOrg === undefined || row.isRdOrg === query.isRdOrg) && (query.isPlatformOrg === undefined || row.isPlatformOrg === query.isPlatformOrg)) { let current: typeof row | undefined = row; while (current) { keep.add(current.id); current = current.parentId ? byId.get(current.parentId) : undefined; } }
      included = rows.filter((row) => keep.has(row.id));
    }
    return { items: orderOrganizationTree(included).map((row) => this.serialize(row)) };
  }

  async managerOptions(systemCode: string) {
    const application = await this.application(systemCode);
    const now = new Date();
    const activeEmployment = { status: 'ACTIVE' as const, effectiveAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    const employees = await this.db.orgEmployee.findMany({ where: { tenantId: application.tenantId, status: 'ACTIVE', employments: { some: activeEmployment } }, include: { employments: { where: activeEmployment, orderBy: { effectiveAt: 'desc' }, take: 1 } }, orderBy: { employeeName: 'asc' } });
    return { items: employees.map((row) => ({ id: row.id, employeeName: row.employeeName, employeeNo: row.employments[0]?.employeeNo ?? '' })) };
  }

  private async assertManager(tx: Pick<DatabaseService, 'orgEmployee'>, tenantId: string, managerEmployeeId: string | null | undefined) {
    if (!managerEmployeeId) return;
    const now = new Date();
    if (!await tx.orgEmployee.findFirst({ where: { id: managerEmployeeId, tenantId, status: 'ACTIVE', employments: { some: { status: 'ACTIVE', effectiveAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } } })) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '负责人必须是当前租户的在职员工');
  }

  async create(systemCode: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode); const input = organizationUnitWriteSchema.parse(raw);
    return this.db.$transaction(async (tx) => {
      if (input.parentId && !await tx.orgUnit.findFirst({ where: { id: input.parentId, tenantId: application.tenantId } })) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '上级组织不存在');
      await this.assertManager(tx, application.tenantId, input.managerEmployeeId);
      try {
        const row = await tx.orgUnit.create({ data: { tenantId: application.tenantId, parentId: input.parentId ?? null, unitCode: input.unitCode, unitName: input.unitName, unitType: input.unitType, isSalesOrg: input.isSalesOrg, isRdOrg: input.isRdOrg, isPlatformOrg: input.isPlatformOrg, managerEmployeeId: input.managerEmployeeId ?? null, sortNo: input.sortNo, status: input.status, effectiveAt: new Date(input.effectiveAt), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, remark: input.remark ?? null, createdBy: actorUserId, updatedBy: actorUserId }, include: { manager: { select: { employeeName: true } } } });
        await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'organization.unit.manage', resourceType: 'organization-unit', resourceId: row.id, afterSnapshot: { unitCode: row.unitCode, unitName: row.unitName, parentId: row.parentId, isSalesOrg: row.isSalesOrg, isRdOrg: row.isRdOrg, isPlatformOrg: row.isPlatformOrg, managerEmployeeId: row.managerEmployeeId }, requestId } });
        const depth = orderOrganizationTree(await tx.orgUnit.findMany({ where: { tenantId: application.tenantId } })).find((item) => item.id === row.id)?.depth ?? 0;
        return this.serialize({ ...row, depth });
      } catch (error) { if (error instanceof ApiException) throw error; throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '组织编码已存在或层级无效'); }
    }, { isolationLevel: 'Serializable' });
  }

  async update(systemCode: string, id: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode); const input = organizationUnitUpdateSchema.parse(raw);
    return this.db.$transaction(async (tx) => {
      const before = await tx.orgUnit.findFirst({ where: { id, tenantId: application.tenantId } }); if (!before) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '组织不存在');
      if (input.unitCode !== before.unitCode) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '组织编码创建后不可修改');
      const rows = await tx.orgUnit.findMany({ where: { tenantId: application.tenantId }, select: { id: true, parentId: true } });
      if (input.parentId && !rows.some((row) => row.id === input.parentId)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '上级组织不存在');
      if (wouldCreateOrganizationCycle(id, input.parentId ?? null, new Map(rows.map((row) => [row.id, row.parentId])))) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '不能把组织移动到自身或下级组织');
      await this.assertManager(tx, application.tenantId, input.managerEmployeeId);
      const result = await tx.orgUnit.updateMany({ where: { id, tenantId: application.tenantId, version: input.version }, data: { parentId: input.parentId ?? null, unitName: input.unitName, unitType: input.unitType, isSalesOrg: input.isSalesOrg, isRdOrg: input.isRdOrg, isPlatformOrg: input.isPlatformOrg, managerEmployeeId: input.managerEmployeeId ?? null, sortNo: input.sortNo, status: input.status, effectiveAt: new Date(input.effectiveAt), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, remark: input.remark ?? null, updatedBy: actorUserId, version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '组织已被其他人修改');
      const after = await tx.orgUnit.findUniqueOrThrow({ where: { id }, include: { manager: { select: { employeeName: true } } } });
      await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'organization.unit.manage', resourceType: 'organization-unit', resourceId: id, beforeSnapshot: { parentId: before.parentId, unitName: before.unitName, isSalesOrg: before.isSalesOrg, isRdOrg: before.isRdOrg, isPlatformOrg: before.isPlatformOrg, managerEmployeeId: before.managerEmployeeId, version: before.version }, afterSnapshot: { parentId: after.parentId, unitName: after.unitName, isSalesOrg: after.isSalesOrg, isRdOrg: after.isRdOrg, isPlatformOrg: after.isPlatformOrg, managerEmployeeId: after.managerEmployeeId, version: after.version }, requestId } });
      const depth = orderOrganizationTree(await tx.orgUnit.findMany({ where: { tenantId: application.tenantId } })).find((item) => item.id === id)?.depth ?? 0;
      return this.serialize({ ...after, depth });
    }, { isolationLevel: 'Serializable' });
  }
}
