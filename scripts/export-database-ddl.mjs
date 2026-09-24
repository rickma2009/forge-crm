#!/usr/bin/env node
// Read-only review export. Migrations remain the authoritative DDL history.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'packages/server/package.json'));
const { Client } = require('pg');
require('dotenv').config({ path: resolve(root, '.env'), quiet: true });
const output = resolve(root, process.argv[2] || 'docs/database/ddl');
if (existsSync(output)) throw new Error('输出目录已存在，请指定新的快照目录，避免覆盖人工审阅记录。');
const connection = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname)) {
  throw new Error('此审阅工具仅允许连接本地项目数据库。');
}
const schema = connection.searchParams.get('schema') || 'public';
if (schema !== 'public') throw new Error('本工具只支持当前项目的 public Schema。');
connection.searchParams.delete('schema');
const client = new Client({ connectionString: connection.href, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapshot = (await client.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
  const tables = (await client.query(`
    SELECT c.relname AS name,
      (SELECT count(*)::int FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
      (SELECT count(*)::int FROM pg_constraint x WHERE x.conrelid=c.oid AND x.contype='f') AS foreign_keys,
      (SELECT count(*)::int FROM pg_index i WHERE i.indrelid=c.oid) AS indexes
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname
  `)).rows;
  const migrations = (await client.query(`SELECT migration_name, checksum FROM public._prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`)).rows;
  const dumped = spawnSync(process.env.PG_DUMP || 'pg_dump', [
    '--schema-only', '--no-owner', '--no-privileges', '--schema=public', `--snapshot=${snapshot}`,
  ], {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 60000,
    env: { ...process.env, PGHOST: connection.hostname, PGPORT: connection.port || '5432',
      PGUSER: decodeURIComponent(connection.username), PGPASSWORD: decodeURIComponent(connection.password),
      PGDATABASE: decodeURIComponent(connection.pathname.slice(1)), PGCONNECT_TIMEOUT: '5',
      PGOPTIONS: '-c default_transaction_read_only=on' },
  });
  if (dumped.error || dumped.status !== 0) {
    // Never echo connection strings or subprocess diagnostics containing credentials.
    throw new Error(`pg_dump 未完成（exit=${dumped.status}）；请检查本地数据库与 pg_dump 版本。`);
  }
  const sql = dumped.stdout;
  const headers = [...sql.matchAll(/^--\n-- Name: (.*?); Type: (.*?); Schema: (.*?); Owner: .*\n--\n/gm)];
  if (!headers.length) throw new Error('无法识别 pg_dump 对象边界，未生成文件。');
  const parts = new Map(tables.map(table => [table.name, []]));
  const shared = [sql.slice(0, headers[0].index)];
  const objects = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const block = sql.slice(header.index, headers[i + 1]?.index ?? sql.length);
    const [, name, type] = header;
    let table;
    if (type === 'TABLE') table = name;
    else if (['CONSTRAINT', 'FK CONSTRAINT', 'DEFAULT', 'TRIGGER', 'POLICY', 'ROW SECURITY'].includes(type)) {
      table = name.split(' ')[0];
    } else if (type === 'INDEX') {
      table = block.match(/\bON (?:ONLY )?public\."?([a-z_][a-z_0-9]*)"?\b/)?.[1];
    } else if (type === 'COMMENT') {
      table = block.match(/COMMENT ON (?:TABLE|COLUMN) public\."?([a-z_][a-z_0-9]*)"?\b/)?.[1];
    }
    const target = parts.has(table) ? table : null;
    if (['TABLE', 'CONSTRAINT', 'FK CONSTRAINT', 'INDEX', 'DEFAULT', 'TRIGGER', 'POLICY', 'ROW SECURITY'].includes(type) && !target) {
      throw new Error(`对象未能归属到表：${type} ${name}；未生成不完整快照。`);
    }
    (target ? parts.get(target) : shared).push(block);
    objects.push({ name, type, table: target });
  }
  for (const table of tables) {
    if (objects.filter(o => o.type === 'TABLE' && o.table === table.name).length !== 1) {
      throw new Error(`表定义不完整：${table.name}`);
    }
    if (objects.filter(o => o.type === 'FK CONSTRAINT' && o.table === table.name).length !== table.foreign_keys) {
      throw new Error(`外键数量不一致：${table.name}`);
    }
  }
  const prismaPath = resolve(root, 'packages/server/prisma/schema.prisma');
  const declared = [...readFileSync(prismaPath, 'utf8').matchAll(/@@map\("([^"]+)"\)/g)].map(m => m[1]);
  const actual = tables.map(t => t.name).filter(name => name !== '_prisma_migrations');
  const migrationsPath = resolve(root, 'packages/server/prisma/migrations');
  const localMigrations = readdirSync(migrationsPath).filter(name => existsSync(resolve(migrationsPath, name, 'migration.sql'))).sort();
  const manifest = {
    generatedAt: new Date().toISOString(), source: 'local PostgreSQL, pg_dump --schema-only, consistent read-only snapshot',
    database: decodeURIComponent(connection.pathname.slice(1)), schema,
    authoritativeSource: 'packages/server/prisma/migrations/',
    sha256: createHash('sha256').update(sql).digest('hex'), migrations,
    pendingMigrations: localMigrations.filter(name => !migrations.some(m => m.migration_name === name)),
    migrationChecksumMismatches: migrations.filter(m => existsSync(resolve(migrationsPath, m.migration_name, 'migration.sql')) &&
      createHash('sha256').update(readFileSync(resolve(migrationsPath, m.migration_name, 'migration.sql'))).digest('hex') !== m.checksum).map(m => m.migration_name),
    prismaMissingInDatabase: declared.filter(name => !actual.includes(name)),
    databaseNotInPrisma: actual.filter(name => !declared.includes(name)), tables, objects,
  };
  await client.query('ROLLBACK');
  mkdirSync(dirname(output), { recursive: true });
  mkdirSync(output);
  mkdirSync(resolve(output, 'tables'));
  const notice = '-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.\n-- See README.md; shared types/functions and referenced tables are required.\n\n';
  writeFileSync(resolve(output, 'all-schema.sql'), notice + sql);
  writeFileSync(resolve(output, 'shared.sql'), notice + shared.join(''));
  for (const [name, blocks] of parts) writeFileSync(resolve(output, 'tables', `${name}.sql`), notice + blocks.join(''));
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const issues = [
    ['尚未应用的迁移', manifest.pendingMigrations], ['已应用迁移校验和不一致', manifest.migrationChecksumMismatches],
    ['Prisma 定义存在但数据库没有的表', manifest.prismaMissingInDatabase], ['数据库存在但 Prisma 未声明的应用表', manifest.databaseNotInPrisma],
  ];
  writeFileSync(resolve(output, 'README.md'), `# 数据库表 DDL 审阅快照

生成时间：${manifest.generatedAt}。来源：本地项目数据库 ${manifest.database} / public，一致性只读快照。

共 **${actual.length} 张应用表**，另含 1 张 Prisma 内部迁移记录表。只导出结构，不包含业务记录、密码或令牌数据。

## 文件与权威来源

- [tables/](tables/)：每表一个 SQL，包含建表、主键、外键、索引、CHECK 等该表对象；跨表外键放在引用方文件中。
- [shared.sql](shared.sql)：公共枚举、函数及其他未归属到单表的 Schema 对象。
- [all-schema.sql](all-schema.sql)：pg_dump 原顺序的完整结构（省略所有者与授权），用于交叉核对。
- [manifest.json](manifest.json)：逐表字段/外键/索引计数、对象清单、已应用迁移和一致性检查。
- 正式 Prisma 模型：\`packages/server/prisma/schema.prisma\`。
- **唯一正式 DDL 历史：\`packages/server/prisma/migrations/*/migration.sql\`。本目录不是新的迁移源。**

## 使用边界

仅用于审阅现状，禁止手工维护后当迁移使用。单表文件依赖公共类型、函数和其他表，不保证独立执行或按文件名顺序执行。范围为 public Schema，不含库级扩展的安装语句（例如有效期排斥约束依赖 btree_gist）。未执行恢复演练；不包含数据、所有者或 GRANT，不能当完整备份。未修改数据库，未改变任何 Gate 状态。

可复用的是只读结构导出和核对流程；本项目具体表结构、角色策略不能未经目标项目评审直接复用。数据库行为正确性、字段业务含义与实际授权效果不在此次导出验证范围。

## 再次导出

在项目根执行（先确保本地 Postgres 已运行，并安装匹配版本的 pg_dump；连接读取根 .env 或 DATABASE_URL）：

\`\`\`bash
node scripts/export-database-ddl.mjs docs/database/ddl-next
\`\`\`

输出目录必须不存在，避免覆盖已有审阅记录。只连接 localhost，不连接参考项目或生产库。

## 核对结果

${issues.map(([label, items]) => `- ${label}：${items.length ? items.join('、') : '无'}`).join('\n')}

表名集合一致不代表所有字段与 Prisma 无漂移；实际 DDL 以本快照为准，约束中保留迁移 SQL 增加而 Prisma 不能完整表达的部分。

## 逐表索引

| 物理表 / DDL | 字段数 | 外键数 | 索引数 |
|---|---:|---:|---:|
${tables.map(t => `| [${t.name}](tables/${t.name}.sql) | ${t.columns} | ${t.foreign_keys} | ${t.indexes} |`).join('\n')}
`);
  console.log(JSON.stringify({ output, applicationTables: actual.length, internalTables: tables.length - actual.length,
    objectCount: objects.length, checks: Object.fromEntries(issues) }, null, 2));
} finally {
  await client.end();
}
