import { Controller, Get, HttpCode, HttpStatus, Param, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { AuthorizationService } from './authorization.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ApiException } from '../http/api-exceptions';

@Controller('api/systems/:systemCode')
@UseGuards(SessionGuard)
export class NavigationController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get('navigation')
  navigation(@Req() request: AuthenticatedRequest, @Param('systemCode') rawSystemCode: string) {
    return this.authorization.navigation(request.currentUser.id, systemCodeSchema.parse(rawSystemCode));
  }

  @Get('page-access')
  @HttpCode(204)
  async pageAccess(@Req() request: AuthenticatedRequest, @Param('systemCode') rawSystemCode: string, @Query('routePath') routePath?: string): Promise<void> {
    if (!routePath || !routePath.startsWith('/')) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '页面路径无效');
    await this.authorization.assertPage(request.currentUser.id, systemCodeSchema.parse(rawSystemCode), routePath);
  }
}
