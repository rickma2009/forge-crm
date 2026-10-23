import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { systemCodeSchema } from '@forge-crm/contracts';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { FavoriteService } from './favorite.service';

@Controller('api/systems/:systemCode/favorites')
@UseGuards(SessionGuard)
export class FavoriteController {
  constructor(private readonly favorites: FavoriteService) {}
  @Get() list(@Req() request: AuthenticatedRequest, @Param('systemCode') rawCode: string) {
    return this.favorites.list(systemCodeSchema.parse(rawCode), request.currentUser.id);
  }
  @Post() @UseGuards(WriteRequestGuard) add(@Req() request: AuthenticatedRequest, @Param('systemCode') rawCode: string, @Body() body: unknown) {
    return this.favorites.add(systemCodeSchema.parse(rawCode), request.currentUser.id, body);
  }
  @Delete(':favoriteId') @UseGuards(WriteRequestGuard) remove(@Req() request: AuthenticatedRequest, @Param('systemCode') rawCode: string, @Param('favoriteId') rawId: string) {
    return this.favorites.remove(systemCodeSchema.parse(rawCode), request.currentUser.id, z.string().uuid().parse(rawId));
  }
}
