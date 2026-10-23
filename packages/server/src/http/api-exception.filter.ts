import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = typeof response.locals.requestId === 'string' ? response.locals.requestId : request.header('x-request-id')?.slice(0, 128) || randomUUID();
    const conflict = !!exception && typeof exception === 'object' && 'code' in exception && ['P2034', 'P2002'].includes(String(exception.code));
    const status = conflict ? HttpStatus.CONFLICT : exception instanceof ZodError ? HttpStatus.BAD_REQUEST : exception instanceof HttpException ? exception.getStatus() : HttpStatus.SERVICE_UNAVAILABLE;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof raw === 'object' && raw && 'code' in raw
      ? raw as { code: string; message: string }
      : { code: status === 400 || conflict ? 'BAD_REQUEST' : 'SERVICE_UNAVAILABLE', message: conflict ? '数据已被修改或存在重复，请刷新后重试；本次未部分保存' : status === 400 ? '请求参数无效' : '服务暂时不可用' };
    if (status === HttpStatus.SERVICE_UNAVAILABLE && !(exception instanceof HttpException)) {
      const error = exception instanceof Error ? exception : new Error(String(exception));
      const code = exception && typeof exception === 'object' && 'code' in exception ? String(exception.code) : undefined;
      Logger.error(JSON.stringify({ event: 'unhandled_http_exception', requestId, method: request.method, path: request.originalUrl, name: error.name, code, message: error.message }), error.stack, 'ApiExceptionFilter');
    }
    response.locals.errorCode = body.code;
    response.status(status).json({ code: body.code, message: body.message, requestId });
  }
}
