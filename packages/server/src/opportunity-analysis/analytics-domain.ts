import { Prisma } from '../generated/prisma/client';
import type { OpportunityAnalytics } from '@forge-crm/contracts';
export function sixMonths(date: string) {
  const start = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  return Array.from({ length: 6 }, (_, i) => { const d = new Date(start); d.setUTCMonth(d.getUTCMonth() + i); return d.toISOString().slice(0, 7); });
}
export function organizationDescendants(rows: { id: string; parentId: string | null }[], root: string): string[] {
  const selected = new Set([root]);
  let changed = true;
  while (changed) { changed = false; for (const row of rows) if (row.parentId && selected.has(row.parentId) && !selected.has(row.id)) { selected.add(row.id); changed = true; } }
  return [...selected];
}
export type AnalyticsStage = { id: string; name: string; templateId: string; templateName: string; probability: number };
export type AnalyticsBucket = { stageId: string; date: Date; count: number; amount: Prisma.Decimal | null; missingAmount: number };
export function summarizeAnalytics(stages: AnalyticsStage[], buckets: AnalyticsBucket[], months: string[]) {
  const rows = stages.map(stage => ({ ...stage, count: 0, amount: new Prisma.Decimal(0), monthlyAmounts: months.map(() => new Prisma.Decimal(0)), missingAmount: 0 }));
  const byStage = new Map(rows.map(row => [row.id, row]));
  for (const bucket of buckets) {
    const row = byStage.get(bucket.stageId);
    if (!row) throw new Error('ANALYTICS_STAGE_MISSING');
    const amount = bucket.amount ?? new Prisma.Decimal(0);
    row.count += bucket.count; row.amount = row.amount.plus(amount); row.missingAmount += bucket.missingAmount;
    const index = months.indexOf(bucket.date.toISOString().slice(0, 7));
    if (index >= 0) row.monthlyAmounts[index] = row.monthlyAmounts[index].plus(amount);
  }
  const sums = months.map((_, i) => rows.reduce((sum, row) => sum.plus(row.monthlyAmounts[i]), new Prisma.Decimal(0)));
  const weighted = months.map((_, i) => rows.reduce((sum, row) => sum.plus(row.monthlyAmounts[i].mul(row.probability).div(100)), new Prisma.Decimal(0)));
  const totals: OpportunityAnalytics['totals'] = { count: rows.reduce((n, row) => n + row.count, 0), amount: rows.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0)).toFixed(2), monthlyAmounts: sums.map(n => n.toFixed(2)), weightedAmounts: weighted.map(n => n.toFixed(2)), missingAmount: rows.reduce((n, row) => n + row.missingAmount, 0) };
  return { stages: rows.map(row => ({ ...row, amount: row.amount.toFixed(2), monthlyAmounts: row.monthlyAmounts.map(n => n.toFixed(2)) })), totals };
}
