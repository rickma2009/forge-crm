import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { AiAnalysisService } from './ai-analysis.service';
@Controller('api/systems/:systemCode/opportunities/:id/ai-analyses')
@UseGuards(SessionGuard)
export class AiAnalysisController {
  constructor(private readonly service: AiAnalysisService, private readonly authorization: AuthorizationService) {}
  private async authorize(request: AuthenticatedRequest, raw: string, ai = false, confirm = false) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, code, 'opportunity-directory', 'view');
    if (ai) await this.authorization.assertAction(request.currentUser.id, code, 'opportunity-directory', 'ai-analyze');
    if (confirm) await this.authorization.assertAction(request.currentUser.id, code, 'opportunity-directory', 'analyze');
    return code;
  }
  @Get('preview') async preview(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { return this.service.preview(await this.authorize(r, raw, true), id); }
  @Post('test-connection') @UseGuards(WriteRequestGuard) async test(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string) { await this.authorize(r, raw, true); return this.service.testConnection(); }
  @Get() async list(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Query('page') page?: string) { return this.service.list(await this.authorize(r, raw), id, r.currentUser.id, z.coerce.number().int().min(1).max(10000).default(1).parse(page)); }
  @Post() @UseGuards(WriteRequestGuard) async start(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { return this.service.start(await this.authorize(r, raw, true), id, r.currentUser.id, body); }
  @Get(':taskId') async detail(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Param('taskId') taskId: string) { return this.service.detail(await this.authorize(r, raw), id, taskId, r.currentUser.id); }
  @Post(':taskId/confirm') @UseGuards(WriteRequestGuard) async confirm(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Param('taskId') taskId: string, @Body() body: unknown) { return this.service.confirm(await this.authorize(r, raw, true, true), id, taskId, r.currentUser.id, body); }
}
