import { InventoryDefaultsService } from './inventory/inventory-defaults.service';
import { SystemParameterController } from './system-parameter/system-parameter.controller';
import { SystemParameterService } from './system-parameter/system-parameter.service';
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
import { StyleSceneController } from './style-scene/style-scene.controller';
import { StyleSceneService } from './style-scene/style-scene.service';
import { AccessController } from './access/access.controller';
import { AccessService } from './access/access.service';
import { OrganizationController } from './organization/organization.controller';
import { OrganizationService } from './organization/organization.service';
import { EmployeeController } from './organization/employee.controller';
import { EmployeeService } from './organization/employee.service';
import { ResourceMenuController } from './rbac/resource-menu.controller';
import { RoleManagementController } from './role-management/role-management.controller';
import { RoleManagementService } from './role-management/role-management.service';
import { RolePolicyController } from './role-management/role-policy.controller';
import { RolePolicyService } from './role-management/role-policy.service';
import { RoleSubjectService } from './role-management/role-subject.service';
import { RoleSubjectController } from './role-management/role-subject.controller';
import { ResourceMenuService } from './rbac/resource-menu.service';
import { CompetitorController, OpportunityController, OpportunityTemplateController, ProductController } from './opportunity/opportunity.controller';
import { OpportunityService } from './opportunity/opportunity.service';
import { OpportunityAmountService } from './opportunity/opportunity-amount.service';
import { PricingService } from './quotation/pricing.service';
import { QuotationService } from './quotation/quotation.service';
import { PricingController, QuotationController } from './quotation/quotation.controller';
import { AttachmentController } from './attachment/attachment.controller';
import { AttachmentService } from './attachment/attachment.service';
import { FileStorage } from './attachment/file-storage';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';

const config = loadRuntimeConfig();

@Module({
  controllers: [SystemParameterController, InventoryController, AttachmentController, PricingController, QuotationController, AuthController, NavigationController, ResourceMenuController, AccessController, OrganizationController, EmployeeController, DemoResourceController, DictionaryController, ListViewController, CustomerController, ProductController, CompetitorController, OpportunityTemplateController, OpportunityController, StyleSceneController, RoleManagementController, RolePolicyController, RoleSubjectController, HealthController],
  providers: [
    InventoryDefaultsService, SystemParameterService, AttachmentService, FileStorage, PricingService, QuotationService, OpportunityAmountService,
    { provide: RUNTIME_CONFIG, useValue: config },
    { provide: DatabaseService, useFactory: (runtime: RuntimeConfig) => new DatabaseService(runtime.databaseUrl), inject: [RUNTIME_CONFIG] },
    { provide: SessionSigner, useFactory: (runtime: RuntimeConfig) => new SessionSigner({ current: signingKey(runtime.sessionSecret), ...(runtime.previousSessionSecret ? { previous: signingKey(runtime.previousSessionSecret) } : {}) }), inject: [RUNTIME_CONFIG] },
    AuthService, SessionGuard, WriteRequestGuard, AuthorizationService, ResourceMenuService, AccessService, OrganizationService, EmployeeService, DemoResourceService, DictionaryService, ListViewService, CustomerService, OpportunityService, InventoryService, StyleSceneService, RoleManagementService, RolePolicyService, RoleSubjectService,
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
