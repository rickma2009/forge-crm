import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { OpportunityAnalyticsService } from './opportunity-analytics.service';
@Controller('api/systems/:systemCode/opportunity-analysis')
@UseGuards(SessionGuard)
export class OpportunityAnalyticsController {
  constructor(private readonly service: OpportunityAnalyticsService) {}
  @Get() summary(@Req() r: AuthenticatedRequest, @Param('systemCode') code: string, @Query() q: Record<string, unknown>) { return this.service.summary(systemCodeSchema.parse(code), r.currentUser.id, q); }
  @Get('records') records(@Req() r: AuthenticatedRequest, @Param('systemCode') code: string, @Query() q: Record<string, unknown>) { return this.service.records(systemCodeSchema.parse(code), r.currentUser.id, q); }
}
