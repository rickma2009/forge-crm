import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { loginRequestSchema } from '@interaction-pattern-lab/contracts';
import { AuthService } from './auth.service';
import { WriteRequestGuard } from './write-request.guard';
import { SESSION_COOKIE, SessionGuard } from './session.guard';
import { SessionSigner } from './session-signer';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config';
import type { AuthenticatedRequest } from './auth.types';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly signer: SessionSigner, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  @Post('login')
  @UseGuards(WriteRequestGuard)
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const input = loginRequestSchema.parse(body);
    const user = await this.auth.authenticate(input.account, input.password);
    response.cookie(SESSION_COOKIE, this.signer.issue(user.id), { httpOnly: true, sameSite: 'lax', secure: this.config.secureCookies, path: '/', maxAge: 900_000 });
    return { account: user.account, displayName: user.displayName };
  }

  @Get('session')
  @UseGuards(SessionGuard)
  session(@Req() request: AuthenticatedRequest) { return { account: request.currentUser.account, displayName: request.currentUser.displayName }; }

  @Post('logout')
  @UseGuards(WriteRequestGuard)
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: this.config.secureCookies, path: '/' });
  }
}
