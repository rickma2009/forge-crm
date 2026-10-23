import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('quotation md_item authority migration', () => {
  const path = join(process.cwd(), 'prisma/migrations/20260925133000_drop_legacy_product_fks/migration.sql');

  it('removes every legacy md_product foreign key without deleting data', () => {
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, 'utf8');
    expect(sql).toMatch(/alter table\s+"?sd_quotation_line"?\s+drop constraint if exists\s+"?sd_quote_line_product_fk"?/i);
    expect(sql).toMatch(/alter table\s+"?sd_product_price"?\s+drop constraint if exists\s+"?sd_price_product_fk"?/i);
    expect(sql).toMatch(/alter table\s+"?sd_opp_product"?\s+drop constraint if exists\s+"?sd_opp_product_product_fkey"?/i);
    expect(sql).not.toMatch(/\b(delete|truncate|drop\s+table)\b/i);
  });
});
