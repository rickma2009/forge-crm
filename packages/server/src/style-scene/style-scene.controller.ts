import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AuthorizationService } from '../rbac/authorization.service';
import { StyleSceneService } from './style-scene.service';

@Controller('api/systems/:systemCode/style-scenes')
@UseGuards(SessionGuard)
export class StyleSceneController {
  constructor(private readonly scenes: StyleSceneService, private readonly authorization: AuthorizationService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: Record<string, unknown>) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.navigation(request.currentUser.id, systemCode);
    return this.scenes.list(systemCode, query);
  }

  @Get('taxonomy')
  async taxonomy(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.navigation(request.currentUser.id, systemCode);
    return this.scenes.taxonomy(systemCode);
  }

  @Get(':id')
  async detail(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.navigation(request.currentUser.id, systemCode);
    return this.scenes.detail(systemCode, id);
  }

  @Post()
  @UseGuards(WriteRequestGuard)
  async create(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'style-scene-list', 'manage');
    return this.scenes.create(systemCode, request.currentUser.account, body);
  }

  @Patch(':id')
  @UseGuards(WriteRequestGuard)
  async update(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'style-scene-list', 'manage');
    return this.scenes.update(systemCode, id, request.currentUser.account, body);
  }
}
