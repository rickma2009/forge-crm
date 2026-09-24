import { assertQuoteTransition, quoteObjectWhere } from './quotation-domain';

describe('quotation lifecycle and object scope', () => {
  it('cannot accept a draft or a quote at the Shanghai cutoff', () => {
    expect(() => assertQuoteTransition('DRAFT', 'accept', '2026-09-23', new Date('2026-09-22T00:00:00Z'))).toThrow();
    expect(() => assertQuoteTransition('SUBMITTED', 'accept', '2026-09-23', new Date('2026-09-23T16:00:00Z'))).toThrow();
    expect(assertQuoteTransition('SUBMITTED', 'accept', '2026-09-23', new Date('2026-09-23T15:59:59Z'))).toBe('ACCEPTED');
  });
  it('never reopens terminal quotes', () => {
    for (const state of ['ACCEPTED', 'REJECTED', 'EXPIRED']) for (const action of ['submit', 'accept', 'reject']) expect(() => assertQuoteTransition(state, action, '2099-01-01')).toThrow();
  });
  it('restricts ordinary users to their records without an account name bypass', () => {
    expect(quoteObjectWhere('admin', false)).toEqual({ ownerUserId: 'admin' });
    expect(quoteObjectWhere('user', true)).toEqual({});
  });
});
