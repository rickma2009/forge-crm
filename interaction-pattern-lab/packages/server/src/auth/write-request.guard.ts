import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from '../http/api-exceptions';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config';

export const CSRF_COOKIE = 'ipl_csrf';

@Injectable()
export class WriteRequestGuard implements CanActivate {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.header('origin');
    const csrfCookie = request.cookies?.[CSRF_COOKIE] as string | undefined;
    const csrfHeader = request.header('x-csrf-token');
    if (!origin || !this.config.appOrigins.has(origin) || !csrfCookie || csrfCookie !== csrfHeader) {
      throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '请求校验失败');
    }
    return true;
  }
}
