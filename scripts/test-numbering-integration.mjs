import { createRequire } from 'node:module';
import { spawnSync,spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const require = createRequire(new URL('../packages/server/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../.env', import.meta.url).pathname, quiet: true });
const { Client } = require('pg');
const source = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) throw new Error('LOCAL_POSTGRES_REQUIRED');
const databaseName = `sdd_numbering_${randomBytes(6).toString('hex')}`;
source.pathname = '/postgres';
const admin = new Client({ connectionString: source.toString() });
const target = new URL(source); target.pathname = `/${databaseName}`;
const env = { ...process.env, ATTACHMENT_STORAGE_ROOT: `/tmp/${databaseName}-files`, DATABASE_URL: target.toString(), SYSTEM_CODES: 'demo-portal', RUN_NUMBERING_DB_TESTS: '1', AI_PROVIDER: 'mock' };
function run(args) {
  const result = spawnSync('pnpm', ['--filter', '@forge-crm/server', ...args], { env, stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname, timeout: 180000 });
  if (result.status !== 0) throw new Error(`Numbering integration command failed: ${args.join(' ')} (${result.error?.code ?? result.status})`);
}
let created = false; let server; let serverLog;
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
    await client.query('DROP TABLE sys_code_issue, sys_code_counter, sys_code_rule');
    const { readFile } = await import('node:fs/promises');
    await client.query(await readFile(new URL('../packages/server/prisma/migrations/20261004100000_numbering_rules/migration.sql', import.meta.url), 'utf8'));
    run(['exec','tsx','scripts/initialize-numbering.ts']);
    const after = await client.query('SELECT count(*)::int AS n FROM sd_opp');
    if (before.rows[0].n !== after.rows[0].n) throw new Error('MIGRATION_CHANGED_OPPORTUNITIES');
  } finally { await client.end(); }

  if(process.env.NUMBERING_BROWSER_ONLY!=='1')run(['exec','jest','--runInBand','numbering.integration.spec.ts']);
  if(process.env.RUN_NUMBERING_BROWSER==='1'){
    const {createWriteStream}=await import('node:fs');serverLog=createWriteStream('/tmp/numbering-browser-server.log');
    server=spawn(process.execPath,['packages/server/dist/main.js'],{cwd:new URL('..',import.meta.url).pathname,env:{...env,PORT:'3107'},stdio:['ignore','pipe','pipe']});server.stdout.pipe(serverLog);server.stderr.pipe(serverLog);
    let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('BROWSER_SERVER_EXITED');try{const r=await fetch('http://127.0.0.1:3107/api/auth/session');if([200,401].includes(r.status)){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}if(!ready)throw new Error('BROWSER_SERVER_NOT_READY');
    const result=spawnSync(process.execPath,['scripts/check-numbering-browser.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...env,SALESX_BACKEND_URL:'http://localhost:3107'},stdio:'inherit',timeout:180000});if(result.status!==0)throw new Error('BROWSER_VERIFICATION_FAILED');
  }

} finally {
  if(server&&server.exitCode===null){server.kill('SIGTERM');await Promise.race([new Promise(resolve=>server.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,3000))]);if(server.exitCode===null)server.kill('SIGKILL');}serverLog?.end();
  try { if (created) { await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); console.log(`Removed isolated test database: ${databaseName}`); } }
  finally { await admin.end(); const { rm } = await import('node:fs/promises'); await rm(env.ATTACHMENT_STORAGE_ROOT, { recursive: true, force: true }); }
}
