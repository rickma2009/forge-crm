import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { WorkbenchService } from './workbench.service';
@Controller('api/systems/:systemCode/workbench')
@UseGuards(SessionGuard)
export class WorkbenchController {
  constructor(private readonly service: WorkbenchService) {}
  @Get() get(@Req() request: AuthenticatedRequest, @Param('systemCode') code: string) {
    return this.service.get(systemCodeSchema.parse(code), request.currentUser.id);
  }
}
