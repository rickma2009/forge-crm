import { describe, expect, it } from 'vitest';
import { attachmentMetaSchema, attachmentUpdateSchema, pricingWriteSchema } from './index';

describe('product workspace contracts', () => {
  it('accepts a date-effective standard price', () => {
    expect(pricingWriteSchema.parse({ version: 0, pricingType: 'STANDARD', currencyCode: 'CNY', unitPrice: '12.50', effectiveDate: '2026-09-23', expiresDate: null, remark: '', tiers: [] }).pricingType).toBe('STANDARD');
  });

  it('rejects mixed standard and tier pricing', () => {
    expect(pricingWriteSchema.safeParse({ version: 0, pricingType: 'STANDARD', currencyCode: 'CNY', unitPrice: '12.50', effectiveDate: '2026-09-23', expiresDate: null, remark: '', tiers: [{ from: '0', to: null, price: '10' }] }).success).toBe(false);
  });

  it('parses attachment metadata and restricts editable fields', () => {
    const row = attachmentMetaSchema.parse({ id: crypto.randomUUID(), ownerType: 'PRODUCT', ownerId: crypto.randomUUID(), originalName: '规格.pdf', attachmentType: 'PDF', mimeType: 'application/pdf', fileSize: 100, description: null, fileVersion: null, status: 'ACTIVE', version: 1, createdBy: crypto.randomUUID(), updatedBy: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    expect(row.originalName).toBe('规格.pdf');
    expect(attachmentUpdateSchema.safeParse({ version: 1, description: '新版', fileVersion: 'V2', storageKey: '../escape' }).success).toBe(false);
  });
});
