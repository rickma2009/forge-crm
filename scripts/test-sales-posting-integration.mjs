import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const { Client } = require('pg');
const source = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) throw new Error('LOCAL_POSTGRES_REQUIRED');
const databaseName = `sdd_sales_${randomBytes(6).toString('hex')}`;
source.pathname = '/postgres';
const admin = new Client({ connectionString: source.toString() });
const target = new URL(source); target.pathname = `/${databaseName}`;
const env = { ...process.env, DATABASE_URL: target.toString(), SYSTEM_CODES: 'demo-portal', RUN_SALES_POSTING_DB_TESTS: '1', AI_PROVIDER: 'mock' };
function run(args) {
  const result = spawnSync('pnpm', ['--filter', '@forge-crm/server', ...args], { env, stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname, timeout: 180000 });
  if (result.status !== 0) throw new Error(`Sales integration command failed: ${args.join(' ')} (${result.error?.code ?? result.status})`);
}
let created = false;
await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
  console.log(`Created isolated test database: ${databaseName}`);
  run(['exec', 'prisma', 'db', 'push']);
  run(['db:seed']);
  const checkDb = new Client({ connectionString: target.toString() }); await checkDb.connect();
  try {
    const sql = readFileSync(new URL('../packages/server/prisma/migrations/20261003000000_sales_order_outbound/migration.sql', import.meta.url), 'utf8');
    const start = sql.indexOf('CREATE UNIQUE INDEX "sd_so_active_quote_key"');
    if (start < 0) throw new Error('SALES_CHECK_CONSTRAINT_SOURCE_MISSING');
    await checkDb.query(sql.slice(start));
  } finally { await checkDb.end(); }
  run(['exec', 'jest', '--runInBand', 'sales-posting.integration.spec.ts', 'inventory-summary.integration.spec.ts']);
} finally {
  try { if (created) { await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); console.log(`Removed isolated test database: ${databaseName}`); } }
  finally { await admin.end(); }
}
