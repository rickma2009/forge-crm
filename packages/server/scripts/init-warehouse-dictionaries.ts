import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import { DatabaseService } from '../src/database/database.service';
import { initializeWarehouseDictionaries } from '../src/dictionary/warehouse-dictionaries.seed';
config({ path: resolve(__dirname, '../../../.env'), quiet: true });
async function main() {
  if (!process.env.DATABASE_URL || !process.env.SYSTEM_CODES) throw new Error('DATABASE_URL and SYSTEM_CODES are required');
  const db = new DatabaseService(process.env.DATABASE_URL);
  try {
    for (const code of process.env.SYSTEM_CODES.split(',')) {
      const systemCode = systemCodeSchema.parse(code.trim());
      const result = await db.$transaction(async (tx) => {
        const apps = await tx.sysApplication.findMany({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
        if (apps.length !== 1) throw new Error(`System scope missing or ambiguous: ${systemCode}`);
        const before = await tx.sysDictionary.findMany({ where: { systemCode, dictCode: { in: ['warehouse_type', 'warehouse_nature'] } }, include: { items: true } });
        const result = await initializeWarehouseDictionaries(tx, systemCode);
        if (result.changes) {
          const after = await tx.sysDictionary.findMany({ where: { systemCode, dictCode: { in: ['warehouse_type', 'warehouse_nature'] } }, include: { items: true } });
          await tx.sysAuditLog.create({ data: { tenantId: apps[0].tenantId, applicationId: apps[0].id, actorUserId: null, actionCode: 'warehouse-dictionary.initialize', requestId: randomUUID(), resourceType: 'dictionary', resourceId: systemCode, beforeSnapshot: JSON.parse(JSON.stringify(before)), afterSnapshot: JSON.parse(JSON.stringify(after)) } });
        }
        return result;
      });
      console.log(JSON.stringify(result));
    }
  } finally { await db.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Initialization failed'); process.exitCode = 1; });
