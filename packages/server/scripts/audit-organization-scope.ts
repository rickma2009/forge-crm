import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DatabaseService } from '../src/database/database.service';
config({ path: resolve(process.cwd().endsWith('/packages/server') ? resolve(process.cwd(), '../..') : process.cwd(), '.env'), quiet: true });
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('LOCAL_DATABASE_REQUIRED');
  const db = new DatabaseService(url.toString());
  try {
    const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' }, select: { tenantId: true } });
    const affected = await db.orgUnit.count({ where: { tenantId: { not: app.tenantId }, unitCode: { in: ['component-bg', 'tv-division', 'tv-sales-one', 'tv-sales-two', 'tv-sales-admin', 'tv-rd-center', 'finance-dept', 'supply-chain-dept'] }, OR: [{ isSalesOrg: true }, { isRdOrg: true }, { isPlatformOrg: true }] } });
    const leakedIntegrationEmployees = await db.orgEmployee.count({ where: { tenantId: app.tenantId, employeeName: '集成员工' } });
    console.log({ nonDemoTenantsWithBackfilledFlags: affected, leakedIntegrationEmployees });
  } finally { await db.$disconnect(); }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : '审计失败'); process.exitCode = 1; });
