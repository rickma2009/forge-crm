import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const { Client } = require('pg');
const source = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) throw new Error('LOCAL_POSTGRES_REQUIRED');
const databaseName = `sdd_c360_${randomBytes(6).toString('hex')}`;
source.pathname = '/postgres';
const admin = new Client({ connectionString: source.toString() });
const target = new URL(source); target.pathname = `/${databaseName}`;
const env = { ...process.env, DATABASE_URL: target.toString(), SYSTEM_CODES: 'demo-portal', RUN_CUSTOMER_360_DB_TESTS: '1', AI_PROVIDER: 'mock' };
function run(args) {
  const result = spawnSync('pnpm', ['--filter', '@forge-crm/server', ...args], { env, stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname, timeout: 180000 });
  if (result.status !== 0) throw new Error(`Customer360 integration command failed: ${args.join(' ')} (${result.error?.code ?? result.status})`);
}
let created = false;
await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
  console.log(`Created isolated test database: ${databaseName}`);
  run(['exec', 'prisma', 'db', 'push']);
  run(['db:seed']);
  run(['exec', 'jest', '--runInBand', 'customer-related.integration.spec.ts']);
} finally {
  try { if (created) { await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); console.log(`Removed isolated test database: ${databaseName}`); } }
  finally { await admin.end(); }
}
