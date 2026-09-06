import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller('api/health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get('live') live() { return { status: 'ok' }; }
  @Get('ready') async ready() {
    await this.db.$queryRaw`SELECT 1`;
    const migrations = await this.db.$queryRaw<Array<{ applied: bigint }>>`SELECT COUNT(*)::bigint AS applied FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    if (!migrations[0] || migrations[0].applied < 1n) throw new Error('MIGRATIONS_NOT_READY');
    return { status: 'ok', database: 'ready', migrations: 'ready' };
  }
}
