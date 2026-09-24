import type { ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';
import { SessionSigner } from './session-signer';

describe('SessionGuard', () => {
  it('does not disguise an identity-store outage as an expired session', async () => {
    const outage = new Error('database unavailable');
    const signer = { verify: jest.fn().mockReturnValue({ userId: 'user-1' }) } as unknown as SessionSigner;
    const auth = { loadActiveUser: jest.fn().mockRejectedValue(outage) } as unknown as AuthService;
    const request = { cookies: { ipl_session: 'valid-signed-token' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;

    await expect(new SessionGuard(signer, auth).canActivate(context)).rejects.toBe(outage);
  });
});
