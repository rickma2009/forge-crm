/** Idempotent BOM interaction examples. Does not touch inventory or costing. */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { BomService } from '../src/bom/bom.service';
import type { DatabaseService } from '../src/database/database.service';

loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } });
  const admin = await db.iamUser.findFirstOrThrow({ where: { tenantId: app.tenantId, normalizedAccount: 'admin' } });
  const actor = 'demo:bom';
  async function item(code: string, name: string, type: 'MATERIAL' | 'SEMI_FINISHED' | 'PRODUCT') {
    return db.mdItem.upsert({ where: { tenantId_itemCode: { tenantId: app.tenantId, itemCode: code } }, update: {}, create: { tenantId: app.tenantId, itemCode: code, itemName: name, itemType: type, baseUnit: '件', status: 'ACTIVE', createdBy: actor, updatedBy: actor } });
  }
  const board = await item('BOM-DEMO-BOARD', '演示·智能控制板卡', 'SEMI_FINISHED');
  const panel = await item('BOM-DEMO-PANEL', '演示·液晶显示模组', 'MATERIAL');
  const chip = await item('BOM-DEMO-CHIP', '演示·主控芯片', 'MATERIAL');
  const chipAlt = await item('BOM-DEMO-CHIP-ALT', '演示·主控芯片替代型号', 'MATERIAL');
  const shell = await item('BOM-DEMO-SHELL', '演示·大屏外壳', 'MATERIAL');
  const screen = await item('BOM-DEMO-SCREEN', '演示·会议交互大屏', 'PRODUCT');
  const service = new BomService(db as unknown as DatabaseService);
  const publishedBoard = await db.scmBom.findFirst({ where: { applicationId: app.id, itemId: board.id, status: 'PUBLISHED' }, orderBy: { revision: 'desc' } });
  let boardBomId = publishedBoard?.id;
  if (!boardBomId) {
    const draft = await service.create('demo-portal', admin.id, actor, { itemId: board.id, baseQuantity: '1' });
    const saved = await service.save('demo-portal', admin.id, actor, draft.id, { rowVersion: draft.rowVersion, baseQuantity: '1', lines: [
      { lineCode: 'L010', itemId: chip.id, quantity: '2', sortNo: 10, childBomId: null, alternatives: [{ itemId: chipAlt.id, priority: 1, ratio: '1' }] },
    ] });
    boardBomId = (await service.publish('demo-portal', admin.id, actor, saved.id, { rowVersion: saved.rowVersion })).id;
  }
  const publishedScreen = await db.scmBom.findFirst({ where: { applicationId: app.id, itemId: screen.id, status: 'PUBLISHED' } });
  if (!publishedScreen) {
    const draft = await service.create('demo-portal', admin.id, actor, { itemId: screen.id, baseQuantity: '1' });
    const saved = await service.save('demo-portal', admin.id, actor, draft.id, { rowVersion: draft.rowVersion, baseQuantity: '1', lines: [
      { lineCode: 'L010', itemId: board.id, quantity: '2', sortNo: 10, childBomId: boardBomId, alternatives: [] },
      { lineCode: 'L020', itemId: panel.id, quantity: '1', sortNo: 20, childBomId: null, alternatives: [] },
      { lineCode: 'L030', itemId: shell.id, quantity: '1', sortNo: 30, childBomId: null, alternatives: [] },
    ] });
    await service.publish('demo-portal', admin.id, actor, saved.id, { rowVersion: saved.rowVersion });
  }
  const currentScreen = await db.scmBom.findFirstOrThrow({ where: { applicationId: app.id, itemId: screen.id, status: 'PUBLISHED' }, orderBy: { revision: 'desc' } });
  if (!await db.scmBom.findFirst({ where: { applicationId: app.id, itemId: screen.id, status: 'DRAFT' } })) {
    await service.draft('demo-portal', admin.id, actor, currentScreen.id);
  }
  const result = await service.list('demo-portal', { page: 1, pageSize: 20, keyword: 'BOM-DEMO' });
  console.log(`BOM demo ready: ${result.pagination.total} versions`);
}
main().finally(async () => db.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
