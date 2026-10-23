import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AgentService } from './agent.service';
@Controller('api/systems/:systemCode/opportunities/:id/agent-tasks')
@UseGuards(SessionGuard)
export class AgentController {
  constructor(private readonly service: AgentService) {}
  @Get('preview') preview(@Req() r: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string) { return this.service.preview(systemCodeSchema.parse(code), id, r.currentUser.id); }
  @Get() list(@Req() r: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Query('page') page?: string) { return this.service.list(systemCodeSchema.parse(code), id, r.currentUser.id, z.coerce.number().int().min(1).max(10000).default(1).parse(page)); }
  @Get(':taskId') detail(@Req() r: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Param('taskId') taskId: string) { return this.service.detail(systemCodeSchema.parse(code), id, taskId, r.currentUser.id); }
  @Post() @UseGuards(WriteRequestGuard) start(@Req() r: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Body() body: unknown) { return this.service.start(systemCodeSchema.parse(code), id, r.currentUser.id, body); }
  @Post(':taskId/cancel') @UseGuards(WriteRequestGuard) cancel(@Req() r: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Param('taskId') taskId: string) { return this.service.cancel(systemCodeSchema.parse(code), id, taskId, r.currentUser.id); }
  @Post(':taskId/save-plan') @UseGuards(WriteRequestGuard) save(@Req() r: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Param('taskId') taskId: string, @Body() body: unknown) { return this.service.save(systemCodeSchema.parse(code), id, taskId, r.currentUser.id, body); }
}
