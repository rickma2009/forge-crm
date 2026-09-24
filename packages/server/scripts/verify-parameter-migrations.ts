/** Isolated local database verification; never resets the working application's database. */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { DatabaseService } from '../src/database/database.service';
config({ path: resolve(__dirname, '../../../.env'), quiet: true });
async function main() {
  const source = new URL(process.env.DATABASE_URL!);
  if (!['127.0.0.1', 'localhost'].includes(source.hostname)) throw new Error('Local database required');
  const name = `sdd_param_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const controlUrl = new URL(source); controlUrl.pathname = '/postgres';
  const target = new URL(source); target.pathname = '/' + name;
  const control = new Client({ connectionString: controlUrl.toString() });
  await control.connect(); let created = false;
  try {
    await control.query(`CREATE DATABASE "${name}"`); created = true;
    const env = { ...process.env, DATABASE_URL: target.toString() };
    const cwd = resolve(__dirname, '..');
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { cwd, env, stdio: 'pipe' });
    execFileSync('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], { cwd, env, stdio: 'pipe' });
    const db = new DatabaseService(target.toString());
    try {
      const before = await db.sysParameter.findMany({ orderBy: { id: 'asc' } });
      if (before.length !== 2 || before.some((row) => row.value !== null)) throw new Error('Unexpected fresh presets');
      execFileSync('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], { cwd, env, stdio: 'pipe' });
      const after = await db.sysParameter.findMany({ orderBy: { id: 'asc' } });
      if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Repeated seed changed presets');
      console.log(JSON.stringify({ emptyDatabaseAllMigrations: true, freshSeed: true, repeatedSeedPreservedParameters: true, presetCount: after.length }));
    } finally { await db.$disconnect(); }
  } finally {
    if (created) { await control.query(`DROP DATABASE "${name}" WITH (FORCE)`); console.log('Isolated test database removed'); }
    await control.end();
  }
}
void main().catch((error) => {
  if (error instanceof Error && 'stderr' in error) console.error(String(error.stderr));
  else console.error(error instanceof Error ? error.message : 'Verification failed');
  process.exitCode = 1;
});
