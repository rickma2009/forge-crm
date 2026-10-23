import { opportunityLifecycle } from './opportunity-domain';
describe('opportunity lifecycle dates', () => {
  const today = '2026-09-29';
  it('keeps lifecycle separate from stages and accepts future forecast dates', () => {
    expect(opportunityLifecycle({ businessStatus: 'FOLLOWING', expectedSignDate: '2026-10-05' }, today)).toEqual({ businessStatus: 'FOLLOWING', signedDate: null, lostDate: null });
    expect(opportunityLifecycle({}, today).businessStatus).toBe('INITIAL');
  });
  it.each(['INITIAL', 'FOLLOWING', 'VOID', 'LOST'])('rejects past or today forecast dates for unsigned %s', businessStatus => {
    expect(() => opportunityLifecycle({ businessStatus, lostDate: '2026-09-01', expectedSignDate: today }, today)).toThrow('预签日期');
  });
  it('requires a historical signing date and clears unrelated loss dates', () => {
    expect(() => opportunityLifecycle({ businessStatus: 'SIGNED' }, today)).toThrow('签约日期');
    expect(() => opportunityLifecycle({ businessStatus: 'SIGNED', signedDate: today }, today)).toThrow('签约日期');
    expect(opportunityLifecycle({ businessStatus: 'SIGNED', signedDate: '2026-08-10', lostDate: '2026-08-01', expectedSignDate: '2026-08-10' }, today)).toEqual({ businessStatus: 'SIGNED', signedDate: '2026-08-10', lostDate: null });
  });
  it('requires a loss date, rejects future loss dates and clears closure dates on reopening', () => {
    expect(() => opportunityLifecycle({ businessStatus: 'LOST' }, today)).toThrow('丢单日期');
    expect(() => opportunityLifecycle({ businessStatus: 'LOST', lostDate: '2026-10-01' }, today)).toThrow('丢单日期');
    expect(opportunityLifecycle({ businessStatus: 'LOST', lostDate: today, signedDate: '2026-08-01' }, today).signedDate).toBeNull();
    expect(opportunityLifecycle({ businessStatus: 'FOLLOWING', signedDate: '2026-08-01', lostDate: '2026-08-02', expectedSignDate: '2027-01-10' }, today)).toEqual({ businessStatus: 'FOLLOWING', signedDate: null, lostDate: null });
  });
});
