import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const { Client } = require('pg');
const source = new URL(process.env.DATABASE_URL);
const databaseName = `sdd_agent_${randomBytes(6).toString('hex')}`;
source.pathname = '/postgres'; const db = new Client({ connectionString: source.toString() }); await db.connect();
const target = new URL(source); target.pathname = `/${databaseName}`;
const env = { ...process.env, DATABASE_URL: target.toString(), RUN_AGENT_DB_TESTS: '1', AI_PROVIDER: 'mock', AI_MODEL: 'mock' };
function run(args) { const r = spawnSync('pnpm', ['--filter', '@forge-crm/server', ...args], { env, stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname }); if (r.status !== 0) throw new Error(`Agent test command failed: ${args.join(' ')}`); }
try { await db.query(`CREATE DATABASE "${databaseName}"`); run(['exec', 'prisma', 'db', 'push']); run(['db:seed']); const checkDb = new Client({ connectionString: target.toString() }); await checkDb.connect(); try { const sql = readFileSync(new URL('../packages/server/prisma/migrations/20260925160000_opportunity_ai_analysis/migration.sql', import.meta.url), 'utf8'); await checkDb.query(sql.slice(sql.indexOf('ALTER TABLE ai_analysis_task ADD CONSTRAINT'))); } finally { await checkDb.end(); } run(['exec', 'jest', '--runInBand', 'agent.integration.spec.ts', 'personal-agent.integration.spec.ts', 'opportunity-lifecycle.integration.spec.ts']); }
finally { await db.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`); await db.end(); }
