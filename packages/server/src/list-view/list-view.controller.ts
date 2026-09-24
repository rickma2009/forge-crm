import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AuthorizationService } from '../rbac/authorization.service';
import { ListViewService } from './list-view.service';

@Controller('api/systems/:systemCode/list-views/:pageCode/:actionCode')
@UseGuards(SessionGuard)
export class ListViewController {
  constructor(private readonly views: ListViewService, private readonly authorization: AuthorizationService) {}

  @Get()
  async resolve(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('pageCode') pageCode: string, @Param('actionCode') actionCode: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, pageCode, actionCode);
    return this.views.resolve(request.currentUser.id, systemCode, pageCode, actionCode);
  }

  @Post('personal')
  @UseGuards(WriteRequestGuard)
  async createPersonal(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('pageCode') pageCode: string, @Param('actionCode') actionCode: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, pageCode, actionCode);
    return this.views.createPersonal(request.currentUser.id, systemCode, pageCode, actionCode, body);
  }

  @Patch('personal/:id')
  @UseGuards(WriteRequestGuard)
  async updatePersonal(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('pageCode') pageCode: string, @Param('actionCode') actionCode: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, pageCode, actionCode);
    return this.views.updatePersonal(request.currentUser.id, systemCode, pageCode, actionCode, id, body);
  }

  @Delete('personal/:id')
  @UseGuards(WriteRequestGuard)
  async deletePersonal(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('pageCode') pageCode: string, @Param('actionCode') actionCode: string, @Param('id') id: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, pageCode, actionCode);
    return this.views.deletePersonal(request.currentUser.id, systemCode, pageCode, actionCode, id);
  }

  @Post('selection')
  @UseGuards(WriteRequestGuard)
  async select(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('pageCode') pageCode: string, @Param('actionCode') actionCode: string, @Body() body: { viewKey?: string }) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, pageCode, actionCode);
    return this.views.select(request.currentUser.id, systemCode, pageCode, actionCode, String(body.viewKey ?? ''));
  }

  @Patch('system/:id')
  @UseGuards(WriteRequestGuard)
  async updateSystem(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('pageCode') pageCode: string, @Param('actionCode') actionCode: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'system-list-views', 'manage');
    return this.views.updateSystem(systemCode, pageCode, actionCode, id, request.currentUser.account, body);
  }
}
