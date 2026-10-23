import { spawn, spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { DatabaseService } from '../database/database.service';
import { componentLibraryEntries } from './template-library.seed';

const run = process.env.RUN_COMPONENT_CATALOG_DB_TESTS === '1' ? describe : describe.skip;
run('component maintenance CLI in isolated PostgreSQL', () => {
  let db: DatabaseService;
  const systemCode = 'demo-portal', root = resolve(process.cwd(), '../..');
  const snapshot = () => db.styleScene.findMany({ orderBy: { id: 'asc' } });
  function cli(apply = false) {
    const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/sync-component-library.ts', '--system', systemCode, ...(apply ? ['--apply'] : [])], { cwd: resolve(root, 'packages/server'), env: process.env, encoding: 'utf8', timeout: 20000 });
    if (result.error) throw result.error;
    return result;
  }
  const changedRows = () => db.styleScene.updateMany({ where: { systemCode, assetCode: { in: ['CMP-01', 'CMP-02'] } }, data: { description: 'catalog-test-old', status: 'WIP', maturity: 'candidate', evidenceJson: ['human-evidence'], note: 'review must survive', nextEvidence: 'future target adoption' } });
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!/^\/sdd_catalog_[0-9a-f]{12}$/.test(url.pathname) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('ISOLATED_CATALOG_DATABASE_REQUIRED');
    db = new DatabaseService(url.toString());
    await db.styleScene.create({ data: { systemCode: 'other-system', assetCode: 'CMP-01', category: 'test', sceneName: 'unrelated', description: 'do not overwrite', note: 'keep', createdBy: 'test', updatedBy: 'test' } });
  });
  afterAll(async () => { await db?.$disconnect(); });

  it('previews without writes, applies two real updates, preserves reviews and becomes a no-op', async () => {
    await changedRows(); const before = await snapshot();
    const preview = cli(); expect(preview.status).toBe(0); expect(preview.stdout).toContain('PREVIEW ONLY');
    expect(JSON.parse(preview.stdout.split('\n').find(line => line.startsWith('{'))!).changes.map((entry: { code: string }) => entry.code)).toEqual(['CMP-01', 'CMP-02']);
    expect(await snapshot()).toEqual(before);
    const applied = cli(true); expect(applied.status).toBe(0);
    const after = await snapshot(); expect(after).toHaveLength(before.length);
    for (const row of before) {
      const updated = after.find(value => value.id === row.id)!;
      if (row.systemCode === systemCode && ['CMP-01', 'CMP-02'].includes(row.assetCode!)) {
        expect(updated.description).toBe(componentLibraryEntries(root).find(value => value.code === row.assetCode)!.data.description);
        for (const key of ['evidenceJson', 'evidenceCardsJson', 'status', 'maturity', 'note', 'nextEvidence', 'pagePath', 'doneAt', 'version', 'createdBy', 'createdAt'] as const) expect(updated[key]).toEqual(row[key]);
        expect(updated.updatedBy).toBe('component-library-maintenance');
      } else expect(updated).toEqual(row);
    }
    expect(cli(true).status).toBe(0); expect(await snapshot()).toEqual(after);
  }, 60000);

  it('rolls back a completed first update when PostgreSQL rejects the second update', async () => {
    await changedRows(); const before = await snapshot();
    // Sequence increments survive rollback, so the marker independently proves the first UPDATE ran.
    // All DDL and literal names are fixed test-only values in the guarded disposable database.
    await db.$executeRawUnsafe('CREATE SEQUENCE catalog_attempt_marker');
    await db.$executeRawUnsafe(`CREATE FUNCTION catalog_count_attempt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.system_code = 'demo-portal' AND NEW.asset_code = 'CMP-01' THEN PERFORM nextval('catalog_attempt_marker'); END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER catalog_count_attempt AFTER UPDATE ON style_scene FOR EACH ROW EXECUTE FUNCTION catalog_count_attempt()');
    await db.$executeRawUnsafe(`ALTER TABLE style_scene ADD CONSTRAINT catalog_reject_second CHECK (system_code <> 'demo-portal' OR asset_code <> 'CMP-02' OR description = 'catalog-test-old')`);
    try {
      const failed = cli(true); expect(failed.status).not.toBe(0); expect(failed.stderr).toContain('catalog_reject_second');
      const marker = await db.$queryRawUnsafe<Array<{ last_value: bigint; is_called: boolean }>>('SELECT last_value, is_called FROM catalog_attempt_marker');
      expect(marker).toEqual([{ last_value: 1n, is_called: true }]);
      expect(await snapshot()).toEqual(before);
    } finally {
      await db.$executeRawUnsafe('ALTER TABLE style_scene DROP CONSTRAINT catalog_reject_second');
      await db.$executeRawUnsafe('DROP TRIGGER catalog_count_attempt ON style_scene');
      await db.$executeRawUnsafe('DROP FUNCTION catalog_count_attempt()');
      await db.$executeRawUnsafe('DROP SEQUENCE catalog_attempt_marker');
    }
    expect(cli(true).status).toBe(0);
    expect((await snapshot()).filter(row => row.systemCode === systemCode && ['CMP-01', 'CMP-02'].includes(row.assetCode!)).every(row => row.description !== 'catalog-test-old')).toBe(true);
  }, 60000);

  it('preserves a concurrent human review, rolls back stale sync and permits an explicit fresh retry', async () => {
    await changedRows(); const before = await snapshot();
    const keeper = new Client({ connectionString: process.env.DATABASE_URL });
    await keeper.connect();
    const key = randomInt(1, 1_000_000_000);
    await keeper.query('SELECT pg_advisory_lock(91387, $1)', [key]);
    // A fixed test-only trigger pauses the CLI after its first UPDATE. The second row is
    // still available for an independent committed review, creating a known interleaving.
    await db.$executeRawUnsafe(`CREATE FUNCTION catalog_pause_sync() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.system_code = 'demo-portal' AND NEW.asset_code = 'CMP-01' THEN PERFORM pg_advisory_xact_lock(91387, ${key}); END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER catalog_pause_sync AFTER UPDATE ON style_scene FOR EACH ROW EXECUTE FUNCTION catalog_pause_sync()');
    const child = spawn('pnpm', ['exec', 'tsx', 'scripts/sync-component-library.ts', '--system', systemCode, '--apply'], { cwd: resolve(root, 'packages/server'), env: process.env, timeout: 20000 });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); }); child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    const complete = new Promise<number | null>((resolveChild, reject) => { child.on('error', reject); child.on('close', resolveChild); });
    // Attach a handler immediately so cleanup can safely await a spawn error later.
    void complete.catch(() => {});
    try {
      let waiting = false;
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const locks = await keeper.query('SELECT 1 FROM pg_locks WHERE locktype = $1 AND classid = $2 AND objid = $3 AND objsubid = 2 AND NOT granted', ['advisory', 91387, key]);
        if (locks.rowCount) { waiting = true; break; }
        if (child.exitCode !== null) break;
        await new Promise(resolveWait => setTimeout(resolveWait, 50));
      }
      expect(waiting).toBe(true);
      expect(JSON.parse(stdout.split('\n').find(line => line.startsWith('{'))!).changes.map((entry: { code: string }) => entry.code)).toEqual(['CMP-01', 'CMP-02']);
      const reviewed = await db.styleScene.update({ where: { systemCode_assetCode: { systemCode, assetCode: 'CMP-02' } }, data: { note: 'concurrent human review', evidenceJson: ['new-human-evidence'], version: { increment: 1 }, updatedBy: 'human-review' } });
      const expected = before.map(row => row.id === reviewed.id ? reviewed : row);
      await keeper.query('SELECT pg_advisory_unlock(91387, $1)', [key]);
      expect(await complete).not.toBe(0);
      expect(stderr).toMatch(/write conflict|deadlock|serialization|serialize|P2034/i);
      expect(await snapshot()).toEqual(expected);
    } finally {
      await keeper.query('SELECT pg_advisory_unlock(91387, $1)', [key]);
      try { await complete; } finally {
        await keeper.end();
        await db.$executeRawUnsafe('DROP TRIGGER catalog_pause_sync ON style_scene');
        await db.$executeRawUnsafe('DROP FUNCTION catalog_pause_sync()');
      }
    }
    const preview = cli(); expect(preview.status).toBe(0); expect(preview.stdout).toContain('CMP-02');
    const beforeRetry = await snapshot(); expect(cli(true).status).toBe(0);
    const reviewed = (await snapshot()).find(row => row.systemCode === systemCode && row.assetCode === 'CMP-02')!;
    expect(reviewed.note).toBe('concurrent human review'); expect(reviewed.evidenceJson).toEqual(['new-human-evidence']);
    expect(reviewed.version).toBe(beforeRetry.find(row => row.id === reviewed.id)!.version);
    expect(reviewed.description).toBe(componentLibraryEntries(root).find(row => row.code === 'CMP-02')!.data.description);
  }, 60000);
});
