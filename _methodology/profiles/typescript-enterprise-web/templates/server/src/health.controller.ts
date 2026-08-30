import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { createConnection } from 'node:net';

export interface LiveStatus {
  status: 'ok';
  service: string;
}

export interface ReadyStatus {
  status: 'ready';
  dependencies: { database: 'reachable' };
}

function checkDatabaseReachability(databaseUrl: string): Promise<void> {
  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    return Promise.reject(new Error('DATABASE_URL must use postgres or postgresql'));
  }
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: parsed.hostname, port: Number(parsed.port || 5432) });
    const timeout = setTimeout(() => socket.destroy(new Error('database reachability timeout')), 1000);
    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

@Controller('health')
export class HealthController {
  @Get('live')
  live(): LiveStatus {
    return { status: 'ok', service: '{{project_slug}}-server' };
  }

  @Get('ready')
  async ready(): Promise<ReadyStatus> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new ServiceUnavailableException({ status: 'not-ready', dependencies: { database: 'not-configured' } });
    }
    try {
      await checkDatabaseReachability(databaseUrl);
      return { status: 'ready', dependencies: { database: 'reachable' } };
    } catch {
      throw new ServiceUnavailableException({ status: 'not-ready', dependencies: { database: 'unreachable' } });
    }
  }
}
