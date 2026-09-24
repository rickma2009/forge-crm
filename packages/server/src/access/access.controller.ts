import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import type { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { AccessService } from './access.service';

@Controller('api/systems/:systemCode/access')
@UseGuards(SessionGuard)
export class AccessController {
  constructor(private readonly access: AccessService, private readonly authorization: AuthorizationService) {}
  private system(raw: string) { return systemCodeSchema.parse(raw); }
  private requestId(response: Response) { return String(response.locals.requestId ?? 'unknown'); }

  @Get('users') async users(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.user.view'); return this.access.listUsers(code, query); }
  @Get('users/:userId') async user(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('userId') id: string) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.user.view'); return this.access.getUser(code, id); }
  @Patch('users/:userId/status') @UseGuards(WriteRequestGuard) async userStatus(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('userId') id: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.user.status.manage'); return this.access.setUserStatus(code, id, req.currentUser.id, this.requestId(res), body); }

  @Get('roles') async roles(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.view'); return this.access.listRoles(code, query); }
  @Post('roles') @UseGuards(WriteRequestGuard) async createRole(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.create'); return this.access.createRole(code, req.currentUser.id, this.requestId(res), body); }
  @Patch('roles/:roleId') @UseGuards(WriteRequestGuard) async updateRole(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') id: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.update'); return this.access.updateRole(code, id, req.currentUser.id, this.requestId(res), body); }
  @Patch('roles/:roleId/status') @UseGuards(WriteRequestGuard) async roleStatus(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') id: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.status.manage'); return this.access.setRoleStatus(code, id, req.currentUser.id, this.requestId(res), body); }
  @Get('roles/:roleId/members') async members(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('roleId') id: string) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.view'); return this.access.listMembers(code, id); }
  @Post('roles/:roleId/members') @UseGuards(WriteRequestGuard) async addMember(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') id: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.member.manage'); return this.access.addMember(code, id, req.currentUser.id, this.requestId(res), body); }
  @Post('roles/:roleId/members/batch') @UseGuards(WriteRequestGuard) async batchMembers(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') id: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.member.manage'); return this.access.batchMembers(code, id, req.currentUser.id, this.requestId(res), body); }
  @Patch('roles/:roleId/members/:membershipId/end') @UseGuards(WriteRequestGuard) async endMember(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') roleId: string, @Param('membershipId') membershipId: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.member.manage'); return this.access.endMember(code, roleId, membershipId, req.currentUser.id, this.requestId(res), body); }

  @Get('permissions') async permissions(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.permission.view'); return this.access.listPermissions(code, query); }
  @Get('roles/:roleId/permissions') async rolePermissions(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('roleId') id: string) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.view'); return this.access.rolePermissions(code, id); }
  @Put('roles/:roleId/permissions') @UseGuards(WriteRequestGuard) async replacePermissions(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') id: string, @Body() body: unknown) { const code = this.system(raw); await this.authorization.assertPermission(req.currentUser.id, code, 'access.role.permission.assign'); return this.access.replaceRolePermissions(code, id, req.currentUser.id, this.requestId(res), body); }
}
