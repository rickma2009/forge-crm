import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { EmployeeService } from './employee.service';

@Controller('api/systems/:systemCode/organization/employees')
@UseGuards(SessionGuard)
export class EmployeeController {
  constructor(private readonly employees: EmployeeService, private readonly authorization: AuthorizationService) {}
  private system(raw: string) { return systemCodeSchema.parse(raw); }
  @Get() async list(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'organization.employee.view'); return this.employees.list(code, query); }
  @Get('options') async options(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'organization.employee.view'); return this.employees.options(code); }
  @Get(':id') async detail(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'organization.employee.manage'); return this.employees.detail(code, id); }
  @Post() @UseGuards(WriteRequestGuard) async create(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'organization.employee.manage'); return this.employees.create(code, req.currentUser.id, String(res.locals.requestId ?? 'unknown'), body); }
  @Patch(':id') @UseGuards(WriteRequestGuard) async update(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'organization.employee.manage'); return this.employees.update(code, id, req.currentUser.id, String(res.locals.requestId ?? 'unknown'), body); }
}
