import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { DemoResourceService } from './demo-resource.service';
import type { AuthenticatedRequest } from '../auth/auth.types';

@Controller('api/systems/:systemCode/demo-resources')
@UseGuards(SessionGuard, WriteRequestGuard)
export class DemoResourceController {
  constructor(private readonly authorization: AuthorizationService, private readonly resources: DemoResourceService) {}

  @Post('maintain')
  async maintain(@Req() request: AuthenticatedRequest, @Param('systemCode') rawSystemCode: string) {
    const systemCode = systemCodeSchema.parse(rawSystemCode);
    return this.resources.exclusive(() => this.authorization.executeAuthorizedAction(request.currentUser.id, systemCode, 'system-resources', 'manage', () => this.resources.prepareMaintain()));
  }

  @Post('export')
  async export(@Req() request: AuthenticatedRequest, @Param('systemCode') rawSystemCode: string) {
    const systemCode = systemCodeSchema.parse(rawSystemCode);
    return this.resources.exclusive(() => this.authorization.executeAuthorizedAction(request.currentUser.id, systemCode, 'system-resources', 'export', () => this.resources.prepareExport()));
  }
}
