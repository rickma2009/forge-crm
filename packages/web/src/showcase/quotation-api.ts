import type { QuotationCreate, ProductPrice, PricingWrite, QuotationCommand, QuotationDraft, QuotationRecord, Product } from '@interaction-pattern-lab/contracts';
import { call, write } from './gateway';
const root = (code: string) => `/api/systems/${encodeURIComponent(code)}`;
export const quotationApi = {
  async prices(code: string, id: string, priceId?: string, businessDate?: string): Promise<{ product: Product; current: ProductPrice | null; history: ProductPrice[] }> { const query = new URLSearchParams(); if (priceId) query.set('priceId', priceId); if (businessDate) query.set('businessDate', businessDate); return (await call(`${root(code)}/pricing/${encodeURIComponent(id)}${query.size ? `?${query}` : ''}`)).json(); },
  async priceSave(code: string, id: string, body: PricingWrite): Promise<ProductPrice> { return (await write(`${root(code)}/pricing/${encodeURIComponent(id)}`, body)).json(); },
  async list(code: string, query: URLSearchParams): Promise<{ items: QuotationRecord[]; pagination: { total: number; totalPages: number } }> { return (await call(`${root(code)}/quotations?${query}`)).json(); },
  async detail(code: string, id: string): Promise<QuotationRecord> { return (await call(`${root(code)}/quotations/${encodeURIComponent(id)}`)).json(); },
  async pdf(code: string, id: string): Promise<Blob> { return (await call(`${root(code)}/quotations/${encodeURIComponent(id)}/pdf`)).blob(); },
  async create(code: string, input: QuotationCreate): Promise<QuotationRecord> { return (await write(`${root(code)}/quotations`, input)).json(); },
  async save(code: string, id: string | null, input: QuotationDraft): Promise<QuotationRecord> { return (await write(`${root(code)}/quotations${id ? '/' + encodeURIComponent(id) : ''}`, input, id ? 'PATCH' : 'POST')).json(); },
  async command(code: string, id: string, action: string, input: QuotationCommand): Promise<QuotationRecord> { return (await write(`${root(code)}/quotations/${encodeURIComponent(id)}/${action}`, input)).json(); },
};
