import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { bomCommandSchema, bomCreateSchema, bomSaveSchema, type BomSave, type BomTreeLine } from '@forge-crm/contracts';
import { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

const listQuery = z.object({ page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), keyword: z.string().trim().max(100).default(''), status: z.enum(['DRAFT', 'PUBLISHED']).optional(), itemId: z.string().uuid().optional() });
type Scope = { id: string; tenantId: string };
type Bom = Awaited<ReturnType<DatabaseService['scmBom']['findFirstOrThrow']>>;
const bad = (message: string, status = 400) => new ApiException('BAD_REQUEST', status, message);
const codeFor = (itemCode: string) => {
  const simple = `BOM-${itemCode}`;
  if (simple.length <= 32) return simple;
  return `BOM-${itemCode.slice(0, 20)}-${createHash('sha1').update(itemCode).digest('hex').slice(0, 6).toUpperCase()}`;
};

@Injectable()
export class BomService {
  constructor(private readonly db: DatabaseService) {}
  private async scope(systemCode: string): Promise<Scope> {
    const app = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' }, select: { id: true, tenantId: true } });
    if (!app) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    return app;
  }
  private async bom(scope: Scope, id: string) {
    z.string().uuid().parse(id);
    const row = await this.db.scmBom.findFirst({ where: { id, applicationId: scope.id, tenantId: scope.tenantId } });
    if (!row) throw new ApiException('NOT_FOUND', 404, 'BOM不存在');
    return row;
  }
  private async item(scope: Scope, id: string) {
    const row = await this.db.mdItem.findFirst({ where: { id, tenantId: scope.tenantId, status: 'ACTIVE' } });
    if (!row) throw bad('物料产品不存在或已停用');
    return row;
  }
  private async dto(scope: Scope, row: NonNullable<Bom>) {
    const [item, lineCount] = await Promise.all([this.db.mdItem.findFirst({ where: { id: row.itemId, tenantId: scope.tenantId } }), this.db.scmBomLine.count({ where: { bomId: row.id, applicationId: scope.id } })]);
    if (!item) throw bad('BOM产品已失效');
    return { id: row.id, itemId: row.itemId, itemCode: item.itemCode, itemName: item.itemName, itemType: item.itemType as 'PRODUCT' | 'SEMI_FINISHED', bomCode: row.bomCode, revision: row.revision, status: row.status as 'DRAFT' | 'PUBLISHED', isCurrent: row.isCurrent, baseQuantity: row.baseQuantity.toFixed(4), baseUnit: item.baseUnit, lineCount, rowVersion: row.rowVersion, updatedAt: row.updatedAt.toISOString() };
  }
  async list(systemCode: string, raw: unknown) {
    const scope = await this.scope(systemCode), q = listQuery.parse(raw);
    const matched = q.keyword ? await this.db.mdItem.findMany({ where: { tenantId: scope.tenantId, OR: [{ itemCode: { contains: q.keyword, mode: 'insensitive' } }, { itemName: { contains: q.keyword, mode: 'insensitive' } }] }, select: { id: true } }) : [];
    const where: Prisma.ScmBomWhereInput = { applicationId: scope.id, tenantId: scope.tenantId, ...(q.status ? { status: q.status } : {}), ...(q.itemId ? { itemId: q.itemId } : {}), ...(q.keyword ? { OR: [{ bomCode: { contains: q.keyword, mode: 'insensitive' } }, { itemId: { in: matched.map((x) => x.id) } }] } : {}) };
    const [rows, total] = await Promise.all([this.db.scmBom.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }), this.db.scmBom.count({ where })]);
    return { items: await Promise.all(rows.map((row) => this.dto(scope, row))), pagination: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) } };
  }
  private async tree(scope: Scope, row: NonNullable<Bom>, cumulative: Prisma.Decimal, visited: Set<string>, depth: number): Promise<BomTreeLine[]> {
    if (depth > 12 || visited.has(row.itemId)) throw bad('BOM层级超过上限或形成循环');
    const path = new Set(visited); path.add(row.itemId);
    const lines = await this.db.scmBomLine.findMany({ where: { bomId: row.id, applicationId: scope.id, tenantId: scope.tenantId }, include: { alternatives: true }, orderBy: [{ sortNo: 'asc' }, { lineCode: 'asc' }] });
    const ids = [...new Set(lines.flatMap((line) => [line.itemId, ...line.alternatives.map((alt) => alt.itemId)]))];
    const items = await this.db.mdItem.findMany({ where: { id: { in: ids }, tenantId: scope.tenantId } });
    const names = new Map(items.map((item) => [item.id, item]));
    const result: BomTreeLine[] = [];
    for (const line of lines) {
      const item = names.get(line.itemId);
      if (!item) throw bad('BOM中引用的物料不存在');
      const factor = cumulative.mul(line.quantity).div(row.baseQuantity);
      const child = line.childBomId ? await this.bom(scope, line.childBomId) : null;
      const children = child ? await this.tree(scope, child, factor, path, depth + 1) : [];
      result.push({ id: line.id, bomId: row.id, lineCode: line.lineCode, itemId: item.id, itemCode: item.itemCode, itemName: item.itemName, itemType: item.itemType, quantity: line.quantity.toFixed(4), baseUnit: item.baseUnit, sortNo: line.sortNo, childBomId: child?.id ?? null, childBomRevision: child?.revision ?? null, cumulativeQuantity: factor.toFixed(4), alternatives: line.alternatives.sort((a, b) => a.priority - b.priority).map((alt) => { const alternate = names.get(alt.itemId); if (!alternate) throw bad('替代料已失效'); return { id: alt.id, itemId: alt.itemId, itemCode: alternate.itemCode, itemName: alternate.itemName, baseUnit: alternate.baseUnit, priority: alt.priority, ratio: alt.ratio.toFixed(4) }; }), children });
    }
    return result;
  }
  async detail(systemCode: string, id: string) {
    const scope = await this.scope(systemCode), row = await this.bom(scope, id);
    return { ...await this.dto(scope, row), lines: await this.tree(scope, row, new Prisma.Decimal(1), new Set(), 0) };
  }
  private async audit(tx: Prisma.TransactionClient, scope: Scope, actorId: string, action: string, id: string) {
    await tx.sysAuditLog.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, actorUserId: actorId, actionCode: action, resourceType: 'bom', resourceId: id, requestId: randomUUID() } });
  }
  async create(systemCode: string, actorId: string, account: string, raw: unknown) {
    const scope = await this.scope(systemCode), input = bomCreateSchema.parse(raw), item = await this.item(scope, input.itemId);
    if (item.itemType === 'MATERIAL') throw bad('原材料不能作为BOM成品');
    const row = await this.db.$transaction(async (tx) => {
      const existing = await tx.scmBom.findFirst({ where: { applicationId: scope.id, itemId: item.id, status: 'DRAFT' } });
      if (existing) throw bad('该产品已有待编辑草稿', 409);
      const latest = await tx.scmBom.findFirst({ where: { applicationId: scope.id, itemId: item.id }, orderBy: { revision: 'desc' } });
      const created = await tx.scmBom.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, itemId: item.id, bomCode: codeFor(item.itemCode), revision: (latest?.revision ?? 0) + 1, baseQuantity: input.baseQuantity, createdBy: account, updatedBy: account } });
      await this.audit(tx, scope, actorId, 'bom.create', created.id);
      return created;
    }, { isolationLevel: 'Serializable' });
    return this.detail(systemCode, row.id);
  }
  async draft(systemCode: string, actorId: string, account: string, id: string) {
    const scope = await this.scope(systemCode), source = await this.bom(scope, id);
    if (source.status !== 'PUBLISHED') throw bad('仅可从已发布版本复制草稿');
    const row = await this.db.$transaction(async (tx) => {
      if (await tx.scmBom.findFirst({ where: { applicationId: scope.id, itemId: source.itemId, status: 'DRAFT' } })) throw bad('该产品已有草稿', 409);
      const latest = await tx.scmBom.findFirst({ where: { applicationId: scope.id, itemId: source.itemId }, orderBy: { revision: 'desc' } });
      const created = await tx.scmBom.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, itemId: source.itemId, bomCode: source.bomCode, revision: (latest?.revision ?? source.revision) + 1, baseQuantity: source.baseQuantity, createdBy: account, updatedBy: account } });
      const lines = await tx.scmBomLine.findMany({ where: { bomId: source.id }, include: { alternatives: true } });
      for (const line of lines) {
        const copied = await tx.scmBomLine.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, bomId: created.id, lineCode: line.lineCode, itemId: line.itemId, quantity: line.quantity, sortNo: line.sortNo, childBomId: line.childBomId } });
        if (line.alternatives.length) await tx.scmBomAlternative.createMany({ data: line.alternatives.map((alt) => ({ tenantId: scope.tenantId, applicationId: scope.id, lineId: copied.id, itemId: alt.itemId, priority: alt.priority, ratio: alt.ratio })) });
      }
      await this.audit(tx, scope, actorId, 'bom.copy_draft', created.id);
      return created;
    }, { isolationLevel: 'Serializable' });
    return this.detail(systemCode, row.id);
  }
  private async validate(scope: Scope, row: NonNullable<Bom>, input: BomSave) {
    const errors: { row: number; message: string }[] = [];
    const ids = [...new Set(input.lines.flatMap((line) => [line.itemId, ...line.alternatives.map((alt) => alt.itemId)]))];
    const [items, children] = await Promise.all([this.db.mdItem.findMany({ where: { id: { in: ids }, tenantId: scope.tenantId, status: 'ACTIVE' } }), this.db.scmBom.findMany({ where: { id: { in: input.lines.flatMap((line) => line.childBomId ? [line.childBomId] : []) }, tenantId: scope.tenantId, applicationId: scope.id } })]);
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const childMap = new Map(children.map((child) => [child.id, child]));
    for (const [index, line] of input.lines.entries()) {
      const item = itemMap.get(line.itemId);
      if (!item) errors.push({ row: index + 2, message: '组件物料不存在或已停用' });
      if (line.itemId === row.itemId) errors.push({ row: index + 2, message: '不能直接引用自身' });
      if (line.childBomId) {
        const child = childMap.get(line.childBomId);
        if (!child || child.status !== 'PUBLISHED' || child.itemId !== line.itemId) errors.push({ row: index + 2, message: '引用的子BOM须为该半成品的已发布版本' });
        else if (item?.itemType !== 'SEMI_FINISHED') errors.push({ row: index + 2, message: '仅半成品可引用子BOM' });
        else if (await this.reachesItem(scope, child.id, row.itemId, new Set())) errors.push({ row: index + 2, message: '子BOM引用会形成循环' });
      }
      for (const alt of line.alternatives) if (!itemMap.has(alt.itemId)) errors.push({ row: index + 2, message: '替代料不存在或已停用' });
    }
    return errors;
  }
  private async reachesItem(scope: Scope, bomId: string, targetItemId: string, visited: Set<string>): Promise<boolean> {
    if (visited.has(bomId)) return false;
    visited.add(bomId);
    const bom = await this.bom(scope, bomId);
    if (bom.itemId === targetItemId) return true;
    const lines = await this.db.scmBomLine.findMany({ where: { bomId, applicationId: scope.id }, select: { childBomId: true } });
    for (const line of lines) if (line.childBomId && await this.reachesItem(scope, line.childBomId, targetItemId, visited)) return true;
    return false;
  }
  async preview(systemCode: string, id: string, raw: unknown) {
    const scope = await this.scope(systemCode), row = await this.bom(scope, id);
    if (row.status !== 'DRAFT') throw bad('仅草稿可导入');
    const parsed = bomSaveSchema.safeParse(raw);
    if (!parsed.success) return { valid: false, errors: parsed.error.issues.map((issue) => ({ row: typeof issue.path[1] === 'number' ? issue.path[1] + 2 : 1, message: issue.message })), added: 0, removed: 0, changed: 0 };
    const errors = await this.validate(scope, row, parsed.data);
    const old = await this.db.scmBomLine.findMany({ where: { bomId: id }, include: { alternatives: true } });
    const existing = new Map(old.map((line) => [line.lineCode, line]));
    const next = new Set(parsed.data.lines.map((line) => line.lineCode));
    const changed = parsed.data.lines.filter((line) => { const previous = existing.get(line.lineCode); return previous && (previous.itemId !== line.itemId || previous.quantity.toFixed(4) !== new Prisma.Decimal(line.quantity).toFixed(4) || previous.childBomId !== line.childBomId || previous.sortNo !== line.sortNo || JSON.stringify(previous.alternatives.map((a) => [a.itemId, a.priority, a.ratio.toFixed(4)]).sort()) !== JSON.stringify(line.alternatives.map((a) => [a.itemId, a.priority, new Prisma.Decimal(a.ratio).toFixed(4)]).sort())); }).length;
    return { valid: errors.length === 0, errors, added: parsed.data.lines.filter((line) => !existing.has(line.lineCode)).length, removed: old.filter((line) => !next.has(line.lineCode)).length, changed };
  }
  async save(systemCode: string, actorId: string, account: string, id: string, raw: unknown) {
    const scope = await this.scope(systemCode), row = await this.bom(scope, id), input = bomSaveSchema.parse(raw);
    if (row.status !== 'DRAFT') throw bad('已发布版本不可编辑', 409);
    const errors = await this.validate(scope, row, input);
    if (errors.length) throw bad(`第${errors[0].row}行：${errors[0].message}`);
    await this.db.$transaction(async (tx) => {
      const changed = await tx.scmBom.updateMany({ where: { id, tenantId: scope.tenantId, applicationId: scope.id, rowVersion: input.rowVersion, status: 'DRAFT' }, data: { baseQuantity: input.baseQuantity, rowVersion: { increment: 1 }, updatedBy: account } });
      if (!changed.count) throw bad('BOM已被修改，请刷新后重试', 409);
      await tx.scmBomLine.deleteMany({ where: { bomId: id, applicationId: scope.id } });
      for (const line of input.lines) {
        const saved = await tx.scmBomLine.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, bomId: id, lineCode: line.lineCode, itemId: line.itemId, quantity: line.quantity, sortNo: line.sortNo, childBomId: line.childBomId } });
        if (line.alternatives.length) await tx.scmBomAlternative.createMany({ data: line.alternatives.map((alt) => ({ tenantId: scope.tenantId, applicationId: scope.id, lineId: saved.id, itemId: alt.itemId, priority: alt.priority, ratio: alt.ratio })) });
      }
      await this.audit(tx, scope, actorId, 'bom.save', id);
    }, { isolationLevel: 'Serializable', timeout: 15000 });
    return this.detail(systemCode, id);
  }
  async publish(systemCode: string, actorId: string, account: string, id: string, raw: unknown) {
    const scope = await this.scope(systemCode), row = await this.bom(scope, id), command = bomCommandSchema.parse(raw);
    if (row.status !== 'DRAFT') throw bad('只有草稿可发布', 409);
    const lines = await this.db.scmBomLine.findMany({ where: { bomId: id }, include: { alternatives: true } });
    if (!lines.length) throw bad('BOM至少需要一行组件');
    const input: BomSave = { rowVersion: command.rowVersion, baseQuantity: row.baseQuantity.toFixed(4), lines: lines.map((line) => ({ lineCode: line.lineCode, itemId: line.itemId, quantity: line.quantity.toFixed(4), sortNo: line.sortNo, childBomId: line.childBomId, alternatives: line.alternatives.map((alt) => ({ itemId: alt.itemId, priority: alt.priority, ratio: alt.ratio.toFixed(4) })) })) };
    const errors = await this.validate(scope, row, input);
    if (errors.length) throw bad(`第${errors[0].row}行：${errors[0].message}`);
    await this.db.$transaction(async (tx) => {
      await tx.scmBom.updateMany({ where: { applicationId: scope.id, itemId: row.itemId, id: { not: id }, isCurrent: true }, data: { isCurrent: false } });
      const changed = await tx.scmBom.updateMany({ where: { id, tenantId: scope.tenantId, applicationId: scope.id, rowVersion: command.rowVersion, status: 'DRAFT' }, data: { status: 'PUBLISHED', isCurrent: true, rowVersion: { increment: 1 }, updatedBy: account } });
      if (!changed.count) throw bad('BOM已被修改，请刷新后重试', 409);
      await this.audit(tx, scope, actorId, 'bom.publish', id);
    }, { isolationLevel: 'Serializable' });
    return this.detail(systemCode, id);
  }
}
