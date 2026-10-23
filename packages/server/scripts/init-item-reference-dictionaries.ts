import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { systemCodeSchema } from '@forge-crm/contracts';
import { DatabaseService } from '../src/database/database.service';
import { initializeItemReferenceDictionaries } from '../src/dictionary/item-reference-dictionaries.seed';
config({ path: resolve(__dirname, '../../../.env'), quiet: true });
async function main() {
  if (!process.env.DATABASE_URL || !process.env.SYSTEM_CODES) throw new Error('DATABASE_URL and SYSTEM_CODES are required');
  const db = new DatabaseService(process.env.DATABASE_URL);
  try {
    for (const rawCode of process.env.SYSTEM_CODES.split(',')) {
      const systemCode = systemCodeSchema.parse(rawCode.trim());
      const result = await db.$transaction(async (tx) => {
        const apps = await tx.sysApplication.findMany({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
        if (apps.length !== 1) throw new Error(`System scope missing or ambiguous: ${systemCode}`);
        const before = await tx.sysDictionary.findMany({ where: { systemCode, dictCode: { in: ['item_source', 'item_lifecycle'] } }, include: { items: true } });
        const initialized = await initializeItemReferenceDictionaries(tx, systemCode);
        if (initialized.changes) {
          const after = await tx.sysDictionary.findMany({ where: { systemCode, dictCode: { in: ['item_source', 'item_lifecycle'] } }, include: { items: true } });
          await tx.sysAuditLog.create({ data: { tenantId: apps[0].tenantId, applicationId: apps[0].id, actorUserId: null, actionCode: 'item-reference-dictionary.initialize', requestId: randomUUID(), resourceType: 'dictionary', resourceId: systemCode, beforeSnapshot: JSON.parse(JSON.stringify(before)), afterSnapshot: JSON.parse(JSON.stringify(after)) } });
        }
        return initialized;
      });
      console.log(JSON.stringify(result));
    }
  } finally { await db.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Initialization failed'); process.exitCode = 1; });
