import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const { Client } = require('pg');
const source = new URL(process.env.DATABASE_URL);
const databaseName = `sdd_scene_${randomBytes(6).toString('hex')}`;
source.pathname = '/postgres'; const db = new Client({ connectionString: source.toString() }); await db.connect();
const target = new URL(source); target.pathname = `/${databaseName}`;
const env = { ...process.env, DATABASE_URL: target.toString(), RUN_BUSINESS_SCENE_DB_TESTS: '1', AI_PROVIDER: 'mock', AI_MODEL: 'mock' };
function run(args) { const r = spawnSync('pnpm', ['--filter', '@forge-crm/server', ...args], { env, stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname }); if (r.status !== 0) throw new Error(`Business scene test command failed: ${args.join(' ')}`); }
try { await db.query(`CREATE DATABASE "${databaseName}"`); run(['exec', 'prisma', 'db', 'push']); run(['db:seed']); run(['exec', 'jest', '--runInBand', 'business-scene.integration.spec.ts']); }
finally { await db.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`); await db.end(); }
