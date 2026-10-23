import { Prisma } from '../generated/prisma/client';
import { D, roundMoney } from '../sales/sales-domain';
type Input = {
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
};
/** Same inclusive-price rules as sales, keeping allocation in Decimal even at large values. */
export function pricePurchase(lines: Input[], headerDiscount: string) {
    const calculated = lines.map(l => ({ amount: roundMoney(D(l.quantity).mul(l.unitPrice)), discountedAmount: roundMoney(D(l.quantity).mul(l.unitPrice).mul(l.discount)), taxRate: D(l.taxRate) }));
    const amount = calculated.reduce((a, l) => a.plus(l.amount), D(0));
    const before = calculated.reduce((a, l) => a.plus(l.discountedAmount), D(0));
    const netAmount = roundMoney(before.mul(headerDiscount));
    if (amount.gt('9999999999999999.99') || netAmount.gt('9999999999999999.99'))
        throw new Error('采购金额超过允许范围');
    const shares = calculated.map(l => before.isZero() ? D(0) : netAmount.mul(l.discountedAmount).div(before).mul(100));
    const cents = shares.map(s => s.floor());
    const remainder = netAmount.mul(100).minus(cents.reduce((a, c) => a.plus(c), D(0))).toNumber();
    const priority = shares.map((s, i) => ({ i, fraction: s.minus(cents[i]) })).sort((a, b) => b.fraction.comparedTo(a.fraction) || a.i - b.i);
    for (let i = 0; i < remainder; i++)
        cents[priority[i].i] = cents[priority[i].i].plus(1);
    const priced = calculated.map((l, i) => { const finalAmount = cents[i].div(100), taxAmount = roundMoney(finalAmount.minus(finalAmount.div(D(1).plus(l.taxRate)))); return { ...l, finalAmount, taxAmount }; });
    return { amount, netAmount, taxAmount: priced.reduce((a, l) => a.plus(l.taxAmount), D(0)), lines: priced };
}
export function allocateReceipt(total: Prisma.Decimal, ordered: Prisma.Decimal, received: Prisma.Decimal, allocated: Prisma.Decimal, quantity: Prisma.Decimal) { const remaining = total.minus(allocated); const share = received.plus(quantity).eq(ordered) ? remaining : roundMoney(total.mul(quantity).div(ordered)); return Prisma.Decimal.max(0, Prisma.Decimal.min(remaining, share)); }
