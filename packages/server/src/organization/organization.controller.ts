import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { OrganizationService } from './organization.service';

@Controller('api/systems/:systemCode/organization/units')
@UseGuards(SessionGuard)
export class OrganizationController {
  constructor(private readonly organization: OrganizationService, private readonly authorization: AuthorizationService) {}
  private system(raw: string) { return systemCodeSchema.parse(raw); }
  @Get() async list(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'organization.unit.view'); return this.organization.list(code, query); }
  @Post() @UseGuards(WriteRequestGuard) async create(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'organization.unit.manage'); return this.organization.create(code, req.currentUser.id, String(res.locals.requestId ?? 'unknown'), body); }
  @Patch(':id') @UseGuards(WriteRequestGuard) async update(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'organization.unit.manage'); return this.organization.update(code, id, req.currentUser.id, String(res.locals.requestId ?? 'unknown'), body); }
}
