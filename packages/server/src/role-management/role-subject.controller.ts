import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { z } from 'zod';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { RoleSubjectService } from './role-subject.service';

@Controller('api/systems/:systemCode/role-subjects')
@UseGuards(SessionGuard)
export class RoleSubjectController {
  constructor(private readonly subjects: RoleSubjectService, private readonly authorization: AuthorizationService) {}
  private id(raw: string) { return z.string().uuid().parse(raw); }
  private async authorize(req: AuthenticatedRequest, raw: string, permission: string) {
    const code = systemCodeSchema.parse(raw);
    await this.authorization.assertPermission(req.currentUser.id, code, permission);
    return code;
  }
  @Get('catalog')
  async catalog(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string) {
    return this.subjects.catalog(await this.authorize(req, raw, 'access.role.view'));
  }
  @Post('groups')
  @UseGuards(WriteRequestGuard)
  async group(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Body() body: unknown) {
    return this.subjects.saveGroup(await this.authorize(req, raw, 'access.resource-menu.manage'), req.currentUser.id, body, String(res.locals.requestId));
  }
  @Get('sources/:kind/:sourceId/members')
  async members(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('kind') kind: string, @Param('sourceId') id: string) {
    return this.subjects.members(await this.authorize(req, raw, 'access.role.view'), kind, this.id(id));
  }
  @Post('sources/:kind/:sourceId/members')
  @UseGuards(WriteRequestGuard)
  async add(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('kind') kind: string, @Param('sourceId') id: string, @Body() body: unknown) {
    const subjectKind = z.enum(['organization', 'group']).parse(kind);
    const code = await this.authorize(req, raw, subjectKind === 'organization' ? 'organization.unit.manage' : 'access.resource-menu.manage');
    return this.subjects.addMembers(code, subjectKind, this.id(id), req.currentUser.id, body, String(res.locals.requestId));
  }
  @Post('sources/:kind/:sourceId/members/end')
  @UseGuards(WriteRequestGuard)
  async end(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('kind') kind: string, @Param('sourceId') id: string, @Body() body: unknown) {
    const subjectKind = z.enum(['organization', 'group']).parse(kind);
    const code = await this.authorize(req, raw, subjectKind === 'organization' ? 'organization.unit.manage' : 'access.resource-menu.manage');
    return this.subjects.endMembers(code, subjectKind, this.id(id), req.currentUser.id, body, String(res.locals.requestId));
  }
  @Get('roles/:roleId')
  async bindings(@Req() req: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('roleId') id: string) {
    return this.subjects.bindings(await this.authorize(req, raw, 'access.role.view'), this.id(id));
  }
  @Post('roles/:roleId')
  @UseGuards(WriteRequestGuard)
  async bind(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') id: string, @Body() body: unknown) {
    return this.subjects.bind(await this.authorize(req, raw, 'access.role.member.manage'), this.id(id), req.currentUser.id, body, String(res.locals.requestId));
  }
  @Post('roles/:roleId/end')
  @UseGuards(WriteRequestGuard)
  async unbind(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Param('systemCode') raw: string, @Param('roleId') id: string, @Body() body: unknown) {
    return this.subjects.unbind(await this.authorize(req, raw, 'access.role.member.manage'), this.id(id), req.currentUser.id, body, String(res.locals.requestId));
  }
}
