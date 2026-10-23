/** Read-only checks for the large-screen demo BOMs. */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { BomService } from '../src/bom/bom.service';
import type { DatabaseService } from '../src/database/database.service';

loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const expectedScreens = ['004', '006', '014', '016', '024', '034', '054', '064'].map((number) => `TEST-P-SCREEN-${number}`);
const expectedAssemblies = ['DEMO-A-CTRL', 'DEMO-A-LCD-65', 'DEMO-A-LCD-86', 'DEMO-A-TOUCH-65', 'DEMO-A-TOUCH-86', 'DEMO-A-LED-CAB'];
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } });
  const parts = await db.mdItem.findMany({ where: { tenantId: app.tenantId, itemCode: { startsWith: 'DEMO-E-' } } });
  const structural = await db.mdItem.findMany({ where: { tenantId: app.tenantId, itemCode: { startsWith: 'DEMO-S-' } } });
  const assemblies = await db.mdItem.findMany({ where: { tenantId: app.tenantId, itemCode: { in: expectedAssemblies } } });
  assert(parts.length === 21 && structural.length === 12, 'Expected 21 electronic and 12 structural materials');
  assert(assemblies.length === 6 && assemblies.every((row) => row.itemType === 'SEMI_FINISHED'), 'Expected 6 semi-finished assemblies');
  const allItems = await db.mdItem.findMany({ where: { tenantId: app.tenantId, itemCode: { in: [...expectedScreens, ...expectedAssemblies] } } });
  assert(allItems.length === 14, 'Screen or assembly master data is missing');
  const itemIds = allItems.map((row) => row.id);
  const boms = await db.scmBom.findMany({ where: { applicationId: app.id, itemId: { in: itemIds }, status: 'PUBLISHED', isCurrent: true } });
  assert(boms.length === 14, 'Expected a current published BOM for each of 8 screens and 6 assemblies');
  const bomByItem = new Map(boms.map((row) => [row.itemId, row]));
  const itemByCode = new Map(allItems.map((row) => [row.itemCode, row]));
  const service = new BomService(db as unknown as DatabaseService);
  for (const code of expectedScreens) {
    const item = itemByCode.get(code), bom = item && bomByItem.get(item.id);
    assert(bom, `${code} has no published BOM`);
    const detail = await service.detail('demo-portal', bom.id);
    assert(detail.lines.length >= 5, `${code} has too few BOM lines`);
    assert(detail.lines.some((line) => line.children.length > 0), `${code} has no expanded child BOM`);
  }
  const control = itemByCode.get('DEMO-A-CTRL');
  assert(control, 'Control board master is missing');
  const controlBom = bomByItem.get(control.id);
  assert(controlBom, 'Control board BOM is missing');
  const controlDetail = await service.detail('demo-portal', controlBom.id);
  assert(controlDetail.lines.find((line) => line.itemCode === 'DEMO-E-MCU-01')?.alternatives[0]?.itemCode === 'DEMO-E-MCU-02', 'Control chip alternative is missing');
  assert(controlDetail.lines.find((line) => line.itemCode === 'DEMO-E-R10K-01')?.alternatives[0]?.itemCode === 'DEMO-E-R10K-02', 'Resistor alternative is missing');
  const led = itemByCode.get('TEST-P-SCREEN-034');
  assert(led, 'LED screen is missing');
  const ledBom = bomByItem.get(led.id);
  assert(ledBom, 'LED screen BOM is missing');
  const ledDetail = await service.detail('demo-portal', ledBom.id);
  const modules = ledDetail.lines.find((line) => line.itemCode === 'DEMO-A-LED-CAB')?.children.find((line) => line.itemCode === 'DEMO-E-LED-MOD');
  assert(modules?.cumulativeQuantity === '16.0000', 'Four cabinets must expand to 16 LED modules');
  console.log(JSON.stringify({ electronicMaterials: parts.length, structuralMaterials: structural.length, assemblies: assemblies.length, screenBoms: expectedScreens.length, controlAlternatives: 2, ledModulesPerScreen: modules.cumulativeQuantity }));
}

main().finally(async () => db.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
