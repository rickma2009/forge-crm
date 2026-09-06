import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  userId: string;
  issuedAt: number;
  expiresAt: number;
  keyId: string;
}

interface SigningKey { id: string; secret: string }
interface SigningKeys { current: SigningKey; previous?: SigningKey }

export const signingKey = (secret: string): SigningKey => ({
  id: createHash('sha256').update(secret).digest('hex').slice(0, 16),
  secret,
});

const encode = (value: string) => Buffer.from(value).toString('base64url');
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

export class SessionSigner {
  constructor(private readonly keys: SigningKeys) {
    if (keys.current.secret.length < 32 || (keys.previous && keys.previous.secret.length < 32)) {
      throw new Error('SESSION_SECRET_TOO_SHORT');
    }
  }

  issue(userId: string, now = new Date(), ttlSeconds = 900): string {
    const issuedAt = Math.floor(now.getTime() / 1000);
    const payload: SessionPayload = { userId, issuedAt, expiresAt: issuedAt + ttlSeconds, keyId: this.keys.current.id };
    const body = encode(JSON.stringify(payload));
    return `${body}.${this.sign(body, this.keys.current.secret)}`;
  }

  verify(token: string, now = new Date()): SessionPayload {
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra) throw new Error('INVALID_SESSION');
    let payload: SessionPayload;
    try { payload = JSON.parse(decode(body)) as SessionPayload; } catch { throw new Error('INVALID_SESSION'); }
    const key = [this.keys.current, this.keys.previous].find((candidate) => candidate?.id === payload.keyId);
    if (!key) throw new Error('INVALID_SESSION');
    const expected = this.sign(body, key.secret);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) throw new Error('INVALID_SESSION');
    if (!payload.userId || !Number.isInteger(payload.issuedAt) || !Number.isInteger(payload.expiresAt)) throw new Error('INVALID_SESSION');
    if (payload.expiresAt <= Math.floor(now.getTime() / 1000)) throw new Error('EXPIRED_SESSION');
    return payload;
  }

  private sign(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('base64url');
  }
}
