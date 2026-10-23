import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const { Client } = require('pg');
const source = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) throw new Error('LOCAL_POSTGRES_REQUIRED');
const databaseName = `sdd_timeline_${randomBytes(6).toString('hex')}`;
source.pathname = '/postgres';
const admin = new Client({ connectionString: source.toString() });
const target = new URL(source); target.pathname = `/${databaseName}`;
const env = { ...process.env, ATTACHMENT_STORAGE_ROOT: `/tmp/${databaseName}-files`, DATABASE_URL: target.toString(), SYSTEM_CODES: 'demo-portal', RUN_TIMELINE_DB_TESTS: '1', AI_PROVIDER: 'mock' };
function run(args) {
  const result = spawnSync('pnpm', ['--filter', '@forge-crm/server', ...args], { env, stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname, timeout: 180000 });
  if (result.status !== 0) throw new Error(`Timeline integration command failed: ${args.join(' ')} (${result.error?.code ?? result.status})`);
}
let created = false;
await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
  console.log(`Created isolated test database: ${databaseName}`);
  // Historical clean-install migration fails at 20260922071848 (org_unit dependency).
  // Use the current schema baseline, then test this package's actual migration SQL below.
  run(['exec', 'prisma', 'db', 'push']);
  // Exercise the actual incremental DDL against an existing schema with existing records.
  run(['db:seed']);
  const client = new Client({ connectionString: target.toString() }); await client.connect();
  try {
    const before = await client.query('SELECT count(*)::int AS n FROM sd_opp');
    await client.query('DROP TABLE sd_sales_activity; DROP INDEX sd_activity_customer_scope_key; DROP INDEX sd_activity_app_scope_key; ALTER TABLE sd_opp_follow_up DROP COLUMN request_id, DROP COLUMN request_hash, DROP COLUMN activity_title, DROP COLUMN activity_next_step;');
    const { readFile } = await import('node:fs/promises');
    await client.query(await readFile(new URL('../packages/server/prisma/migrations/20261003160000_activity_timeline/migration.sql', import.meta.url), 'utf8'));
    const after = await client.query('SELECT count(*)::int AS n FROM sd_opp');
    if (before.rows[0].n !== after.rows[0].n) throw new Error('MIGRATION_CHANGED_OPPORTUNITIES');
  } finally { await client.end(); }

  run(['exec', 'jest', '--runInBand', 'activity.integration.spec.ts']);
} finally {
  try { if (created) { await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); console.log(`Removed isolated test database: ${databaseName}`); } }
  finally { await admin.end(); const { rm } = await import('node:fs/promises'); await rm(env.ATTACHMENT_STORAGE_ROOT, { recursive: true, force: true }); }
}
