import { HttpStatus, Injectable } from '@nestjs/common';
import { employeeUpdateSchema, employeeWriteSchema } from '@forge-crm/contracts';
import { hash } from 'argon2';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';
import { ApiException } from '../http/api-exceptions';
import { orderOrganizationTree } from './organization.service';

const employeeInclude = {
  user: { select: { id: true, account: true, status: true } },
  employments: { orderBy: { effectiveAt: 'desc' as const }, take: 1 },
  assignments: {
    where: { isPrimary: true },
    include: { organization: true, position: true },
    orderBy: { effectiveAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.OrgEmployeeInclude;

type EmployeeRow = Prisma.OrgEmployeeGetPayload<{ include: typeof employeeInclude }>;

const querySchema = z.object({
  keyword: z.string().trim().max(128).optional(), orgUnitId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(), page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const maskEmail = (value: string | null) => value ? value.replace(/^(.).*(?=@)/, '$1***') : null;
const maskMobile = (value: string | null) => value ? value.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2') : null;

@Injectable()
export class EmployeeService {
  constructor(private readonly db: DatabaseService) {}

  private async application(systemCode: string) {
    const application = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
    if (!application) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '系统不存在');
    return application;
  }

  private serialize(row: EmployeeRow, detail = false) {
    const employment = row.employments[0]; const assignment = row.assignments[0];
    if (!employment || !assignment || !row.user) throw new ApiException('SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, '员工主职或账号数据不完整');
    return {
      id: row.id, employeeNo: employment.employeeNo, employeeName: row.employeeName, account: row.user.account,
      orgUnitId: assignment.orgUnitId, orgUnitName: assignment.organization.unitName,
      positionId: assignment.positionId, positionName: assignment.positionNameSnapshot,
      employmentType: employment.employmentType, status: row.status,
      maskedEmail: maskEmail(row.email), maskedMobile: maskMobile(row.mobile),
      effectiveAt: employment.effectiveAt.toISOString(), remark: row.remark, version: row.version,
      updatedAt: row.updatedAt.toISOString(), ...(detail ? { email: row.email, mobile: row.mobile } : {}),
    };
  }

  async list(systemCode: string, raw: unknown) {
    const application = await this.application(systemCode); const query = querySchema.parse(raw); const now = new Date();
    const where = {
      tenantId: application.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword ? { OR: [
        { employeeName: { contains: query.keyword, mode: 'insensitive' as const } },
        { user: { is: { account: { contains: query.keyword, mode: 'insensitive' as const } } } },
        { employments: { some: { employeeNo: { contains: query.keyword, mode: 'insensitive' as const } } } },
      ] } : {}),
      ...(query.orgUnitId ? { assignments: { some: { orgUnitId: query.orgUnitId, isPrimary: true, status: 'ACTIVE' as const, effectiveAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } } : {}),
    };
    const [total, items] = await this.db.$transaction([
      this.db.orgEmployee.count({ where }),
      this.db.orgEmployee.findMany({ where, include: employeeInclude, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    return { items: items.map((item) => this.serialize(item)), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async detail(systemCode: string, id: string) {
    const application = await this.application(systemCode);
    const employee = await this.db.orgEmployee.findFirst({ where: { id, tenantId: application.tenantId }, include: employeeInclude });
    if (!employee) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '员工不存在');
    return this.serialize(employee, true);
  }

  async options(systemCode: string) {
    const application = await this.application(systemCode);
    const [units, positions] = await Promise.all([
      this.db.orgUnit.findMany({ where: { tenantId: application.tenantId, status: 'ACTIVE' }, orderBy: [{ sortNo: 'asc' }, { unitCode: 'asc' }] }),
      this.db.orgPosition.findMany({ where: { tenantId: application.tenantId, status: 'ACTIVE' }, orderBy: [{ positionName: 'asc' }, { positionCode: 'asc' }] }),
    ]);
    return {
      organizations: orderOrganizationTree(units).map((item) => ({ id: item.id, parentId: item.parentId, unitName: item.unitName, depth: item.depth })),
      positions: positions.map((item) => ({ id: item.id, positionCode: item.positionCode, positionName: item.positionName })),
    };
  }

  async create(systemCode: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode); const input = employeeWriteSchema.parse(raw); const passwordHash = await hash(input.initialPassword);
    try {
      const id = await this.db.$transaction(async (tx) => {
        const [unit, position, viewerRole] = await Promise.all([
          tx.orgUnit.findFirst({ where: { id: input.orgUnitId, tenantId: application.tenantId, status: 'ACTIVE' } }),
          tx.orgPosition.findFirst({ where: { id: input.positionId, tenantId: application.tenantId, status: 'ACTIVE' } }),
          tx.iamRole.findFirst({ where: { applicationId: application.id, roleCode: 'viewer', status: 'ACTIVE' } }),
        ]);
        if (!unit || !position || !viewerRole) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '所属部门、岗位或默认访问角色不存在');
        const effectiveAt = new Date(input.effectiveAt);
        const employee = await tx.orgEmployee.create({ data: { tenantId: application.tenantId, employeeName: input.employeeName, email: input.email || null, mobile: input.mobile || null, status: input.status, remark: input.remark || null, createdBy: actorUserId, updatedBy: actorUserId } });
        const user = await tx.iamUser.create({ data: { tenantId: application.tenantId, employeeId: employee.id, account: input.account, normalizedAccount: input.account, displayName: input.employeeName, userType: 'INTERNAL', passwordHash, status: input.status } });
        await tx.orgEmployment.create({ data: { tenantId: application.tenantId, employeeId: employee.id, employeeNo: input.employeeNo, employmentType: input.employmentType, status: input.status, effectiveAt, createdBy: actorUserId, updatedBy: actorUserId } });
        await tx.orgEmployeeAssignment.create({ data: { tenantId: application.tenantId, employeeId: employee.id, orgUnitId: unit.id, positionId: position.id, positionNameSnapshot: position.positionName, status: input.status, effectiveAt, createdBy: actorUserId, updatedBy: actorUserId } });
        await tx.orgUserAssignment.create({ data: { tenantId: application.tenantId, orgUnitId: unit.id, userId: user.id, status: input.status, effectiveAt, createdBy: actorUserId, updatedBy: actorUserId } });
        await tx.iamRoleUser.create({ data: { roleId: viewerRole.id, userId: user.id, status: input.status, effectiveAt, grantedBy: actorUserId } });
        await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'organization.employee.manage', resourceType: 'employee', resourceId: employee.id, afterSnapshot: { employeeNo: input.employeeNo, account: input.account, orgUnitId: unit.id, positionId: position.id }, requestId } });
        return employee.id;
      }, { isolationLevel: 'Serializable' });
      return this.detail(systemCode, id);
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '工号或登录账号已存在');
    }
  }

  async update(systemCode: string, id: string, actorUserId: string, requestId: string, raw: unknown) {
    const application = await this.application(systemCode); const input = employeeUpdateSchema.parse(raw); const now = new Date();
    await this.db.$transaction(async (tx) => {
      const before = await tx.orgEmployee.findFirst({ where: { id, tenantId: application.tenantId }, include: employeeInclude });
      if (!before || !before.user || !before.assignments[0] || !before.employments[0]) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '员工不存在或主职数据不完整');
      const [unit, position] = await Promise.all([
        tx.orgUnit.findFirst({ where: { id: input.orgUnitId, tenantId: application.tenantId, status: 'ACTIVE' } }),
        tx.orgPosition.findFirst({ where: { id: input.positionId, tenantId: application.tenantId, status: 'ACTIVE' } }),
      ]);
      if (!unit || !position) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '所属部门或岗位不存在');
      const updated = await tx.orgEmployee.updateMany({ where: { id, tenantId: application.tenantId, version: input.version }, data: { employeeName: input.employeeName, email: input.email || null, mobile: input.mobile || null, status: input.status, remark: input.remark || null, updatedBy: actorUserId, version: { increment: 1 } } });
      if (!updated.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '员工已被其他人修改');
      await tx.iamUser.update({ where: { id: before.user.id }, data: { displayName: input.employeeName, status: input.status, version: { increment: 1 } } });
      await tx.orgEmployment.update({ where: { id: before.employments[0].id }, data: { employmentType: input.employmentType, status: input.status, ...(input.status === 'DISABLED' ? { expiresAt: now } : { expiresAt: null }), updatedBy: actorUserId, version: { increment: 1 } } });
      const currentAssignment = before.assignments[0]; const changedAssignment = currentAssignment.orgUnitId !== unit.id || currentAssignment.positionId !== position.id;
      if (changedAssignment || input.status === 'DISABLED') await tx.orgEmployeeAssignment.update({ where: { id: currentAssignment.id }, data: { status: 'DISABLED', expiresAt: now, updatedBy: actorUserId, version: { increment: 1 } } });
      if ((changedAssignment || currentAssignment.status === 'DISABLED') && input.status === 'ACTIVE') await tx.orgEmployeeAssignment.create({ data: { tenantId: application.tenantId, employeeId: id, orgUnitId: unit.id, positionId: position.id, positionNameSnapshot: position.positionName, effectiveAt: now, createdBy: actorUserId, updatedBy: actorUserId } });
      await tx.orgUserAssignment.updateMany({ where: { userId: before.user.id, tenantId: application.tenantId, status: 'ACTIVE' }, data: { status: 'DISABLED', expiresAt: now, updatedBy: actorUserId, version: { increment: 1 } } });
      if (input.status === 'ACTIVE') await tx.orgUserAssignment.create({ data: { tenantId: application.tenantId, orgUnitId: unit.id, userId: before.user.id, effectiveAt: now, createdBy: actorUserId, updatedBy: actorUserId } });
      await tx.sysAuditLog.create({ data: { tenantId: application.tenantId, applicationId: application.id, actorUserId, actionCode: 'organization.employee.manage', resourceType: 'employee', resourceId: id, beforeSnapshot: { employeeName: before.employeeName, orgUnitId: currentAssignment.orgUnitId, positionId: currentAssignment.positionId, status: before.status, version: before.version }, afterSnapshot: { employeeName: input.employeeName, orgUnitId: unit.id, positionId: position.id, status: input.status }, requestId } });
    }, { isolationLevel: 'Serializable' });
    return this.detail(systemCode, id);
  }
}
