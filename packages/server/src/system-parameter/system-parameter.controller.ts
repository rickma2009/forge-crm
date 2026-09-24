import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { SystemParameterService } from './system-parameter.service';

@Controller('api/systems/:systemCode/parameters')
@UseGuards(SessionGuard)
export class SystemParameterController {
  constructor(private readonly parameters: SystemParameterService, private readonly auth: AuthorizationService) {}
  private async allowed(request: AuthenticatedRequest, raw: string, manage = false) {
    const code = systemCodeSchema.parse(raw);
    await this.auth.assertAction(request.currentUser.id, code, 'system-parameters', 'view');
    if (manage) await this.auth.assertAction(request.currentUser.id, code, 'system-parameters', 'manage');
    return code;
  }
  @Get()
  async list(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: Record<string, unknown>) {
    return this.parameters.list(await this.allowed(r, raw), query);
  }
  @Patch(':id')
  @UseGuards(WriteRequestGuard)
  async update(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() input: unknown) {
    return this.parameters.update(await this.allowed(r, raw, true), id, r.currentUser, input);
  }
}
