import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { customerRelatedKindSchema, type CustomerRelatedKind, type CustomerRelatedPage, type CustomerOverview } from '@forge-crm/contracts';
import { CustomerService } from './customer.service';
import { OpportunityService } from '../opportunity/opportunity.service';
import { QuotationService } from '../quotation/quotation.service';
import { SalesService } from '../sales/sales.service';
import { AuthorizationService } from '../rbac/authorization.service';
import { RolePolicyService } from '../role-management/role-policy.service';
import { ApiException } from '../http/api-exceptions';

const pages: Record<CustomerRelatedKind, string> = { opportunities: 'opportunity-directory', quotations: 'quotation-directory', 'sales-orders': 'sales-order-directory', 'sales-outbounds': 'sales-outbound-directory' };
const pagination = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });
@Injectable()
export class CustomerRelatedService {
  constructor(private readonly customers: CustomerService, private readonly opportunities: OpportunityService, private readonly quotations: QuotationService, private readonly sales: SalesService, private readonly auth: AuthorizationService, private readonly policies: RolePolicyService) {}
  private async customer(code: string, actor: string, id: string) {
    z.string().uuid().parse(id);
    await this.auth.assertAction(actor, code, 'customer-directory', 'view');
    await this.customers.assertScopedCustomer(code, id, await this.policies.customerScope(code, actor, 'read'));
  }
  async overview(code: string, actor: string, id: string): Promise<CustomerOverview> {
    await this.customer(code, actor, id);
    const items: CustomerOverview['items'] = [];
    for (const kind of customerRelatedKindSchema.options) {
      try { await this.auth.assertAction(actor, code, pages[kind], 'view'); }
      catch (error) { if (error instanceof ApiException && error.getStatus() === 403) continue; throw error; }
      try {
        const result = await this.load(code, actor, id, kind, { page: 1, pageSize: 1 });
        items.push({ kind, count: result.pagination.total, error: false });
      } catch (error) {
        // A revoked permission must not become a visible statistic or a stale count.
        if (error instanceof ApiException && (error.getStatus() === 403 || error.getStatus() === 404)) continue;
        items.push({ kind, count: null, error: true });
      }
    }
    return { items };
  }
  async related(code: string, actor: string, id: string, rawKind: string, raw: Record<string, unknown>): Promise<CustomerRelatedPage> {
    const kind = customerRelatedKindSchema.parse(rawKind), query = pagination.parse(raw);
    await this.customer(code, actor, id);
    await this.auth.assertAction(actor, code, pages[kind], 'view');
    return this.load(code, actor, id, kind, query);
  }
  private async load(code: string, actor: string, customerId: string, kind: CustomerRelatedKind, query: { page: number; pageSize: number }): Promise<CustomerRelatedPage> {
    const q = { ...query, customerId }; // Authoritative path ID; never copy arbitrary client filters.
    if (kind === 'opportunities') {
      const result = await this.opportunities.listOpportunities(code, q);
      return { pagination: result.pagination, items: result.items.map(x => ({ id: x.id, code: x.opportunityCode, name: x.opportunityName, status: x.businessStatus, amount: x.expectedAmountExact, currency: null, date: x.expectedSignDate, owner: x.ownerName, stage: x.stageName })) };
    }
    if (kind === 'quotations') {
      const result = await this.quotations.list(code, actor, q);
      return { pagination: result.pagination, items: result.items.map(x => ({ id: x.id, code: x.quoteCode, name: x.title, status: x.status, amount: x.total, currency: null, date: x.quoteDate, owner: null, stage: null })) };
    }
    if (kind === 'sales-orders') {
      const result = await this.sales.listOrders(code, q);
      return { pagination: result.pagination, items: result.items.map(x => ({ id: x.id, code: x.orderNo, name: x.sourceNo || '独立新建', status: x.status, amount: x.netAmount, currency: x.currencyCode, date: x.orderDate, owner: x.salespersonName, stage: x.fulfillmentStatus })) };
    }
    const result = await this.sales.listOutbounds(code, q);
    return { pagination: result.pagination, items: result.items.map(x => ({ id: x.id, code: x.outboundNo, name: x.orderNo, status: x.status, amount: x.salesAmount, currency: x.currencyCode, date: x.documentDate, owner: x.shipperName, stage: x.warehouseName })) };
  }
}
