import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { pricingWriteSchema, suggestedPrice } from '@interaction-pattern-lab/contracts';
import type { Prisma, SdProductPrice, SdPriceTier } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

type Tx = Prisma.TransactionClient;
export type PriceRecord = SdProductPrice & { tiers: SdPriceTier[] };
@Injectable()
export class PricingService {
  constructor(private readonly db: DatabaseService) {}
  async context(code: string) {
    const app = await this.db.sysApplication.findFirst({ where: { applicationCode: code, status: 'ACTIVE' } });
    if (!app) throw new ApiException('NOT_FOUND', 404, '系统不存在'); return app;
  }
  async get(code: string, productId: string, priceId?: string, businessDate = new Date().toISOString().slice(0, 10)) {
    const app = await this.context(code);
    const item = await this.db.mdItem.findFirst({ where: { id: productId, tenantId: app.tenantId, itemType: 'PRODUCT' } });
    const product = item && this.product(item);
    if (!product) throw new ApiException('NOT_FOUND', 404, '产品不存在');
    const rows = await this.db.sdProductPrice.findMany({ where: { productId, tenantId: app.tenantId }, include: { tiers: { orderBy: { lowerQty: 'asc' } } }, orderBy: { version: 'desc' }, take: 100 });
    if (priceId && !rows.some((row) => row.id === priceId)) {
      const historical = await this.db.sdProductPrice.findFirst({ where: { id: priceId, productId, tenantId: app.tenantId }, include: { tiers: { orderBy: { lowerQty: 'asc' } } } });
      if (historical) rows.push(historical);
    }
    const current = rows.find((row) => this.matches(row, businessDate));
    return { product, current: current ? this.dto(current, businessDate) : null, history: rows.map((p) => this.dto(p, businessDate)) };
  }
  async save(code: string, productId: string, actorId: string, raw: unknown) {
    const app = await this.context(code), input = pricingWriteSchema.parse(raw);
    return this.db.$transaction(async (tx) => {
      const item = await tx.mdItem.findFirst({ where: { id: productId, tenantId: app.tenantId, itemType: 'PRODUCT' } });
      if (!item) throw new ApiException('NOT_FOUND', 404, '产品不存在');
      // Lock the one stable product row, not a price row which may not exist yet.
      await tx.$queryRaw`SELECT item_id FROM md_item WHERE item_id = ${productId}::uuid FOR UPDATE`;
      const current = await tx.sdProductPrice.findFirst({ where: { productId, tenantId: app.tenantId }, orderBy: { version: 'desc' } });
      if ((current?.version ?? 0) !== input.version) throw new ApiException('BAD_REQUEST', 409, '价格已变更，请重新加载');
      const nextFrom = new Date(`${input.effectiveDate}T00:00:00.000Z`);
      const active = await tx.sdProductPrice.findFirst({
        where: { productId, tenantId: app.tenantId, currencyCode: input.currencyCode, status: 'ACTIVE', effectiveDate: { lte: nextFrom }, OR: [{ expiresDate: null }, { expiresDate: { gte: nextFrom } }] },
        orderBy: { effectiveDate: 'desc' },
      });
      if (active) {
        if (active.effectiveDate.toISOString().slice(0, 10) === input.effectiveDate) {
          await tx.sdProductPrice.update({ where: { id: active.id }, data: { status: 'SUPERSEDED', updatedBy: actorId } });
        } else {
          const previousDay = new Date(nextFrom.getTime() - 86_400_000);
          await tx.sdProductPrice.update({ where: { id: active.id }, data: { expiresDate: previousDay, updatedBy: actorId } });
        }
      }
      const row = await tx.sdProductPrice.create({ data: { tenantId: app.tenantId, productId, itemCode: item.itemCode, version: input.version + 1, pricingType: input.pricingType, currencyCode: input.currencyCode, unitPrice: input.unitPrice, effectiveDate: new Date(input.effectiveDate), expiresDate: input.expiresDate ? new Date(input.expiresDate) : null, remark: input.remark, createdBy: actorId, updatedBy: actorId, tiers: { create: input.tiers.map((t) => ({ lowerQty: t.from, upperQty: t.to, unitPrice: t.price })) } }, include: { tiers: { orderBy: { lowerQty: 'asc' } } } });
      await tx.sysAuditLog.create({ data: { requestId: randomUUID(), tenantId: app.tenantId, applicationId: app.id, actorUserId: actorId, actionCode: 'pricing.save', resourceType: 'product-price', resourceId: productId, afterSnapshot: { version: row.version, pricingType: input.pricingType, currencyCode: input.currencyCode, effectiveDate: input.effectiveDate, expiresDate: input.expiresDate, tiers: input.tiers } } });
      return this.dto(row);
    }, { isolationLevel: 'Serializable' }).catch((error: unknown) => { if (error && typeof error === 'object' && 'code' in error) throw new ApiException('BAD_REQUEST', 409, '价格有效期与已有价格重叠，或价格已被修改'); throw error; });
  }
  async eligible(tx: Tx, _code: string, tenantId: string, productId: string) {
    const item = await tx.mdItem.findFirst({ where: { id: productId, tenantId, itemType: 'PRODUCT', status: 'ACTIVE' } });
    const p = item && this.product(item);
    if (!p) throw new ApiException('BAD_REQUEST', 400, '产品不存在或已停用');
    return p;
  }
  async reference(tx: Tx, tenantId: string, productId: string, priceId: string, quantity: string, quoteDate: string) {
    const price = await tx.sdProductPrice.findFirst({ where: { id: priceId, tenantId, productId }, include: { tiers: { orderBy: { lowerQty: 'asc' } } } });
    if (!price || !this.matches(price, quoteDate)) throw new ApiException('BAD_REQUEST', 400, '价格版本在报价日期无效或不属于该产品');
    return { price, suggestion: suggestedPrice(price.unitPrice?.toString() ?? '0', this.dto(price, quoteDate).tiers, quantity) };
  }
  private matches(row: Pick<SdProductPrice, 'status' | 'effectiveDate' | 'expiresDate'>, date: string) { const from = row.effectiveDate.toISOString().slice(0, 10), to = row.expiresDate?.toISOString().slice(0, 10); return row.status === 'ACTIVE' && from <= date && (!to || to >= date); }
  dto(row: PriceRecord, businessDate = new Date().toISOString().slice(0, 10)) { const unitPrice = row.unitPrice?.toFixed(2) ?? null; return { id: row.id, productId: row.productId, version: row.version, pricingType: row.pricingType, currencyCode: row.currencyCode, unitPrice, standardPrice: unitPrice ?? '0.00', effectiveDate: row.effectiveDate.toISOString().slice(0, 10), expiresDate: row.expiresDate?.toISOString().slice(0, 10) ?? null, isEffective: this.matches(row, businessDate), remark: row.remark, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), tiers: row.tiers.map((t) => ({ from: t.lowerQty.toString(), to: t.upperQty?.toString() ?? null, price: t.unitPrice.toFixed(2) })) }; }
  private product(row: { id: string; itemCode: string; itemName: string; model: string | null; productLine: string | null; baseUnit: string; status: 'ACTIVE' | 'DISABLED'; remark: string | null; version: number; createdAt: Date; updatedAt: Date }) { return { id: row.id, productCode: row.itemCode, productName: row.itemName, model: row.model, productLine: row.productLine, unit: row.baseUnit, status: row.status, remark: row.remark, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt }; }
}
