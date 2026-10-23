import { Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter diagnostics', () => {
  it('logs an unexpected exception with the response request id while returning a redacted 503', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { locals: { requestId: 'req-quote-save' }, status };
    const request = { header: jest.fn(), method: 'PATCH', originalUrl: '/api/systems/demo-portal/quotations/id' };
    const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }) } as unknown as ArgumentsHost;
    const error = Object.assign(new Error('foreign key violation'), { code: '23503' });
    const log = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    new ApiExceptionFilter().catch(error, host);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('req-quote-save'), error.stack, 'ApiExceptionFilter');
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ code: 'SERVICE_UNAVAILABLE', message: '服务暂时不可用', requestId: 'req-quote-save' });
    log.mockRestore();
  });
});
