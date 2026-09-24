import type { Prisma } from '../generated/prisma/client';

/** Shared by fresh installations and the targeted, non-destructive upgrade. */
export const warehouseDictionarySeeds = [
  { code: 'warehouse_type', name: '仓库类型', groupCode: 'inventory', description: '仓库按保管对象分类', sortNo: 210, itemsEditable: true,
    items: [['RAW_MATERIAL', '原材料仓', 'blue'], ['FINISHED_GOODS', '成品仓', 'green'], ['SAMPLE', '样品仓', 'purple'], ['SCRAP', '报废仓', 'gray']] },
  { code: 'warehouse_nature', name: '仓库性质', groupCode: 'inventory', description: '仓库所有权或逻辑性质', sortNo: 220, itemsEditable: true,
    items: [['OWNED', '自有仓', 'green'], ['VIRTUAL', '虚拟仓', 'purple'], ['IN_TRANSIT', '在途仓', 'orange']] },
] as const;

/** Call within a transaction. Existing user configuration and warehouse rows are never overwritten. */
export async function initializeWarehouseDictionaries(tx: Prisma.TransactionClient, systemCode: string) {
  const actor = 'warehouse-dictionary-init';
  let changes = 0;
  for (const seed of warehouseDictionarySeeds) {
    let dictionary = await tx.sysDictionary.findUnique({ where: { systemCode_dictCode: { systemCode, dictCode: seed.code } } });
    if (!dictionary) {
      dictionary = await tx.sysDictionary.create({ data: { systemCode, dictCode: seed.code, dictName: seed.name, groupCode: seed.groupCode, description: seed.description, sortNo: seed.sortNo, itemsEditable: true, createdBy: actor, updatedBy: actor } });
      changes++;
    }
    for (const [index, [itemValue, itemName, colorKey]] of seed.items.entries()) {
      const existing = await tx.sysDictionaryItem.findUnique({ where: { dictionaryId_itemValue: { dictionaryId: dictionary.id, itemValue } } });
      if (!existing) {
        await tx.sysDictionaryItem.create({ data: { dictionaryId: dictionary.id, itemCode: itemValue, itemValue, itemName, colorKey, sortNo: (index + 1) * 10, createdBy: actor, updatedBy: actor } });
        changes++;
      } else if (existing.updatedBy === 'seed' && existing.sortNo !== (index + 1) * 10) {
        await tx.sysDictionaryItem.update({ where: { id: existing.id }, data: { sortNo: (index + 1) * 10, updatedBy: actor, version: { increment: 1 } } });
        changes++;
      }
    }
    const obsoleteValue = seed.code === 'warehouse_type' ? 'WIP' : 'PHYSICAL';
    const obsolete = await tx.sysDictionaryItem.updateMany({ where: { dictionaryId: dictionary.id, itemValue: obsoleteValue, updatedBy: 'seed', status: 'ACTIVE' }, data: { status: 'DISABLED', updatedBy: actor, version: { increment: 1 } } });
    changes += obsolete.count;
  }
  return { systemCode, changes };
}
