import { NumberingService } from '../numbering/numbering.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  competitorUpdateSchema, competitorWriteSchema, opportunityAnalysisWriteSchema, opportunityFollowUpUpdateSchema,
  opportunityFollowUpWriteSchema, opportunityStageUpdateSchema, opportunityStageWriteSchema, opportunityStageDeleteSchema, opportunityUpdateSchema, opportunityWriteSchema,
  productUpdateSchema, productWriteSchema, opportunityBusinessStatusSchema,
} from '@forge-crm/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { calculateExpectedAmount, ensureAnalysisCompetitors, ensureStageTemplate, opportunityLifecycle } from './opportunity-domain';
import { randomUUID, createHash } from 'node:crypto';
import { Prisma, type SdOpp, type SdOppStage } from '../generated/prisma/client';
import { opportunityStageCommandSchema } from '@forge-crm/contracts';
import { configuredStageTemplate } from './configured-stage-template';

const pageQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), keyword: z.string().trim().max(255).optional(), status: z.enum(['ACTIVE', 'DISABLED']).optional() });
const oppQuerySchema = pageQuerySchema.extend({ businessStatus: opportunityBusinessStatusSchema.optional(), customerId: z.string().uuid().optional(), templateId: z.string().uuid().optional(), stageId: z.string().uuid().optional(), ownerUserId: z.string().uuid().optional() });

@Injectable()
export class OpportunityService {
  constructor(private readonly db: DatabaseService, private readonly numbers: NumberingService = new NumberingService(db)) {}

  private async context(systemCode: string) {
    const application = await this.db.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' }, select: { id: true, tenantId: true } });
    if (!application) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    return application;
  }

