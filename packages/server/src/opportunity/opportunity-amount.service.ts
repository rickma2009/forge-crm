import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { quotationCommandSchema } from '@interaction-pattern-lab/contracts';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../rbac/authorization.service';
import { QuotationService } from '../quotation/quotation.service';
import { quoteObjectWhere } from '../quotation/quotation-domain';
import { ApiException } from '../http/api-exceptions';

@Injectable()
export class OpportunityAmountService {
  constructor(private readonly db: DatabaseService, private readonly quotes: QuotationService, private readonly auth: AuthorizationService) {}
  async applyQuote(code: string, actorId: string, quoteId: string, raw: unknown) {
    const scope = await this.quotes.scope(code, actorId, 'writeback'), input = quotationCommandSchema.parse(raw);
    if (!input.opportunityVersion) throw new ApiException('BAD_REQUEST', 400, '缺少商机当前版本');
    await this.auth.assertAction(actorId, code, 'opportunity-directory', 'update');
    const requestHash = createHash('sha256').update(JSON.stringify({ quoteId, input })).digest('hex');
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope.id + actorId + input.requestKey}, 0))`;
      const quote = await tx.sdQuotation.findFirst({ where: { id: quoteId, tenantId: scope.tenantId, applicationId: scope.id, ...quoteObjectWhere(actorId, scope.systemRole) } });
      if (!quote?.opportunityId) throw new ApiException('NOT_FOUND', 404, '报价不存在或未关联商机');
      const opp = await tx.sdOpp.findFirst({ where: { id: quote.opportunityId, tenantId: scope.tenantId, applicationId: scope.id, customerId: quote.customerId, ...quoteObjectWhere(actorId, scope.systemRole) } });
      if (!opp) throw new ApiException('NOT_FOUND', 404, '商机不存在或无权回写');
      const old = await tx.sdQuoteEvent.findUnique({ where: { applicationId_actorId_requestKey: { applicationId: scope.id, actorId, requestKey: input.requestKey } } });
      if (old) { if (old.requestHash !== requestHash) throw new ApiException('BAD_REQUEST', 409, '请求标识已使用'); return old.result; }
      if (quote.status !== 'ACCEPTED' || quote.version !== input.version || opp.version !== input.opportunityVersion) throw new ApiException('BAD_REQUEST', 409, '报价或商机已改变，请重新确认');
      const locked = await tx.sdQuotation.updateMany({ where: { id: quote.id, version: input.version, status: 'ACCEPTED' }, data: { version: { increment: 1 }, updatedBy: actorId } });
      const changed = await tx.sdOpp.updateMany({ where: { id: opp.id, version: input.opportunityVersion }, data: { expectedAmount: quote.total, version: { increment: 1 }, updatedBy: actorId } });
      if (!locked.count || !changed.count) throw new ApiException('BAD_REQUEST', 409, '并发冲突，请重新确认');
      await tx.sdOppAmountEvent.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, opportunityId: opp.id, quotationId: quote.id, oldAmount: opp.expectedAmount, newAmount: quote.total, opportunityVersion: opp.version + 1, actorId } });
      const result = { id: quote.id, opportunityId: opp.id, expectedAmount: quote.total.toFixed(2), opportunityVersion: opp.version + 1, version: quote.version + 1 };
      await tx.sdQuoteEvent.create({ data: { tenantId: scope.tenantId, applicationId: scope.id, quotationId: quote.id, action: 'writeback', actorId, requestKey: input.requestKey, requestHash, result, note: input.note } });
      return result;
    });
  }
}
