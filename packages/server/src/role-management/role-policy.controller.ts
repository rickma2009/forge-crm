import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import { z } from 'zod';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { RolePolicyService } from './role-policy.service';

@Controller('api/systems/:systemCode/role-policies')
@UseGuards(SessionGuard)
export class RolePolicyController {
  constructor(private readonly policies: RolePolicyService, private readonly authorization: AuthorizationService) {}
  private id(value: string) { return z.string().uuid().parse(value); }
  @Get('catalog')
  async catalog(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.view');
    return this.policies.catalog(code);
  }
  @Post('catalog')
  @UseGuards(WriteRequestGuard)
  async register(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Body() body: unknown) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.resource-menu.manage');
    return this.policies.register(code, req.currentUser.id, body, String(res.locals.requestId));
  }
  @Post('catalog/:resourceId/enroll')
  @UseGuards(WriteRequestGuard)
  async enroll(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('resourceId') resourceId: string, @Body() body: unknown) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.resource-menu.manage');
    return this.policies.setEnabled(code, this.id(resourceId), req.currentUser.id, body, String(res.locals.requestId));
  }
  @Get(':roleId/:resourceId/:action')
  async get(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('roleId') roleId: string, @Param('resourceId') resourceId: string, @Param('action') action: string) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.view');
    return this.policies.get(code, this.id(roleId), this.id(resourceId), action);
  }
  @Post(':roleId/:resourceId/:action')
  @UseGuards(WriteRequestGuard)
  async publish(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') roleId: string, @Param('resourceId') resourceId: string, @Param('action') action: string, @Body() body: unknown) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.permission.assign');
    return this.policies.publish(code, this.id(roleId), this.id(resourceId), action, req.currentUser.id, body, String(res.locals.requestId));
  }
  @Post(':roleId/:resourceId/:action/rollback/:version')
  @UseGuards(WriteRequestGuard)
  async rollback(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') roleId: string, @Param('resourceId') resourceId: string, @Param('action') action: string, @Param('version') version: string, @Body() body: unknown) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.permission.assign');
    return this.policies.publish(code, this.id(roleId), this.id(resourceId), action, req.currentUser.id, body, String(res.locals.requestId), z.coerce.number().int().positive().parse(version));
  }
}
