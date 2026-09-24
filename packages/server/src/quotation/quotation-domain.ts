import { quotationExpired } from '@interaction-pattern-lab/contracts';
import { ApiException } from '../http/api-exceptions';

export function quoteObjectWhere(actorId: string, systemRole: boolean): { ownerUserId?: string } { return systemRole ? {} : { ownerUserId: actorId }; }
export function assertQuoteTransition(status: string, action: string, validUntil: string, now = new Date()): string {
  const expected = action === 'submit' ? 'DRAFT' : 'SUBMITTED';
  const next = ({ submit: 'SUBMITTED', accept: 'ACCEPTED', reject: 'REJECTED' } as Record<string, string>)[action];
  if (!next || status !== expected) throw new ApiException('BAD_REQUEST', 409, '当前状态不允许此操作');
  if (quotationExpired(validUntil, now)) throw new ApiException('BAD_REQUEST', 409, '报价已超过有效期');
  return next;
}
