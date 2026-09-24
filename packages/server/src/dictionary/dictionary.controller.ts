import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AuthorizationService } from '../rbac/authorization.service';
import { DictionaryService } from './dictionary.service';

@Controller('api/systems/:systemCode/dictionaries')
@UseGuards(SessionGuard)
export class DictionaryController {
  constructor(private readonly dictionaries: DictionaryService, private readonly authorization: AuthorizationService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Query('includeDisabled') includeDisabled?: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.navigation(request.currentUser.id, systemCode);
    const canManage = includeDisabled === 'true';
    if (canManage) await this.authorization.assertAction(request.currentUser.id, systemCode, 'system-dictionaries', 'manage');
    return this.dictionaries.list(systemCode, canManage);
  }

  @Post()
  @UseGuards(WriteRequestGuard)
  async create(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'system-dictionaries', 'manage');
    return this.dictionaries.createDictionary(systemCode, request.currentUser.account, body);
  }

  @Patch(':id')
  @UseGuards(WriteRequestGuard)
  async update(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'system-dictionaries', 'manage');
    return this.dictionaries.updateDictionary(systemCode, id, request.currentUser.account, body);
  }

  @Post('items')
  @UseGuards(WriteRequestGuard)
  async createItem(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'system-dictionaries', 'manage');
    return this.dictionaries.createItem(systemCode, request.currentUser.account, body);
  }

  @Post(':dictionaryId/items/import')
  @UseGuards(WriteRequestGuard)
  async importItems(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('dictionaryId') dictionaryId: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'system-dictionaries', 'manage');
    return this.dictionaries.importItems(systemCode, dictionaryId, request.currentUser.account, body);
  }

  @Patch('items/:id')
  @UseGuards(WriteRequestGuard)
  async updateItem(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'system-dictionaries', 'manage');
    return this.dictionaries.updateItem(systemCode, id, request.currentUser.account, body);
  }
}
