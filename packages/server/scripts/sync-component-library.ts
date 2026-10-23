/** Local repeat-registration only. Default preview performs no catalog writes. */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { assertComponentSyncPreserved, parseComponentSyncArgs, planComponentSync } from '../src/style-scene/component-library-maintenance';

async function main() {
  const { systemCode, apply } = parseComponentSyncArgs(process.argv.slice(2));
  const root = resolve(__dirname, '../../..');
  config({ path: resolve(root, '.env'), quiet: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('LOCAL_DATABASE_REQUIRED');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    await db.$transaction(async tx => {
      if (!await tx.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' } })) throw new Error('EXISTING_ACTIVE_SYSTEM_REQUIRED');
      const before = await tx.styleScene.findMany();
      const plan = planComponentSync(root, before, systemCode);
      console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', systemCode, changes: plan.map(({ code, fields }) => ({ code, fields })) }));
      if (!apply || plan.length === 0) return;
      for (const entry of plan) await tx.styleScene.update({ where: { systemCode_assetCode: { systemCode, assetCode: entry.code } }, data: { ...entry.data, updatedBy: 'component-library-maintenance' } });
      assertComponentSyncPreserved(before, await tx.styleScene.findMany(), plan);
    }, { isolationLevel: 'Serializable', timeout: 15000 });
    console.log(apply ? 'PASS requested changes committed; protected fields and other records preserved' : 'PREVIEW ONLY: no catalog writes');
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
