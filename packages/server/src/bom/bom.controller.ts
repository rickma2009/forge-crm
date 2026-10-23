import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { BomService } from './bom.service';

@Controller('api/systems/:systemCode/boms')
@UseGuards(SessionGuard)
export class BomController {
  constructor(private readonly service: BomService, private readonly auth: AuthorizationService) {}
  private async access(request: AuthenticatedRequest, raw: string, action: string) { const code = systemCodeSchema.parse(raw); await this.auth.assertAction(request.currentUser.id, code, 'bom-directory', action); return code; }
  @Get() async list(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: unknown) { return this.service.list(await this.access(r, raw, 'view'), query); }
  @Get(':id') async detail(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { return this.service.detail(await this.access(r, raw, 'view'), id); }
  @Post() @UseGuards(WriteRequestGuard) async create(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) { return this.service.create(await this.access(r, raw, 'create'), r.currentUser.id, r.currentUser.account, body); }
  @Post(':id/draft') @UseGuards(WriteRequestGuard) async draft(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { return this.service.draft(await this.access(r, raw, 'edit'), r.currentUser.id, r.currentUser.account, id); }
  @Post(':id/preview') @UseGuards(WriteRequestGuard) async preview(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { return this.service.preview(await this.access(r, raw, 'edit'), id, body); }
  @Patch(':id') @UseGuards(WriteRequestGuard) async save(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { return this.service.save(await this.access(r, raw, 'edit'), r.currentUser.id, r.currentUser.account, id, body); }
  @Post(':id/publish') @UseGuards(WriteRequestGuard) async publish(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { return this.service.publish(await this.access(r, raw, 'publish'), r.currentUser.id, r.currentUser.account, id, body); }
}
