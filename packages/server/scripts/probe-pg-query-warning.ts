/** Read-only diagnostic. Run each mode in a fresh process: pg warns once per process. */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const mode = process.argv[2];
if (mode !== 'plain' && mode !== 'relations') throw new Error('Expected mode: plain | relations');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
let queryWarnings = 0;
process.on('warning', (warning) => {
  if (warning.message.includes('already executing a query')) queryWarnings++;
});

async function main() {
  try {
    const rows = await db.$transaction(async (tx) => mode === 'relations'
      ? tx.sdOpp.findMany({ take: 1, include: { products: true, followUps: true, analyses: { include: { competitors: true } } } })
      : tx.sdOpp.findMany({ take: 1 }));
    await new Promise((done) => setImmediate(done));
    console.log(JSON.stringify({ mode, rows: rows.length, queryWarnings, applicationPromiseAll: false }));
  } finally { await db.$disconnect(); }
}
void main().catch((error: unknown) => {
  // Connection errors can contain deployment details; do not log the connection URL or data.
  console.error(error instanceof Error ? error.name : 'ProbeError');
  process.exitCode = 1;
});
