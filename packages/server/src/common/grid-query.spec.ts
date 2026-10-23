import { columnFiltersSchema, gridWhere } from './grid-query';
describe('server grid predicates', () => {
  it('combines typed independent filters and matches dates over the whole day', () => {
    expect(gridWhere({ code: 'X', active: 'false', date: '2026-09-28', type: 'PRODUCT' }, { code: 'text', active: 'boolean', date: 'date', type: ['PRODUCT'] })).toEqual([{ code: { contains: 'X', mode: 'insensitive' } }, { active: false }, { date: { gte: new Date('2026-09-28T00:00:00Z'), lt: new Date('2026-09-29T00:00:00Z') } }, { type: 'PRODUCT' }]);
  });
  it('rejects malformed JSON, arbitrary fields and invalid typed values', () => {
    expect(() => columnFiltersSchema.parse('{broken')).toThrow();
    expect(() => gridWhere({ tenantId: 'foreign' }, { code: 'text' })).toThrow();
    expect(() => gridWhere({ active: 'yes' }, { active: 'boolean' })).toThrow();
    expect(() => gridWhere({ type: 'NOT_A_TYPE' }, { type: ['PRODUCT'] })).toThrow();
  });
});
