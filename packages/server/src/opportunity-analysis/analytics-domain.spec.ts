import { Prisma } from '../generated/prisma/client';
import { organizationDescendants, sixMonths, summarizeAnalytics } from './analytics-domain';
import { opportunityAnalyticsQuerySchema } from '@forge-crm/contracts';
describe('opportunity analytics calculations', () => {
  it('builds exactly six calendar months across year and leap-year boundaries', () => {
    expect(sixMonths('2026-11-20')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04']);
    expect(sixMonths('2028-02-29')[0]).toBe('2028-02');
  });
  it('rejects invalid calendar dates and reversed query ranges', () => {
    expect(opportunityAnalyticsQuerySchema.safeParse({ dateFrom: '2026-02-30' }).success).toBe(false);
    expect(opportunityAnalyticsQuerySchema.safeParse({ dateFrom: '2026-10-02', dateTo: '2026-10-01' }).success).toBe(false);
  });
  it('includes descendants only, tolerating malformed cycles without looping', () => {
    expect(organizationDescendants([{ id: 'root', parentId: null }, { id: 'child', parentId: 'root' }, { id: 'leaf', parentId: 'child' }, { id: 'outside', parentId: null }], 'root')).toEqual(['root', 'child', 'leaf']);
    expect(organizationDescendants([{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }], 'a')).toEqual(['a', 'b']);
  });
  it('computes Decimal monthly and weighted totals from stage win rate without early rounding', () => {
    const months = sixMonths('2026-10-01');
    const result = summarizeAnalytics([{ id: 's1', name: '线索', templateId: 't1', templateName: '公共', probability: 10 }, { id: 's2', name: '谈判', templateId: 't1', templateName: '公共', probability: 80 }], [
      { stageId: 's1', date: new Date('2026-10-15'), count: 2, amount: new Prisma.Decimal('200000.01'), missingAmount: 0 },
      { stageId: 's2', date: new Date('2026-10-31'), count: 1, amount: new Prisma.Decimal('100000.03'), missingAmount: 0 },
      { stageId: 's2', date: new Date('2027-03-31'), count: 1, amount: null, missingAmount: 1 },
      { stageId: 's1', date: new Date('2027-04-01'), count: 1, amount: new Prisma.Decimal('9999'), missingAmount: 0 },
    ], months);
    expect(result.totals.count).toBe(5); expect(result.totals.amount).toBe('309999.04');
    expect(result.totals.monthlyAmounts).toEqual(['300000.04', '0.00', '0.00', '0.00', '0.00', '0.00']);
    expect(result.totals.weightedAmounts[0]).toBe('100000.03'); expect(result.totals.missingAmount).toBe(1);
    expect(result.stages[0].monthlyAmounts[0]).toBe('200000.01');
  });
  it('retains empty stages and refuses to lose unmapped stage amounts', () => {
    expect(summarizeAnalytics([{ id: 's1', name: '初始', templateId: 't1', templateName: '公共', probability: 10 }], [], sixMonths('2026-10-01')).stages[0].count).toBe(0);
    expect(() => summarizeAnalytics([], [{ stageId: 'missing', date: new Date('2026-10-01'), count: 1, amount: new Prisma.Decimal(1), missingAmount: 0 }], sixMonths('2026-10-01'))).toThrow('ANALYTICS_STAGE_MISSING');
  });
});
