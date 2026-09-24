import { config } from 'dotenv';
import { resolve } from 'node:path';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import { DatabaseService } from '../src/database/database.service';
import { initializeBusinessListViews } from '../src/list-view/business-list-defaults';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
async function main() {
  if (!process.env.DATABASE_URL || !process.env.SYSTEM_CODES) throw new Error('DATABASE_URL and SYSTEM_CODES are required');
  const db = new DatabaseService(process.env.DATABASE_URL);
  try {
    const systems = process.env.SYSTEM_CODES.split(',').map((code) => systemCodeSchema.parse(code.trim()));
    const result = await db.$transaction((tx) => initializeBusinessListViews(tx, systems));
    console.log(JSON.stringify({ event: 'business-list-views-initialized', ...result }));
  } finally { await db.$disconnect(); }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Initialization failed'); process.exitCode = 1; });
