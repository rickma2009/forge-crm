import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('inventory database definition', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  it.each([
    ['MdItem', 'md_item'],
    ['OrgLegalEntity', 'org_legal_entity'],
    ['ScmWarehouse', 'scm_warehouse'],
    ['ScmInboundOrder', 'scm_inbound_order'],
    ['ScmInboundLine', 'scm_inbound_line'],
    ['ScmInventoryBalance', 'scm_inventory_balance'],
    ['ScmInventoryTxn', 'scm_inventory_txn'],
    ['ScmInventoryEvent', 'scm_inventory_event'],
  ])('declares %s mapped to %s', (model, table) => {
    expect(schema).toContain(`model ${model}`);
    expect(schema).toContain(`@@map("${table}")`);
  });

  it('stores the item id reference and keeps item_code as a business snapshot', () => {
    expect(schema).toContain('itemId');
    expect(schema).toContain('itemCode');
    expect(schema).toContain('@@unique([tenantId, itemCode]');
  });
});
