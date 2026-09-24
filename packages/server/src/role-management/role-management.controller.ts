import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import { z } from 'zod';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { RoleManagementService } from './role-management.service';

@Controller('api/systems/:systemCode/roles')
@UseGuards(SessionGuard)
export class RoleManagementController {
  constructor(private readonly roles: RoleManagementService, private readonly authorization: AuthorizationService) {}
  private id(raw: string) { return z.string().uuid().parse(raw); }
  private requestId(res: Response) { return String(res.locals.requestId ?? 'unknown'); }

  @Get()
  async tree(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, systemCode, 'access.role.view');
    return this.roles.tree(systemCode);
  }

  @Get('permission-catalog')
  async permissionCatalog(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.view');
    return this.roles.permissionCatalog(code, req.currentUser.id);
  }

  @Get(':id/views')
  async views(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.view');
    return this.roles.views(code, this.id(id), req.currentUser.id);
  }

  @Post(':id/views')
  @UseGuards(WriteRequestGuard)
  async saveViews(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.permission.assign');
    return this.roles.saveViews(code, this.id(id), req.currentUser.id, body, this.requestId(res));
  }

  @Post()
  @UseGuards(WriteRequestGuard)
  async create(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, systemCode, 'access.role.create');
    return this.roles.create(systemCode, req.currentUser.id, body, this.requestId(res));
  }

  @Patch(':id')
  @UseGuards(WriteRequestGuard)
  async update(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, systemCode, 'access.role.update');
    return this.roles.update(systemCode, this.id(id), req.currentUser.id, body, this.requestId(res));
  }

  @Post(':id/move')
  @UseGuards(WriteRequestGuard)
  async move(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.update');
    return this.roles.move(code, this.id(id), req.currentUser.id, body, this.requestId(res));
  }

  @Delete(':id')
  @UseGuards(WriteRequestGuard)
  async delete(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, systemCode, 'access.role.status.manage');
    return this.roles.delete(systemCode, this.id(id), req.currentUser.id, body, this.requestId(res));
  }
}
