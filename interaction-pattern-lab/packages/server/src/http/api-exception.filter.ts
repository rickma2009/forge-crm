import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = typeof response.locals.requestId === 'string' ? response.locals.requestId : request.header('x-request-id')?.slice(0, 128) || randomUUID();
    const status = exception instanceof ZodError ? HttpStatus.BAD_REQUEST : exception instanceof HttpException ? exception.getStatus() : HttpStatus.SERVICE_UNAVAILABLE;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof raw === 'object' && raw && 'code' in raw
      ? raw as { code: string; message: string }
      : { code: status === 400 ? 'BAD_REQUEST' : 'SERVICE_UNAVAILABLE', message: status === 400 ? '请求参数无效' : '服务暂时不可用' };
    response.locals.errorCode = body.code;
    response.status(status).json({ code: body.code, message: body.message, requestId });
  }
}
