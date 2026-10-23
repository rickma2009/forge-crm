import assert from 'node:assert/strict';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { businessListDefaultConfig, opportunityBusinessStatusLabels } from '@forge-crm/contracts';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
config({ path: resolve(__dirname, '../../..', '.env'), quiet: true });
const marker = 'test-opportunities-20260929';
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal', status: 'ACTIVE' } });
    const codes = Array.from({ length: 100 }, (_, i) => `TEST-O-20260929-${String(i + 1).padStart(3, '0')}`);
    const result = await db.$transaction(async tx => {
      const rows = await tx.sdOpp.findMany({ where: { applicationId: app.id, createdBy: marker, opportunityCode: { in: codes } }, orderBy: { opportunityCode: 'asc' } });
      assert.equal(rows.length, 100, 'ONLY_ORIGINAL_TEST_BATCH_ALLOWED');
      const states: Record<string, number> = {}, months: Record<string, number> = {};
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
      for (const [i, row] of rows.entries()) {
        const businessStatus = i >= 80 ? 'SIGNED' : i < 15 ? 'INITIAL' : i >= 75 ? 'LOST' : i >= 70 ? 'VOID' : 'FOLLOWING';
        const expectedSignDate = businessStatus === 'SIGNED' ? row.expectedSignDate : new Date(Date.UTC(2026, 9 + i % 7, 5 + i % 23));
        assert(expectedSignDate && (businessStatus === 'SIGNED' ? expectedSignDate.toISOString().slice(0, 10) < today : expectedSignDate.toISOString().slice(0, 10) > today), 'REQUESTED_TEST_DATE_RANGE');
        const signedDate = businessStatus === 'SIGNED' ? expectedSignDate : null;
        const lostDate = businessStatus === 'LOST' ? new Date(Date.now() - (7 + i % 23) * 86400000) : null;
        const remark = `测试数据：虚构商机，用于漏斗、金额预测和保有量分析。场景状态：${opportunityBusinessStatusLabels[businessStatus]}。商机状态与销售阶段独立维护；金额等于产品明细合计。${businessStatus === 'LOST' ? '测试丢单原因：客户选择其他方案。' : businessStatus === 'VOID' ? '测试作废原因：项目重复立项或采购取消。' : ''}`;
        await tx.sdOpp.update({ where: { id: row.id }, data: { businessStatus, expectedSignDate, signedDate, lostDate, remark, ...(businessStatus === 'VOID' || businessStatus === 'LOST' ? { confidence: 0 } : {}), version: { increment: 1 }, updatedBy: marker } });
        if (businessStatus === 'VOID' || businessStatus === 'LOST') {
          const follow = await tx.sdOppFollowUp.findFirst({ where: { opportunityId: row.id, createdBy: marker }, orderBy: { followedAt: 'desc' } });
          if (follow) await tx.sdOppFollowUp.update({ where: { id: follow.id }, data: { workItem: businessStatus === 'LOST' ? '确认商机丢单及原因' : '确认项目作废', resultNext: businessStatus === 'LOST' ? '测试记录：客户选择其他方案，商机已丢单，退出在手商机预测。' : '测试记录：项目重复立项或采购取消，商机已作废，退出在手商机预测。', followedAt: lostDate ?? new Date(Date.now() - 10 * 86400000), updatedBy: marker } });
        }
        states[businessStatus] = (states[businessStatus] ?? 0) + 1;
        if (businessStatus !== 'SIGNED') { const month = expectedSignDate.toISOString().slice(0, 7); months[month] = (months[month] ?? 0) + 1; }
      }
      // Upgrade only system default opportunity views; preserve personal layouts and all other objects.
      const views = await tx.uiSystemListView.findMany({ where: { systemCode: 'demo-portal', pageCode: 'opportunity-directory', isDefault: true } });
      const additions = businessListDefaultConfig('opportunity-directory').columns.filter(c => ['businessStatus', 'expectedSignDate', 'signedDate', 'lostDate'].includes(c.key));
      for (const view of views) {
        const config = view.config as { columns: { key: string; visible: boolean }[] };
        const columns = [...config.columns];
        for (const column of additions) {
          const existing = columns.find(c => c.key === column.key);
          if (existing) { if (['businessStatus', 'expectedSignDate'].includes(column.key)) existing.visible = true; }
          else columns.splice(3 + additions.indexOf(column), 0, column);
        }
        await tx.uiSystemListView.update({ where: { id: view.id }, data: { config: { ...config, columns } as unknown as Prisma.InputJsonValue, version: { increment: 1 }, updatedBy: 'opportunity-lifecycle' } });
      }
      return { updated: rows.length, states, unsignedMonths: months, updatedDefaultViews: views.length };
    }, { timeout: 60000 });
    console.log(JSON.stringify(result));
  } finally { await db.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'TEST_UPDATE_FAILED'); process.exitCode = 1; });
