import { Prisma } from '../generated/prisma/client';

export const D = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value);
export const roundMoney = (value: Prisma.Decimal) => value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
export const roundQuantity = (value: Prisma.Decimal) => value.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

export function documentNo(prefix: 'SO' | 'XSCK', date: string, sequence: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(sequence) || sequence < 1 || sequence > 99999) throw new Error('单据日期或流水无效');
  return `${prefix}${date.replaceAll('-', '')}${String(sequence).padStart(5, '0')}`;
}

type PricingInput = { quantity: string; unitPrice: string; discount: string; taxRate: string };
export function priceOrder(lines: PricingInput[], headerDiscount: string) {
  const factor = D(headerDiscount);
  if (factor.lessThan(0) || factor.greaterThan(1)) throw new Error('整单折扣必须在0到1之间');
  const calculated = lines.map((line) => {
    const quantity = D(line.quantity), unitPrice = D(line.unitPrice), discount = D(line.discount), taxRate = D(line.taxRate);
    if (quantity.lessThanOrEqualTo(0) || unitPrice.lessThan(0) || discount.lessThan(0) || discount.greaterThan(1) || taxRate.lessThan(0) || taxRate.greaterThan(1)) throw new Error('订单行数量、价格、折扣或税率无效');
    return { amount: roundMoney(quantity.mul(unitPrice)), discountedAmount: roundMoney(quantity.mul(unitPrice).mul(discount)), quantity, unitPrice, discount, taxRate };
  });
  const amount = calculated.reduce((sum, line) => sum.plus(line.amount), D(0));
  const beforeHeader = calculated.reduce((sum, line) => sum.plus(line.discountedAmount), D(0));
  const netAmount = roundMoney(beforeHeader.mul(factor));
  const targetCents = netAmount.mul(100).toNumber();
  const exactShares = calculated.map((line) => beforeHeader.isZero() ? D(0) : netAmount.mul(line.discountedAmount).div(beforeHeader).mul(100));
  const floors = exactShares.map((share) => Math.floor(share.toNumber()));
  const remainder = targetCents - floors.reduce((sum, cents) => sum + cents, 0);
  const priority = exactShares.map((share, index) => ({ index, fraction: share.minus(floors[index]).toNumber() })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index++) floors[priority[index].index]++;
  const pricedLines = calculated.map((line, index) => {
    const finalAmount = D(floors[index]).div(100);
    const taxAmount = line.taxRate.isZero() ? D(0) : roundMoney(finalAmount.minus(finalAmount.div(D(1).plus(line.taxRate))));
    return { ...line, finalAmount, taxAmount };
  });
  return { amount, netAmount, taxAmount: pricedLines.reduce((sum, line) => sum.plus(line.taxAmount), D(0)), lines: pricedLines };
}

export function shipmentAmount(finalAmount: Prisma.Decimal, orderQuantity: Prisma.Decimal, alreadyQuantity: Prisma.Decimal, alreadyAmount: Prisma.Decimal, shippingQuantity: Prisma.Decimal) {
  if (shippingQuantity.lessThanOrEqualTo(0) || alreadyQuantity.plus(shippingQuantity).greaterThan(orderQuantity)) throw new Error('出库数量超出订单剩余量');
  return alreadyQuantity.plus(shippingQuantity).equals(orderQuantity)
    ? finalAmount.minus(alreadyAmount)
    : roundMoney(finalAmount.mul(shippingQuantity).div(orderQuantity));
}

export function movingAverageIssue(balanceQuantity: Prisma.Decimal, balanceAmount: Prisma.Decimal, issueQuantity: Prisma.Decimal) {
  if (balanceQuantity.lessThanOrEqualTo(0) || issueQuantity.lessThanOrEqualTo(0) || issueQuantity.greaterThan(balanceQuantity) || balanceAmount.lessThan(0)) throw new Error('库存不足或余额金额异常');
  const cost = issueQuantity.equals(balanceQuantity) ? balanceAmount : roundMoney(balanceAmount.mul(issueQuantity).div(balanceQuantity));
  return { cost, remainingQuantity: balanceQuantity.minus(issueQuantity), remainingAmount: balanceAmount.minus(cost) };
}
