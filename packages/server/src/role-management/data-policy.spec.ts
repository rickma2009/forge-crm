import { compileCondition, dataPolicySchema, redactFields, combinePolicyWhere, matchesPolicyWhere } from './data-policy';

describe('data policy public contract and evaluation', () => {
  const field = { code: 'customerName', type: 'string' as const, filterable: true };
  it('rejects empty implicit allow, unknown fields, raw scripts and excessive nesting', () => {
    expect(dataPolicySchema.safeParse({ rules: [{ name: 'empty', effect: 'ALLOW', enabled: true, condition: { kind: 'group', mode: 'ALL', children: [] } }], fields: [] }).success).toBe(false);
    expect(() => compileCondition({ kind: 'condition', field: 'passwordHash', operator: 'eq', value: 'x', source: 'literal' }, [field], { userId: 'u' })).toThrow();
    expect(() => compileCondition({ kind: 'condition', field: 'customerName', operator: 'sql', value: '1=1' }, [field], { userId: 'u' })).toThrow();
  });
  it('compiles only whitelisted operators and explicit user context', () => {
    expect(compileCondition({ kind: 'condition', field: 'customerName', operator: 'eq', source: 'literal', value: 'ACME' }, [field], { userId: 'u' })).toEqual({ customerName: { equals: 'ACME' } });
    expect(() => compileCondition({ kind: 'condition', field: 'customerName', operator: 'eq', source: 'context', value: 'request.query' }, [field], { userId: 'u' })).toThrow();
  });
  it('denies by default and combines allows with OR, denies with NOT', () => {
    expect(combinePolicyWhere([])).toEqual({ id: { in: [] } });
    expect(combinePolicyWhere([{ effect: 'ALLOW', where: { categoryValue: 'a' } }, { effect: 'ALLOW', where: { categoryValue: 'b' } }, { effect: 'DENY', where: { statusValue: 'archived' } }])).toEqual({ AND: [{ OR: [{ categoryValue: 'a' }, { categoryValue: 'b' }] }, { NOT: { OR: [{ statusValue: 'archived' }] } }] });
  });
  it('omits hidden raw values and applies restrictive field merging', () => {
    expect(redactFields({ customerName: 'ACME', mobile: '13800138000', remark: 'secret' }, [
      { field: 'mobile', visible: true, writable: false, exportable: true, mask: 'PHONE' },
      { field: 'remark', visible: false, writable: false, exportable: false, mask: 'NONE' },
      { field: 'mobile', visible: true, writable: false, exportable: true, mask: 'NONE' },
    ], false)).toEqual({ customerName: 'ACME', mobile: '138****8000' });
  });
  it('checks new and changed records against the same allow/deny expression', () => {
    const where = combinePolicyWhere([{ effect: 'ALLOW', where: { categoryValue: { equals: 'formal' } } }, { effect: 'DENY', where: { statusValue: { equals: 'archived' } } }]);
    expect(matchesPolicyWhere({ categoryValue: 'formal', statusValue: 'active' }, where)).toBe(true);
    expect(matchesPolicyWhere({ categoryValue: 'formal', statusValue: 'archived' }, where)).toBe(false);
    expect(matchesPolicyWhere({ categoryValue: 'partner', statusValue: 'active' }, where)).toBe(false);
    expect(matchesPolicyWhere({}, { OR: [] })).toBe(false);
  });
});
