import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://database_url_required:invalid@127.0.0.1:1/database_url_required';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: databaseUrl },
});
