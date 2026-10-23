import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { systemCodeSchema } from '@forge-crm/contracts';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedComponentLibrary, seedTemplateLibrary } from '../src/style-scene/template-library.seed';

const rootDir = resolve(__dirname, '../../..');
config({ path: resolve(rootDir, '.env'), quiet: true });
async function main() {
  if (!process.env.DATABASE_URL || !process.env.SYSTEM_CODES) throw new Error('DATABASE_URL_AND_SYSTEM_CODES_REQUIRED');
  const systems = [...new Set(process.env.SYSTEM_CODES.split(',').map((code) => systemCodeSchema.parse(code.trim())))];
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    for (const system of systems) {
      const counts = await db.$transaction(async (tx) => ({ templates: await seedTemplateLibrary(tx, system, rootDir), components: await seedComponentLibrary(tx, system, rootDir) }));
      console.log(`${system}: ${counts.templates} templates and ${counts.components} components registered; historical assets retained`);
    }
  } finally { await db.$disconnect(); }
}
void main();
