import { HttpException, HttpStatus } from '@nestjs/common';

export type ApiErrorCode = 'BAD_REQUEST' | 'UNAUTHENTICATED' | 'ACCOUNT_LOCKED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVICE_UNAVAILABLE';

export class ApiException extends HttpException {
  constructor(public readonly code: ApiErrorCode, status: HttpStatus | number, message: string, details?: Record<string, unknown>) {
    super({ code, message, ...(details ? { details } : {}) }, status);
  }
}