  async listProducts(systemCode: string, raw: Record<string, unknown>) {
    const [scope, query] = await Promise.all([this.context(systemCode), Promise.resolve(pageQuerySchema.parse(raw))]);
    const where = { tenantId: scope.tenantId, itemType: 'PRODUCT' as const, ...(query.status ? { status: query.status } : {}), ...(query.keyword ? { OR: [{ itemCode: { contains: query.keyword, mode: 'insensitive' as const } }, { itemName: { contains: query.keyword, mode: 'insensitive' as const } }, { model: { contains: query.keyword, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await Promise.all([this.db.mdItem.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), this.db.mdItem.count({ where })]);
    const categoryIds = [...new Set(items.flatMap((item) => [item.middleCategoryId, item.minorCategoryId]).filter((id): id is string => Boolean(id)))];
    const categories = categoryIds.length ? await this.db.sysDictionaryItem.findMany({ where: { id: { in: categoryIds } }, select: { id: true, itemName: true } }) : [];
    const categoryNames = new Map(categories.map((category) => [category.id, category.itemName]));
    return { items: items.map((item) => this.product(item, categoryNames)), pagination: this.page(query, total) };
  }
  async createProduct(systemCode: string, actor: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(productWriteSchema.parse(raw))]);
    const row = await this.db.mdItem.create({ data: { tenantId: scope.tenantId, itemCode: input.productCode, itemName: input.productName, itemType: 'PRODUCT', model: input.model, productLine: input.productLine, baseUnit: input.unit || '件', status: input.status, remark: input.remark, createdBy: actor, updatedBy: actor } }).catch(() => { throw new ApiException('BAD_REQUEST', 409, '产品编码已存在'); });
    return this.product(row);
  }
  async productDetail(systemCode: string, id: string) {
    const scope = await this.context(systemCode);
    const row = await this.db.mdItem.findFirst({ where: { id, tenantId: scope.tenantId, itemType: 'PRODUCT' } });
    if (!row) throw new ApiException('NOT_FOUND', 404, '产品不存在');
    return this.product(row);
  }
  async updateProduct(systemCode: string, id: string, actor: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(productUpdateSchema.parse(raw))]);
    const { version, productName, unit, ...data } = input;
    const changed = await this.db.mdItem.updateMany({ where: { id, tenantId: scope.tenantId, itemType: 'PRODUCT', version }, data: { ...data, ...(productName === undefined ? {} : { itemName: productName }), ...(unit === undefined ? {} : { baseUnit: unit || '件' }), updatedBy: actor, version: { increment: 1 } } });
    if (!changed.count) throw new ApiException('BAD_REQUEST', 409, '产品不存在或已被修改');
    return this.product(await this.db.mdItem.findUniqueOrThrow({ where: { id } }));
  }
  async deleteProduct(systemCode: string, id: string, actorUserId: string, actor: string, input: { version: number }) {
    const scope = await this.context(systemCode);
    return this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ item_id: string; item_code: string }>>`SELECT item_id, item_code FROM md_item WHERE item_id=${id}::uuid AND tenant_id=${scope.tenantId}::uuid FOR UPDATE`;
      const existing = await tx.mdItem.findFirst({ where: { id, tenantId: scope.tenantId, itemType: 'PRODUCT' } });
      if (!rows.length || !existing || existing.version !== input.version) throw new ApiException('BAD_REQUEST', 409, '产品不存在或已被修改');
      const [opportunities, quotations, prices, attachments] = await Promise.all([
        tx.sdOppProduct.count({ where: { productId: id } }), tx.sdQuotationLine.count({ where: { productId: id, tenantId: scope.tenantId } }),
        tx.sdProductPrice.count({ where: { productId: id, tenantId: scope.tenantId } }), tx.sysAttachment.count({ where: { applicationId: scope.id, ownerType: 'PRODUCT', ownerId: id } }),
      ]);
      if (opportunities || quotations || prices || attachments) throw new ApiException('BAD_REQUEST', 409, '产品已被业务或附件引用，不能删除', { reason: 'PRODUCT_REFERENCED', opportunities, quotations, prices, attachments });
      const removed = await tx.mdItem.deleteMany({ where: { id, tenantId: scope.tenantId, itemType: 'PRODUCT', version: input.version } });
      if (!removed.count) throw new ApiException('BAD_REQUEST', 409, '产品已被修改，请刷新后重试');
      await tx.sysAuditLog.create({ data: { requestId: randomUUID(), tenantId: scope.tenantId, applicationId: scope.id, actorUserId, actionCode: 'product.delete', resourceType: 'item', resourceId: id, beforeSnapshot: { itemCode: existing.itemCode, itemName: existing.itemName, version: existing.version }, afterSnapshot: { deleted: true, actor } } });
      return { deleted: true };
    }, { isolationLevel: 'Serializable' });
  }

  async listCompetitors(systemCode: string, raw: Record<string, unknown>) {
    const [scope, query] = await Promise.all([this.context(systemCode), Promise.resolve(pageQuerySchema.parse(raw))]);
    const where = { tenantId: scope.tenantId, ...(query.status ? { status: query.status } : {}), ...(query.keyword ? { OR: [{ competitorName: { contains: query.keyword, mode: 'insensitive' as const } }, { industryPosition: { contains: query.keyword, mode: 'insensitive' as const } }, { location: { contains: query.keyword, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await Promise.all([this.db.sdCompetitor.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), this.db.sdCompetitor.count({ where })]);
    return { items: items.map(this.competitor), pagination: this.page(query, total) };
  }
  async createCompetitor(systemCode: string, actor: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(competitorWriteSchema.parse(raw))]);
    const row = await this.db.sdCompetitor.create({ data: { tenantId: scope.tenantId, ...input, createdBy: actor, updatedBy: actor } }).catch(() => { throw new ApiException('BAD_REQUEST', 409, '竞争对象名称已存在'); });
    return this.competitor(row);
  }
  async updateCompetitor(systemCode: string, id: string, actor: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(competitorUpdateSchema.parse(raw))]);
    const { version, ...data } = input;
    const changed = await this.db.sdCompetitor.updateMany({ where: { id, tenantId: scope.tenantId, version }, data: { ...data, updatedBy: actor, version: { increment: 1 } } });
    if (!changed.count) throw new ApiException('BAD_REQUEST', 409, '竞争对象不存在或已被修改');
    return this.competitor(await this.db.sdCompetitor.findUniqueOrThrow({ where: { id } }));
  }

  async templates(systemCode: string) {
    const scope = await this.context(systemCode);
    const [rows, configured] = await Promise.all([
      this.db.sdOppTemplate.findMany({ where: { applicationId: scope.id }, include: { stages: { orderBy: [{ sortNo: 'asc' }, { stageCode: 'asc' }] } }, orderBy: [{ isDefault: 'desc' }, { templateName: 'asc' }] }),
      configuredStageTemplate(this.db, scope),
    ]);
    return rows.map((row) => ({ ...this.audit(row), templateCode: row.templateCode, templateName: row.templateName, isDefault: row.id === configured?.id, status: row.status, stages: row.stages.map((stage) => ({ ...this.audit(stage), templateId: stage.templateId, stageCode: stage.stageCode, stageName: stage.stageName, probability: stage.probability, isDefault: stage.isDefault, sortNo: stage.sortNo, status: stage.status })) }));
  }
  async createStage(systemCode: string, templateId: string, actorUserId: string, actor: string, requestId: string, raw: unknown) {
    z.string().uuid().parse(templateId);
    const scope = await this.context(systemCode); const input = opportunityStageWriteSchema.parse(raw);
    if (input.isDefault && input.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', 409, '默认阶段必须启用');
    await this.db.$transaction(async (tx) => {
      const template = await tx.sdOppTemplate.findFirst({ where: { id: templateId, tenantId: scope.tenantId, applicationId: scope.id, status: 'ACTIVE' } });
      if (!template) throw new ApiException('NOT_FOUND', 404, '商机模板不存在或已停用');
      await tx.sdOppTemplate.update({ where: { id: template.id }, data: { updatedBy: actor, version: { increment: 1 } } });
      if (!input.isDefault && !await tx.sdOppStage.count({ where: { templateId, isDefault: true, status: 'ACTIVE' } })) throw new ApiException('BAD_REQUEST', 409, '模板需要一个启用的默认阶段，请将首个阶段设为默认');
      if (input.isDefault) await tx.sdOppStage.updateMany({ where: { templateId, isDefault: true }, data: { isDefault: false, updatedBy: actor, version: { increment: 1 } } });
      const stage = await tx.sdOppStage.create({ data: { templateId, ...input, createdBy: actor, updatedBy: actor } });
      await tx.sysAuditLog.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, actorUserId, actionCode: 'opportunity.stage.create', resourceType: 'opp-stage', resourceId: stage.id, afterSnapshot: { templateId, ...input }, requestId } });
    }, { isolationLevel: 'Serializable' }).catch((error: unknown) => this.stageWriteError(error));
    return this.templates(systemCode);
  }

  async updateStage(systemCode: string, stageId: string, actorUserId: string, actor: string, requestId: string, raw: unknown) {
    z.string().uuid().parse(stageId);
    const scope = await this.context(systemCode); const { version, ...input } = opportunityStageUpdateSchema.parse(raw);
    await this.db.$transaction(async (tx) => {
      const existing = await tx.sdOppStage.findFirst({ where: { id: stageId, template: { applicationId: scope.id, tenantId: scope.tenantId } } });
      if (!existing || existing.version !== version) throw new ApiException('BAD_REQUEST', 409, '阶段不存在或已被修改，请刷新后重试');
      const nextDefault = input.isDefault ?? existing.isDefault; const nextStatus = input.status ?? existing.status;
      if (existing.isDefault && (!nextDefault || nextStatus !== 'ACTIVE')) throw new ApiException('BAD_REQUEST', 409, '请先将其他启用阶段设为默认，再修改当前默认阶段');
      if (nextDefault && nextStatus !== 'ACTIVE') throw new ApiException('BAD_REQUEST', 409, '默认阶段必须启用');
      await tx.sdOppTemplate.update({ where: { id: existing.templateId }, data: { updatedBy: actor, version: { increment: 1 } } });
      if (input.isDefault) await tx.sdOppStage.updateMany({ where: { templateId: existing.templateId, id: { not: stageId }, isDefault: true }, data: { isDefault: false, updatedBy: actor, version: { increment: 1 } } });
      const changed = await tx.sdOppStage.updateMany({ where: { id: stageId, templateId: existing.templateId, version }, data: { ...input, version: { increment: 1 }, updatedBy: actor } });
      if (!changed.count) throw new ApiException('BAD_REQUEST', 409, '阶段已被修改，请刷新后重试');
      await tx.sysAuditLog.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, actorUserId, actionCode: 'opportunity.stage.update', resourceType: 'opp-stage', resourceId: stageId, beforeSnapshot: { stageName: existing.stageName, probability: existing.probability, isDefault: existing.isDefault, status: existing.status, version }, afterSnapshot: input, requestId } });
    }, { isolationLevel: 'Serializable' }).catch((error: unknown) => this.stageWriteError(error));
    return this.templates(systemCode);
  }

  async deleteStage(systemCode: string, stageId: string, actorUserId: string, actor: string, requestId: string, raw: unknown) {
    z.string().uuid().parse(stageId);
    const scope = await this.context(systemCode); const { version } = opportunityStageDeleteSchema.parse(raw);
    await this.db.$transaction(async (tx) => {
      const existing = await tx.sdOppStage.findFirst({ where: { id: stageId, template: { applicationId: scope.id, tenantId: scope.tenantId } } });
      if (!existing || existing.version !== version) throw new ApiException('BAD_REQUEST', 409, '阶段不存在或已被修改，请刷新后重试');
      if (existing.isDefault) throw new ApiException('BAD_REQUEST', 409, '默认阶段不能删除，请先指定其他默认阶段');
      await tx.sdOppTemplate.update({ where: { id: existing.templateId }, data: { updatedBy: actor, version: { increment: 1 } } });
      const [opportunities, analyses] = await Promise.all([tx.sdOpp.count({ where: { stageId } }), tx.sdOppAnalysis.count({ where: { stageId } })]);
      if (opportunities || analyses) throw new ApiException('BAD_REQUEST', 409, '阶段已被商机或历史分析记录引用，不能删除；可改为停用');
      const removed = await tx.sdOppStage.deleteMany({ where: { id: stageId, templateId: existing.templateId, version, isDefault: false } });
      if (!removed.count) throw new ApiException('BAD_REQUEST', 409, '阶段已被修改，请刷新后重试');
      await tx.sysAuditLog.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, actorUserId, actionCode: 'opportunity.stage.delete', resourceType: 'opp-stage', resourceId: stageId, beforeSnapshot: { templateId: existing.templateId, stageCode: existing.stageCode, stageName: existing.stageName, probability: existing.probability, sortNo: existing.sortNo, status: existing.status, version }, afterSnapshot: { deleted: true }, requestId } });
    }, { isolationLevel: 'Serializable' }).catch((error: unknown) => this.stageWriteError(error));
    return this.templates(systemCode);
  }

  private stageWriteError(error: unknown): never {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'P2002') throw new ApiException('BAD_REQUEST', 409, '该模板下阶段编码已存在，或默认阶段发生冲突');
    if (code === 'P2003') throw new ApiException('BAD_REQUEST', 409, '阶段已被引用，不能删除；请刷新后重试');
    if (code === 'P2034') throw new ApiException('BAD_REQUEST', 409, '阶段配置已被其他人修改，请刷新后重试');
    throw error;
  }

  async userOptions(systemCode: string) {
    const scope = await this.context(systemCode);
    return this.db.iamUser.findMany({ where: { tenantId: scope.tenantId, status: 'ACTIVE' }, select: { id: true, account: true, displayName: true }, orderBy: { displayName: 'asc' } });
  }

  async listOpportunities(systemCode: string, raw: Record<string, unknown>) {
    const [scope, query] = await Promise.all([this.context(systemCode), Promise.resolve(oppQuerySchema.parse(raw))]);
    const where = { applicationId: scope.id, ...(query.businessStatus ? { businessStatus: query.businessStatus } : {}), ...(query.status ? { status: query.status } : {}), ...(query.customerId ? { customerId: query.customerId } : {}), ...(query.templateId ? { templateId: query.templateId } : {}), ...(query.stageId ? { stageId: query.stageId } : {}), ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}), ...(query.keyword ? { OR: [{ opportunityCode: { contains: query.keyword, mode: 'insensitive' as const } }, { opportunityName: { contains: query.keyword, mode: 'insensitive' as const } }, { customerName: { contains: query.keyword, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await Promise.all([this.db.sdOpp.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), this.db.sdOpp.count({ where })]);
    return { items: items.map((item) => this.opp(item)), pagination: this.page(query, total) };
  }

  async board(systemCode: string, raw: Record<string, unknown>) {
    const scope = await this.context(systemCode);
    const query = z.object({ templateId: z.string().uuid(), keyword: z.string().trim().max(255).optional(),
      businessStatus: opportunityBusinessStatusSchema.optional(), stageId: z.string().uuid().optional(),
      after: z.string().uuid().optional(), pageSize: z.coerce.number().int().min(1).max(50).default(20),
    }).parse(raw);
    if (query.after && !query.stageId) throw new ApiException('BAD_REQUEST', 400, '分页必须指定阶段');
    return this.db.$transaction(async tx => {
      const template = await tx.sdOppTemplate.findFirst({ where: { id: query.templateId, applicationId: scope.id, status: 'ACTIVE' }, include: { stages: { orderBy: [{ sortNo: 'asc' }, { id: 'asc' }] } } });
      if (!template) throw new ApiException('BAD_REQUEST', 409, '看板模板已失效，请切回表格重新选择');
      if (query.stageId && !template.stages.some(s => s.id === query.stageId)) throw new ApiException('BAD_REQUEST', 400, '阶段不属于当前模板');
      const where: Prisma.SdOppWhereInput = { tenantId: scope.tenantId, applicationId: scope.id, templateId: template.id,
        ...(query.businessStatus ? { businessStatus: query.businessStatus } : { status: 'ACTIVE', businessStatus: { in: ['INITIAL', 'FOLLOWING'] } }),
        ...(query.keyword ? { OR: ['opportunityCode', 'opportunityName', 'customerName'].map(field => ({ [field]: { contains: query.keyword, mode: 'insensitive' } })) } : {}),
      };
      const groups = await tx.sdOpp.groupBy({ by: ['stageId'], where, _count: { _all: true, expectedAmount: true }, _sum: { expectedAmount: true } });
      const columns = [];
      for (const stage of template.stages.filter(s => !query.stageId || s.id === query.stageId)) {
        const group = groups.find(g => g.stageId === stage.id);
        if (stage.status !== 'ACTIVE' && !group) continue;
        const rows = await tx.sdOpp.findMany({ where: { ...where, stageId: stage.id, ...(query.after ? { id: { gt: query.after } } : {}) }, orderBy: { id: 'asc' }, take: query.pageSize + 1 });
        const items = rows.slice(0, query.pageSize);
        columns.push({ stage: { ...this.audit(stage), templateId: stage.templateId, stageCode: stage.stageCode, stageName: stage.stageName, probability: stage.probability, isDefault: stage.isDefault, sortNo: stage.sortNo, status: stage.status },
          total: group?._count._all ?? 0, amount: group?._sum.expectedAmount?.toFixed(2) ?? '0.00', missingAmount: group ? group._count._all - group._count.expectedAmount : 0,
          items: items.map(item => this.opp(item)), nextCursor: rows.length > query.pageSize ? items.at(-1)!.id : null });
      }
      return { templateId: template.id, columns };
    }, { isolationLevel: 'RepeatableRead' });
  }

  /** All stage-writing entry points use this validation/event writer in their original transaction. */
  private async recordStageChange(tx: Prisma.TransactionClient, current: SdOpp, stage: SdOppStage, actor: string, reason: string | undefined, source: string, requestId: string = randomUUID(), payloadHash = '') {
    if (current.stageId === stage.id) return;
    if (current.status !== 'ACTIVE' || !['INITIAL', 'FOLLOWING'].includes(current.businessStatus)) throw new ApiException('BAD_REQUEST', 409, '已关闭或停用商机不能变更阶段');
    // Stage administration locks this same template before changing stages. Keep the
    // configuration stable until the opportunity and its event have committed.
    const templates = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM sd_opp_template WHERE id=${current.templateId}::uuid AND application_id=${current.applicationId}::uuid AND tenant_id=${current.tenantId}::uuid AND status='ACTIVE' FOR SHARE`;
    if (!templates.length) throw new ApiException('BAD_REQUEST', 409, '商机模板已失效');
    const latestTarget = await tx.sdOppStage.findFirst({ where: { id: stage.id, templateId: current.templateId } });
    if (!latestTarget || latestTarget.version !== stage.version) throw new ApiException('BAD_REQUEST', 409, '阶段配置已变化，请刷新后重试');
    const previous = await tx.sdOppStage.findFirst({ where: { id: current.stageId, templateId: current.templateId } });
    if (!previous || previous.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', 409, '历史停用阶段只读，不能移动');
    ensureStageTemplate(current.templateId, stage);
    if (!reason?.trim()) throw new ApiException('BAD_REQUEST', 400, '变更阶段必须填写理由');
    await tx.sdOppStageEvent.create({ data: { tenantId: current.tenantId, applicationId: current.applicationId, opportunityId: current.id,
      fromStageId: current.stageId, toStageId: stage.id, fromStageName: current.stageName, toStageName: stage.stageName,
      reason: reason.trim(), source, actor, requestId, payloadHash, opportunityVersion: current.version + 1 } });
  }

  async changeStage(systemCode: string, id: string, actor: string, raw: unknown) {
    const scope = await this.context(systemCode), input = opportunityStageCommandSchema.parse(raw);
    z.string().uuid().parse(id);
    const hash = createHash('sha256').update(JSON.stringify({ id, actor, ...input })).digest('hex');
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM sd_opp WHERE id=${id}::uuid AND application_id=${scope.id}::uuid AND tenant_id=${scope.tenantId}::uuid FOR UPDATE`;
      const current = await tx.sdOpp.findFirst({ where: { id, applicationId: scope.id, tenantId: scope.tenantId } });
      if (!current) throw new ApiException('NOT_FOUND', 404, '商机不存在');
      const prior = await tx.sdOppStageEvent.findUnique({ where: { applicationId_requestId: { applicationId: scope.id, requestId: input.requestId } } });
      if (prior) {
        if (prior.payloadHash !== hash) throw new ApiException('BAD_REQUEST', 409, '请求号已使用且内容不同');
        return this.detailInTransaction(tx, scope.id, id);
      }
      if (current.version !== input.version) throw new ApiException('BAD_REQUEST', 409, '商机已被其他用户修改，请刷新后重试');
      const stage = await tx.sdOppStage.findFirst({ where: { id: input.stageId, templateId: current.templateId, template: { applicationId: scope.id, status: 'ACTIVE' } } });
      if (!stage) throw new ApiException('BAD_REQUEST', 400, '目标阶段不属于当前有效模板');
      if (current.stageId === stage.id) return this.detailInTransaction(tx, scope.id, id);
      await this.recordStageChange(tx, current, stage, actor, input.reason, 'KANBAN', input.requestId, hash);
      const updated = await tx.sdOpp.updateMany({ where: { id, applicationId: scope.id, version: current.version }, data: { stageId: stage.id, stageName: stage.stageName, stageProbability: stage.probability, version: { increment: 1 }, updatedBy: actor } });
      if (!updated.count) throw new ApiException('BAD_REQUEST', 409, '商机已被其他用户修改，请刷新后重试');
      return this.detailInTransaction(tx, scope.id, id);
    }).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code))) throw new ApiException('BAD_REQUEST', 409, '阶段请求发生并发冲突，请刷新后重试');
      throw error;
    });
  }

  async createOpportunity(systemCode: string, actorId: string, actor: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(opportunityWriteSchema.parse(raw))]);
    const opportunityCode = await this.numbers.allocate(systemCode, 'OPPORTUNITY');
    return this.db.$transaction(async (tx) => {
      const configured = await configuredStageTemplate(tx, scope);
      if (!configured) throw new ApiException('BAD_REQUEST', 409, '未设置有效商机阶段模板，请先在系统参数中维护');
      const refs = await this.references(tx, scope, systemCode, { ...input, templateId: configured.id });

      const { products, ...base } = input;
      base.templateId = configured.id;
      Object.assign(base, opportunityLifecycle(input));
      for (const field of ['confirmedDate', 'expectedSignDate', 'signedDate', 'lostDate'] as const) if (base[field]) Object.assign(base, { [field]: new Date(base[field]!) });
      const created = await tx.sdOpp.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, systemCode, opportunityCode, ...base, customerName: refs.customer.customerName, contactName: refs.contact?.name ?? null, ownerName: refs.owner.displayName, templateName: refs.template.templateName, stageName: refs.stage.stageName, stageProbability: refs.stage.probability, createdBy: actor, updatedBy: actor } });
      await this.replaceProducts(tx, created.id, scope.tenantId, products, actor);
      return this.opp(await tx.sdOpp.findUniqueOrThrow({ where: { id: created.id }, include: { products: { orderBy: { sortNo: 'asc' } } } }));
    }, { isolationLevel: 'Serializable' });
  }

  async updateOpportunity(systemCode: string, id: string, actor: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(opportunityUpdateSchema.parse(raw))]);
    return this.db.$transaction(async (tx) => {
      const current = await tx.sdOpp.findFirst({ where: { id, applicationId: scope.id } });
      if (!current || current.version !== input.version) throw new ApiException('BAD_REQUEST', 409, '商机不存在或已被修改');
      const merged = { opportunityName: input.opportunityName ?? current.opportunityName, customerId: input.customerId ?? current.customerId, contactId: input.contactId === undefined ? current.contactId : input.contactId, ownerUserId: input.ownerUserId ?? current.ownerUserId, source: input.source === undefined ? current.source : input.source, templateId: input.templateId ?? current.templateId, stageId: input.stageId ?? current.stageId, confidence: input.confidence ?? current.confidence, status: input.status ?? current.status, products: input.products ?? [] };
      const refs = await this.references(tx, scope, systemCode, merged);
      const { products, version, stageReason, ...data } = input;
      if (merged.templateId !== current.templateId) throw new ApiException('BAD_REQUEST', 400, '已创建商机不可更换阶段模板');
      await this.recordStageChange(tx, current, refs.stage, actor, stageReason, 'DETAIL');
      void version;
      Object.assign(data, opportunityLifecycle({ businessStatus: input.businessStatus ?? current.businessStatus, signedDate: input.signedDate === undefined ? current.signedDate?.toISOString().slice(0, 10) : input.signedDate, lostDate: input.lostDate === undefined ? current.lostDate?.toISOString().slice(0, 10) : input.lostDate, expectedSignDate: input.expectedSignDate === undefined ? current.expectedSignDate?.toISOString().slice(0, 10) : input.expectedSignDate }));
      for (const field of ['confirmedDate', 'expectedSignDate', 'signedDate', 'lostDate'] as const) if (data[field]) Object.assign(data, { [field]: new Date(data[field]!) });
      // Legacy clients resend the numeric projection on unrelated edits. Preserve exact cents.
      if (typeof data.expectedAmount === 'number' && current.expectedAmount && data.expectedAmount === current.expectedAmount.toNumber()) delete data.expectedAmount;
      const changed = await tx.sdOpp.updateMany({ where: { id, applicationId: scope.id, version: current.version }, data: { ...data, customerName: refs.customer.customerName, contactName: refs.contact?.name ?? null, ownerName: refs.owner.displayName, templateName: refs.template.templateName, stageName: refs.stage.stageName, stageProbability: refs.stage.probability, version: { increment: 1 }, updatedBy: actor } });
      if (!changed.count) throw new ApiException('BAD_REQUEST', 409, '商机已被其他用户修改');
      if ((current.businessStatus && data.businessStatus !== current.businessStatus) || (data.status && data.status !== current.status)) {
        const labels: Record<string, string> = { INITIAL: '初始', FOLLOWING: '跟进中', SIGNED: '已签约', LOST: '已丢单', VOID: '已作废' };
        const user = await tx.iamUser.findFirst({ where: { tenantId: scope.tenantId, account: actor } });
        await tx.sysAuditLog.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, actorUserId: user?.id, resourceType: 'opportunity', resourceId: id, actionCode: 'opportunity.lifecycle.change', requestId: randomUUID(),
          beforeSnapshot: { businessStatus: current.businessStatus, status: current.status, label: `${labels[current.businessStatus] ?? current.businessStatus} / ${current.status === 'ACTIVE' ? '启用' : '停用'}` },
          afterSnapshot: { businessStatus: data.businessStatus, status: data.status ?? current.status, label: `${labels[data.businessStatus!] ?? data.businessStatus} / ${(data.status ?? current.status) === 'ACTIVE' ? '启用' : '停用'}`, actor, reason: '商机详情保存', version: current.version + 1 } } });
      }
      if (data.expectedAmount !== undefined && (data.expectedAmount === null ? current.expectedAmount !== null : !current.expectedAmount?.equals(data.expectedAmount))) await tx.sdOppAmountEvent.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, opportunityId: id, oldAmount: current.expectedAmount, newAmount: data.expectedAmount, opportunityVersion: current.version + 1, actorId: actor } });
      if (products) await this.replaceProducts(tx, id, scope.tenantId, products, actor);
      return this.detailInTransaction(tx, scope.id, id);
    });
  }

  async detail(systemCode: string, id: string) {
    const scope = await this.context(systemCode);
    return this.detailInTransaction(this.db, scope.id, id);
  }

  async createFollowUp(systemCode: string, id: string, userId: string, actor: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(opportunityFollowUpWriteSchema.parse(raw))]);
    if (Date.parse(input.followedAt) > Date.now()) throw new ApiException('BAD_REQUEST', 400, '跟进时间不能在未来，请使用待办');
    const requestHash = createHash('sha256').update(JSON.stringify({ systemCode, id, userId, ...input })).digest('hex');
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM sys_user WHERE id=${userId}::uuid AND tenant_id=${scope.tenantId}::uuid FOR UPDATE`;
      const opp = await tx.sdOpp.findFirst({ where: { id, applicationId: scope.id, tenantId: scope.tenantId } });
      if (!opp) throw new ApiException('NOT_FOUND', 404, '商机不存在');
      if (input.requestId) {
        const old = await tx.sdOppFollowUp.findUnique({ where: { requestId: input.requestId } });
        if (old) { if (old.requestHash !== requestHash) throw new ApiException('BAD_REQUEST', 409, '请求号已使用且内容不同'); return this.detailInTransaction(tx, scope.id, id); }
      }
      const user = await tx.iamUser.findFirst({ where: { id: userId, tenantId: scope.tenantId, status: 'ACTIVE' } });
      if (!user) throw new ApiException('BAD_REQUEST', 400, '跟进人不可用');
      await tx.sdOppFollowUp.create({ data: { opportunityId: id, followedAt: new Date(input.followedAt), followerUserId: userId, followerName: user.displayName, workItem: input.workItem, resultNext: input.resultNext, status: input.status, activityTitle: input.activityTitle, activityNextStep: input.activityNextStep, createdBy: actor, updatedBy: actor, requestId: input.requestId, requestHash: input.requestId ? requestHash : null } });
      return this.detailInTransaction(tx, scope.id, id);
    }).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new ApiException('BAD_REQUEST', 409, '请求号已使用，请确认原跟进记录');
      throw error;
    });
  }
  async updateFollowUp(systemCode: string, id: string, followUpId: string, actor: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(opportunityFollowUpUpdateSchema.parse(raw))]);
    if (input.followedAt && Date.parse(input.followedAt) > Date.now()) throw new ApiException('BAD_REQUEST', 400, '跟进时间不能在未来，请使用待办');
    return this.db.$transaction(async tx => {
      const current = await tx.sdOppFollowUp.findFirst({ where: { id: followUpId, opportunityId: id, opportunity: { applicationId: scope.id, tenantId: scope.tenantId } } });
      if (!current) throw new ApiException('NOT_FOUND', 404, '跟进不存在');
      const user = await tx.iamUser.findFirst({ where: { tenantId: scope.tenantId, account: actor, status: 'ACTIVE' } });
      if (!user || current.followerUserId !== user.id) throw new ApiException('FORBIDDEN', 403, '只能维护自己创建的跟进');
      if (current.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', 409, '已作废跟进不可修改');
      const { version, followedAt, changeReason, ...data } = input;
      const changed = await tx.sdOppFollowUp.updateMany({ where: { id: followUpId, opportunityId: id, version, status: 'ACTIVE' }, data: { ...data, ...(followedAt ? { followedAt: new Date(followedAt) } : {}), updatedBy: actor, version: { increment: 1 } } });
      if (!changed.count) throw new ApiException('BAD_REQUEST', 409, '跟进记录已被修改');
      await tx.sysAuditLog.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, actorUserId: user.id, resourceType: 'opportunity-follow-up', resourceId: followUpId, actionCode: input.status === 'DISABLED' ? 'follow-up.void' : 'follow-up.update', requestId: randomUUID(), beforeSnapshot: JSON.parse(JSON.stringify(current)), afterSnapshot: { ...input, reason: changeReason ?? '跟进记录修订' } } });
      return this.detailInTransaction(tx, scope.id, id);
    });
  }

  async createAnalysis(systemCode: string, id: string, userId: string, raw: unknown) {
    const [scope, input] = await Promise.all([this.context(systemCode), Promise.resolve(opportunityAnalysisWriteSchema.parse(raw))]);
    ensureAnalysisCompetitors(input.competitorIds);
    return this.db.$transaction(async (tx) => {
      const opp = await tx.sdOpp.findFirst({ where: { id, applicationId: scope.id } });
      if (!opp || (input.opportunityVersion && opp.version !== input.opportunityVersion)) throw new ApiException('BAD_REQUEST', 409, '商机不存在或已被修改');
      const stage = await tx.sdOppStage.findFirst({ where: { id: input.stageId }, include: { template: true } });
      if (!stage) throw new ApiException('BAD_REQUEST', 400, '商机阶段不存在');
      ensureStageTemplate(opp.templateId, stage);
      const [analyst, competitors] = await Promise.all([
        tx.iamUser.findFirst({ where: { id: userId, tenantId: scope.tenantId, status: 'ACTIVE' } }),
        tx.sdCompetitor.findMany({ where: { id: { in: input.competitorIds }, tenantId: scope.tenantId, status: 'ACTIVE' } }),
      ]);
      if (!analyst) throw new ApiException('BAD_REQUEST', 400, '分析人不可用');
      if (competitors.length !== input.competitorIds.length) throw new ApiException('BAD_REQUEST', 400, '竞争对象不存在或已停用');
      if (opp.stageId !== stage.id && input.opportunityVersion === undefined) throw new ApiException('BAD_REQUEST', 400, '变更阶段必须提供商机版本');
      await this.recordStageChange(tx, opp, stage, analyst.account, input.stageReason, 'ANALYSIS');
      const analysis = await tx.sdOppAnalysis.create({ data: { opportunityId: id, opportunityName: opp.opportunityName, stageId: stage.id, stageName: stage.stageName, stageProbability: stage.probability, confidence: input.confidence, opportunityPoint: input.opportunityPoint, risk: input.risk, nextPlan: input.nextPlan, remark: input.remark, analystUserId: analyst.id, analystName: analyst.displayName } });
      for (const [index, competitorId] of input.competitorIds.entries()) {
        const competitor = competitors.find((item) => item.id === competitorId)!;
        await tx.sdOppAnalysisCompetitor.create({ data: { analysisId: analysis.id, competitorId, competitorName: competitor.competitorName, rank: index + 1 } });
      }
      const changed = await tx.sdOpp.updateMany({ where: { id, version: opp.version }, data: { stageId: stage.id, stageName: stage.stageName, stageProbability: stage.probability, confidence: input.confidence, version: { increment: 1 }, updatedBy: analyst.account } });
      if (!changed.count) throw new ApiException('BAD_REQUEST', 409, '商机已被其他用户修改');
      return this.detailInTransaction(tx, scope.id, id);
    }, { isolationLevel: 'Serializable' }).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') throw new ApiException('BAD_REQUEST', 409, '商机已被其他用户修改，请刷新后重试');
      throw error;
    });
  }

  private async references(tx: Pick<DatabaseService, 'crmCustomer' | 'crmCustomerContact' | 'iamUser' | 'sdOppTemplate' | 'sdOppStage'>, scope: { id: string; tenantId: string }, systemCode: string, input: { customerId: string; contactId?: string | null; ownerUserId: string; templateId: string; stageId: string }) {
    const [customer, contact, owner, template, stage] = await Promise.all([
      tx.crmCustomer.findFirst({ where: { id: input.customerId, systemCode } }), input.contactId ? tx.crmCustomerContact.findFirst({ where: { id: input.contactId, customerId: input.customerId, systemCode } }) : null,
      tx.iamUser.findFirst({ where: { id: input.ownerUserId, tenantId: scope.tenantId, status: 'ACTIVE' } }), tx.sdOppTemplate.findFirst({ where: { id: input.templateId, applicationId: scope.id, status: 'ACTIVE' } }), tx.sdOppStage.findFirst({ where: { id: input.stageId } }),
    ]);
    if (!customer) throw new ApiException('BAD_REQUEST', 400, '客户不存在');
    if (input.contactId && !contact) throw new ApiException('BAD_REQUEST', 400, '联系人不属于所选客户');
    if (!owner) throw new ApiException('BAD_REQUEST', 400, '销售负责人不存在或已停用');
    if (!template) throw new ApiException('BAD_REQUEST', 400, '商机模板不存在或已停用');
    if (!stage) throw new ApiException('BAD_REQUEST', 400, '商机阶段不存在');
    ensureStageTemplate(template.id, stage);
    return { customer, contact, owner, template, stage };
  }

  private async replaceProducts(tx: Pick<DatabaseService, 'mdItem' | 'sdOppProduct'>, opportunityId: string, tenantId: string, products: Array<{ productId: string; quantity: number; unitPrice: number; requirement?: string | null; sortNo: number }>, actor: string) {
    const ids = [...new Set(products.map((item) => item.productId))];
    const sources = await tx.mdItem.findMany({ where: { id: { in: ids }, tenantId, itemType: 'PRODUCT', status: 'ACTIVE' } });
    if (sources.length !== ids.length) throw new ApiException('BAD_REQUEST', 400, '商品不存在或已停用');
    await tx.sdOppProduct.deleteMany({ where: { opportunityId } });
    for (const item of products) {
      const product = sources.find((source) => source.id === item.productId)!;
      await tx.sdOppProduct.create({ data: { tenantId, opportunityId, productId: product.id, productCode: product.itemCode, productName: product.itemName, model: product.model, quantity: item.quantity, unitPrice: item.unitPrice, expectedAmount: calculateExpectedAmount(item.quantity, item.unitPrice), requirement: item.requirement, sortNo: item.sortNo, createdBy: actor, updatedBy: actor } });
    }
  }

  private async assertOpp(applicationId: string, id: string) { if (!await this.db.sdOpp.findFirst({ where: { id, applicationId } })) throw new ApiException('NOT_FOUND', 404, '商机不存在'); }
  private async detailInTransaction(tx: DatabaseService | Parameters<Parameters<DatabaseService['$transaction']>[0]>[0], applicationId: string, id: string) {
    const row = await tx.sdOpp.findFirst({ where: { id, applicationId }, include: { products: { orderBy: { sortNo: 'asc' } }, followUps: { orderBy: { followedAt: 'desc' } }, analyses: { include: { competitors: { orderBy: { rank: 'asc' } } }, orderBy: { analyzedAt: 'desc' } } } });
    if (!row) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '商机不存在');
    return { opportunity: this.opp(row), followUps: row.followUps.map((item) => this.followUp(item)), analyses: row.analyses.map((item) => this.analysis(item)) };
  }
  private page(query: { page: number; pageSize: number }, total: number) { return { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) }; }
  private audit(row: { id: string; version: number; createdAt: Date; updatedAt: Date }) { return { id: row.id, version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
  private product = (row: { id: string; itemCode: string; itemName: string; middleCategoryId?: string | null; minorCategoryId?: string | null; model: string | null; productLine: string | null; baseUnit: string; status: 'ACTIVE' | 'DISABLED'; remark: string | null; version: number; createdAt: Date; updatedAt: Date }, categoryNames?: ReadonlyMap<string, string>) => ({ ...this.audit(row), productCode: row.itemCode, productName: row.itemName, model: row.model, productLine: row.productLine, unit: row.baseUnit, status: row.status, remark: row.remark, middleCategoryName: row.middleCategoryId ? categoryNames?.get(row.middleCategoryId) ?? null : null, minorCategoryName: row.minorCategoryId ? categoryNames?.get(row.minorCategoryId) ?? null : null });
  private competitor = (row: { id: string; competitorName: string; industryPosition: string | null; location: string | null; mainProducts: string | null; strengths: string | null; weaknesses: string | null; status: 'ACTIVE' | 'DISABLED'; remark: string | null; version: number; createdAt: Date; updatedAt: Date }) => ({ ...this.audit(row), competitorName: row.competitorName, industryPosition: row.industryPosition, location: row.location, mainProducts: row.mainProducts, strengths: row.strengths, weaknesses: row.weaknesses, status: row.status, remark: row.remark });
  private productLine(row: { id: string; opportunityId: string; productId: string; productCode: string; productName: string; model: string | null; quantity: { toNumber(): number }; unitPrice: { toNumber(): number }; expectedAmount: { toNumber(): number }; requirement: string | null; sortNo: number; version: number; createdAt: Date; updatedAt: Date }) { return { ...this.audit(row), opportunityId: row.opportunityId, productId: row.productId, productCode: row.productCode, productName: row.productName, model: row.model, quantity: row.quantity.toNumber(), unitPrice: row.unitPrice.toNumber(), expectedAmount: row.expectedAmount.toNumber(), requirement: row.requirement, sortNo: row.sortNo }; }
  private opp(row: { currencyCode?: string | null; id: string; opportunityCode: string; opportunityName: string; customerId: string; customerName: string; contactId: string | null; contactName: string | null; ownerUserId: string; ownerName: string; source: string | null; templateId: string; templateName: string; stageId: string; stageName: string; stageProbability: number; confidence: number; businessStatus?: string; signedDate?: Date | null; lostDate?: Date | null; confirmedDate: Date | null; expectedSignDate: Date | null; customerBudget: { toNumber(): number } | null; expectedAmount: { toNumber(): number; toFixed(digits: number): string } | null; partner: string | null; status: 'ACTIVE' | 'DISABLED'; remark: string | null; version: number; createdAt: Date; updatedAt: Date; products?: Parameters<OpportunityService['productLine']>[0][] }) { return { ...this.audit(row), opportunityCode: row.opportunityCode, opportunityName: row.opportunityName, customerId: row.customerId, customerName: row.customerName, contactId: row.contactId, contactName: row.contactName, ownerUserId: row.ownerUserId, ownerName: row.ownerName, source: row.source, templateId: row.templateId, templateName: row.templateName, stageId: row.stageId, stageName: row.stageName, stageProbability: row.stageProbability, confidence: row.confidence, businessStatus: row.businessStatus ?? 'INITIAL', signedDate: row.signedDate?.toISOString().slice(0, 10) ?? null, lostDate: row.lostDate?.toISOString().slice(0, 10) ?? null, confirmedDate: row.confirmedDate?.toISOString().slice(0, 10) ?? null, expectedSignDate: row.expectedSignDate?.toISOString().slice(0, 10) ?? null, customerBudget: row.customerBudget?.toNumber() ?? null, expectedAmount: row.expectedAmount?.toNumber() ?? null, expectedAmountExact: row.expectedAmount?.toFixed(2) ?? null, currencyCode: row.currencyCode ?? null, partner: row.partner, status: row.status, remark: row.remark, ...(row.products ? { products: row.products.map((item) => this.productLine(item)) } : {}) }; }
  private followUp(row: { activityTitle?: string | null; activityNextStep?: string | null; id: string; opportunityId: string; followedAt: Date; followerUserId: string; followerName: string; workItem: string; resultNext: string | null; status: 'ACTIVE' | 'DISABLED'; version: number; createdAt: Date; updatedAt: Date }) { return { ...this.audit(row), opportunityId: row.opportunityId, followedAt: row.followedAt.toISOString(), followerUserId: row.followerUserId, followerName: row.followerName, workItem: row.workItem, resultNext: row.resultNext, activityTitle: row.activityTitle ?? null, activityNextStep: row.activityNextStep ?? null, status: row.status }; }
  private analysis(row: { aiTaskId?: string | null; aiResult?: unknown; id: string; opportunityId: string; opportunityName: string; stageId: string; stageName: string; stageProbability: number; confidence: number; opportunityPoint: string; risk: string; nextPlan: string; remark: string | null; analystUserId: string; analystName: string; analyzedAt: Date; competitors: Array<{ id: string; competitorId: string; competitorName: string; rank: number }> }) { return { aiTaskId: row.aiTaskId ?? null, aiResult: row.aiResult ?? null, id: row.id, opportunityId: row.opportunityId, opportunityName: row.opportunityName, stageId: row.stageId, stageName: row.stageName, stageProbability: row.stageProbability, confidence: row.confidence, opportunityPoint: row.opportunityPoint, risk: row.risk, nextPlan: row.nextPlan, remark: row.remark, analystUserId: row.analystUserId, analystName: row.analystName, analyzedAt: row.analyzedAt.toISOString(), competitors: row.competitors.map(({ id, competitorId, competitorName, rank }) => ({ id, competitorId, competitorName, rank })) }; }
}
