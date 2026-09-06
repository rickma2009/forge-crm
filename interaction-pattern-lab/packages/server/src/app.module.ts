import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { loadRuntimeConfig, RUNTIME_CONFIG, type RuntimeConfig } from './config/runtime-config';
import { DatabaseService } from './database/database.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { SessionSigner, signingKey } from './auth/session-signer';
import { SessionGuard } from './auth/session.guard';
import { CSRF_COOKIE, WriteRequestGuard } from './auth/write-request.guard';
import { AuthorizationService } from './rbac/authorization.service';
import { NavigationController } from './rbac/navigation.controller';
import { DemoResourceController } from './demo-resource/demo-resource.controller';
import { DemoResourceService } from './demo-resource/demo-resource.service';
import { HealthController } from './health.controller';
import { DictionaryController } from './dictionary/dictionary.controller';
import { DictionaryService } from './dictionary/dictionary.service';
import { ListViewController } from './list-view/list-view.controller';
import { ListViewService } from './list-view/list-view.service';
import { CustomerController } from './customer/customer.controller';
import { CustomerService } from './customer/customer.service';

const config = loadRuntimeConfig();

@Module({
  controllers: [AuthController, NavigationController, DemoResourceController, DictionaryController, ListViewController, CustomerController, HealthController],
  providers: [
    { provide: RUNTIME_CONFIG, useValue: config },
    { provide: DatabaseService, useFactory: (runtime: RuntimeConfig) => new DatabaseService(runtime.databaseUrl), inject: [RUNTIME_CONFIG] },
    { provide: SessionSigner, useFactory: (runtime: RuntimeConfig) => new SessionSigner({ current: signingKey(runtime.sessionSecret), ...(runtime.previousSessionSecret ? { previous: signingKey(runtime.previousSessionSecret) } : {}) }), inject: [RUNTIME_CONFIG] },
    AuthService, SessionGuard, WriteRequestGuard, AuthorizationService, DemoResourceService, DictionaryService, ListViewService, CustomerService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply((request: Request, response: Response, next: NextFunction) => {
      const requestId = request.header('x-request-id')?.slice(0, 128) || randomUUID();
      const startedAt = process.hrtime.bigint();
      response.locals.requestId = requestId;
      response.setHeader('x-request-id', requestId);
      if (!request.cookies?.[CSRF_COOKIE]) response.cookie(CSRF_COOKIE, randomBytes(24).toString('base64url'), { sameSite: 'lax', secure: config.secureCookies, path: '/' });
      response.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const routeTemplate = typeof request.route?.path === 'string' ? request.route.path : request.path;
        const systemCode = typeof request.params?.systemCode === 'string' ? request.params.systemCode : undefined;
        process.stdout.write(`${JSON.stringify({ event: 'http_request', requestId, method: request.method, routeTemplate, ...(systemCode ? { systemCode } : {}), resultCode: response.locals.errorCode ?? response.statusCode, durationMs: Number(durationMs.toFixed(1)) })}\n`);
      });
      next();
    }).forRoutes('*');
  }
}
