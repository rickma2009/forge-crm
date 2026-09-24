import { z } from 'zod';

/** Decimal strings retain precision across JSON, database and browser boundaries. */
export function decimalUnits(value: string, scale: number): bigint {
  if (!new RegExp(`^\\d{1,16}(?:\\.\\d{1,${scale}})?$`).test(value)) throw new Error('请输入合法的非负十进制数，且不要超过允许精度');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0'));
}
function fixed(value: bigint, scale: number): string {
  const divisor = 10n ** BigInt(scale);
  return `${value / divisor}.${String(value % divisor).padStart(scale, '0')}`;
}
const MAX_MONEY = 999999999999999999n;
function money(value: bigint): string { if (value > MAX_MONEY) throw new Error('金额超出允许范围'); return fixed(value, 2); }
export function quotationLineAmount(quantity: string, unitPrice: string, discount: string): string {
  const q = decimalUnits(quantity, 4), p = decimalUnits(unitPrice, 2), d = decimalUnits(discount, 2);
  if (q <= 0n || q >= 10n ** 18n) throw new Error('数量必须大于零且不超过十四位整数');
  if (d > 10000n) throw new Error('折扣必须在 0% 至 100% 之间');
  if (p > MAX_MONEY) throw new Error('单价超出允许范围');
  return money((q * p * (10000n - d) + 50000000n) / 100000000n);
}
export function quotationTotal(amounts: string[]): string { return money(amounts.reduce((sum, value) => sum + decimalUnits(value, 2), 0n)); }
export type PriceTier = { from: string; to: string | null; price: string };
export function validateTiers(tiers: PriceTier[]): void {
  let bound = 0n;
  tiers.forEach((tier, i) => {
    const from = decimalUnits(tier.from, 4), to = tier.to === null ? null : decimalUnits(tier.to, 4);
    if (from !== bound || (to !== null && to <= from) || (i === tiers.length - 1) !== (to === null)) throw new Error('阶梯必须从 0 开始连续无重叠，末段无上限');
    money(decimalUnits(tier.price, 2)); bound = to ?? bound;
  });
}
export function suggestedPrice(standard: string, tiers: PriceTier[], quantity: string): { price: string; source: 'STANDARD' | 'TIER'; from: string | null; to: string | null } {
  const q = decimalUnits(quantity, 4);
  if (q <= 0n || q >= 10n ** 18n) throw new Error('数量超出允许范围');
  validateTiers(tiers);
  const tier = tiers.find((t) => q >= decimalUnits(t.from, 4) && (t.to === null || q < decimalUnits(t.to, 4)));
  return tier ? { price: money(decimalUnits(tier.price, 2)), source: 'TIER', from: tier.from, to: tier.to } : { price: money(decimalUnits(standard, 2)), source: 'STANDARD', from: null, to: null };
}
export function quotationExpired(validUntil: string, now = new Date()): boolean {
  const cutoff = Date.parse(`${validUntil}T00:00:00+08:00`) + 86400000;
  if (!Number.isFinite(cutoff)) throw new Error('有效截止日期无效');
  return now.getTime() >= cutoff;
}
const decimal = (scale: number, integer: number) => z.string().regex(new RegExp(`^\\d{1,${integer}}(?:\\.\\d{1,${scale}})?$`), '请输入规定精度的非负数');
export const priceSchema = decimal(2, 16);
export const quantitySchema = decimal(4, 14).refine((v) => decimalUnits(v, 4) > 0n, '数量必须大于零');
export const tierSchema = z.strictObject({ from: decimal(4, 14), to: decimal(4, 14).nullable(), price: priceSchema });
export const pricingWriteSchema = z.strictObject({
  version: z.number().int().nonnegative(), pricingType: z.enum(['STANDARD', 'TIERED']), currencyCode: z.literal('CNY'),
  unitPrice: priceSchema.nullable(), effectiveDate: z.string().date(), expiresDate: z.string().date().nullable(),
  remark: z.string().trim().max(1000).nullable().default(null), tiers: z.array(tierSchema).max(100),
}).superRefine((v, ctx) => {
  if (v.expiresDate && v.expiresDate < v.effectiveDate) ctx.addIssue({ code: 'custom', path: ['expiresDate'], message: '失效日期不能早于生效日期' });
  if (v.pricingType === 'STANDARD' && (v.unitPrice === null || v.tiers.length)) ctx.addIssue({ code: 'custom', path: ['pricingType'], message: '标准定价必须填写单价且不能配置阶梯' });
  if (v.pricingType === 'TIERED' && (v.unitPrice !== null || !v.tiers.length)) ctx.addIssue({ code: 'custom', path: ['pricingType'], message: '阶梯定价不能填写头部单价且必须配置阶梯' });
  if (v.pricingType === 'TIERED') { try { validateTiers(v.tiers); } catch (e) { ctx.addIssue({ code: 'custom', path: ['tiers'], message: (e as Error).message }); } }
});
export const quotationLineWriteSchema = z.strictObject({
  id: z.string().uuid(), productId: z.string().uuid(), priceId: z.string().uuid(), quantity: quantitySchema,
  unitPrice: priceSchema, discount: decimal(2, 3).refine((v) => decimalUnits(v, 2) <= 10000n, '折扣不能超过100%'),
  delivery: z.string().trim().max(200).default(''), remark: z.string().trim().max(2000).default(''),
});
export const quotationDraftSchema = z.strictObject({
  title: z.string().trim().min(1).max(200), customerId: z.string().uuid(), contactId: z.string().uuid().nullable(),
  opportunityId: z.string().uuid().nullable(), quoteDate: z.string().date(), validUntil: z.string().date(),
  terms: z.string().max(8000).default(''), remark: z.string().max(2000).default(''), lines: z.array(quotationLineWriteSchema).max(200),
  version: z.number().int().nonnegative(), requestKey: z.string().uuid(),
}).superRefine((v, ctx) => {
  if (v.validUntil < v.quoteDate) ctx.addIssue({ code: 'custom', path: ['validUntil'], message: '有效期不能早于报价日期' });
  if (new Set(v.lines.map((l) => l.id)).size !== v.lines.length) ctx.addIssue({ code: 'custom', path: ['lines'], message: '明细行身份重复' });
});
export const quotationCreateSchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('OPPORTUNITY'), opportunityId: z.string().uuid(), opportunityVersion: z.number().int().positive(), requestKey: z.string().uuid() }),
  z.strictObject({ mode: z.literal('INDEPENDENT'), customerId: z.string().uuid(), requestKey: z.string().uuid() }),
]);
export type QuotationCreate = z.infer<typeof quotationCreateSchema>;
export const quotationCommandSchema = z.strictObject({ version: z.number().int().positive(), requestKey: z.string().uuid(), note: z.string().trim().max(2000).default(''), keepPrices: z.boolean().default(false), opportunityVersion: z.number().int().positive().optional() });
export type PricingWrite = z.infer<typeof pricingWriteSchema>;
export type QuotationDraft = z.infer<typeof quotationDraftSchema>;
export type QuotationCommand = z.infer<typeof quotationCommandSchema>;
export interface ProductPrice { id: string; productId: string; version: number; pricingType?: 'STANDARD' | 'TIERED'; currencyCode?: 'CNY'; unitPrice?: string | null; standardPrice: string; effectiveDate?: string; expiresDate?: string | null; isEffective?: boolean; remark?: string | null; tiers: PriceTier[]; createdAt: string; updatedAt?: string }
export interface QuotationLine extends z.infer<typeof quotationLineWriteSchema> { productCode: string; productName: string; model: string | null; unit: string; suggestedPrice: string; priceSource: string; lowerQty: string | null; upperQty: string | null; amount: string }
export interface QuotationRecord extends Omit<QuotationDraft, 'lines' | 'requestKey'> {
  id: string; quoteCode: string; customerName: string; contactName: string | null; ownerUserId: string;
  createdAt?: string; updatedAt?: string; createdBy?: string; creatorName?: string; ownerName?: string;
  status: string; total: string; sourceQuoteId: string | null; lines: QuotationLine[];
  events?: Array<{ id: string; action: string; note: string; createdAt: string }>;
  opportunity?: { id: string; opportunityName?: string; version: number; expectedAmount: string | null; amountSource: string } | null;
}
