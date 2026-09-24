import { SessionSigner, signingKey } from './session-signer';

describe('SessionSigner public contract', () => {
  const signer = new SessionSigner({ current: { id: 'current', secret: '0123456789abcdef0123456789abcdef' } });

  it('issues and verifies a bounded session without account or role data', () => {
    const token = signer.issue('user-1', new Date('2026-09-03T00:00:00Z'), 900);
    const payload = signer.verify(token, new Date('2026-09-03T00:01:00Z'));

    expect(payload).toMatchObject({ userId: 'user-1', keyId: 'current' });
    expect(JSON.stringify(payload)).not.toContain('admin');
  });

  it('rejects tampering and expiry', () => {
    const token = signer.issue('user-1', new Date('2026-09-03T00:00:00Z'), 60);

    expect(() => signer.verify(`${token}x`, new Date('2026-09-03T00:00:01Z'))).toThrow('INVALID_SESSION');
    expect(() => signer.verify(token, new Date('2026-09-03T00:02:00Z'))).toThrow('EXPIRED_SESSION');
  });

  it('accepts a token signed by the previous key after rotation', () => {
    const previousSecret = 'previous-session-secret-00000000000';
    const nextSecret = 'next-session-secret-000000000000000';
    const token = new SessionSigner({ current: signingKey(previousSecret) }).issue('user-1');
    const rotated = new SessionSigner({ current: signingKey(nextSecret), previous: signingKey(previousSecret) });

    expect(rotated.verify(token).userId).toBe('user-1');
  });
});
