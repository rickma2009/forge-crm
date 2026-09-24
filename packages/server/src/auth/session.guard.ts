import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../http/api-exceptions';
import { AuthService } from './auth.service';
import { SessionSigner } from './session-signer';
import type { AuthenticatedRequest } from './auth.types';

export const SESSION_COOKIE = 'ipl_session';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly signer: SessionSigner, private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) throw new ApiException('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, '请先登录');
    let payload: { userId: string };
    try {
      payload = this.signer.verify(token);
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, '登录已失效');
    }
    request.currentUser = await this.auth.loadActiveUser(payload.userId);
    return true;
  }
}
