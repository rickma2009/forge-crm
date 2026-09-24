import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('opportunity database definition', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(join(process.cwd(), 'prisma/migrations/20260923110000_opportunity_management/migration.sql'), 'utf8');

  it.each(['md_product', 'sd_competitor', 'sd_opp_template', 'sd_opp_stage', 'sd_opp', 'sd_opp_product', 'sd_opp_follow_up', 'sd_opp_analysis', 'sd_opp_analysis_competitor'])('defines %s with the approved physical name', (table) => {
    expect(table.length).toBeLessThanOrEqual(32);
    expect(schema).toContain(`@@map("${table}")`);
    expect(migration).toContain(`"${table}"`);
  });

  it('enforces stage probability and opportunity confidence percentages', () => {
    expect(migration).toContain('sd_opp_stage_probability_check');
    expect(migration).toContain('sd_opp_confidence_check');
  });

  it('enforces one default template and stage per scope', () => {
    expect(migration).toContain('sd_opp_template_default_key');
    expect(migration).toContain('sd_opp_stage_default_key');
  });
});
