import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('quotation discount factor migration', () => {
  const sql = readFileSync(join(process.cwd(), 'prisma/migrations/20260925121000_quotation_discount_factor/migration.sql'), 'utf8');

  it('converts legacy percent-off values, changes the default, and constrains the factor', () => {
    expect(sql).toMatch(/1\s*-\s*discount\s*\/\s*100/i);
    expect(sql).toMatch(/set default 1/i);
    expect(sql).toMatch(/discount between 0 and 1/i);
    expect(sql).not.toMatch(/update\s+sd_quotation_line[\s\S]*amount\s*=/i);
  });
});
