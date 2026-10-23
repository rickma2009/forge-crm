import type { Prisma } from '../generated/prisma/client';

export const itemReferenceDictionarySeeds = [
  { code: 'item_source', name: '物料来源', groupCode: 'inventory', description: '物料的采购或加工来源', sortNo: 240, itemsEditable: true, items: [['PURCHASED', '外购', 'blue'], ['SELF_MANUFACTURED', '自制', 'green'], ['OUTSOURCED_PROCESSING', '委外加工', 'purple']] },
  { code: 'item_lifecycle', name: '物料生命周期阶段', groupCode: 'inventory', description: '物料当前生命周期阶段', sortNo: 250, itemsEditable: true, items: [['INITIAL', '初始', 'gray'], ['SAMPLE', '样品', 'purple'], ['TRIAL_PRODUCTION', '试产', 'blue'], ['SMALL_BATCH', '小批量', 'orange'], ['MASS_PRODUCTION', '批量', 'green'], ['PHASE_OUT', '即将退市', 'orange'], ['DISCONTINUED', '已退市', 'gray'], ['VOIDED', '已作废', 'red']] },
] as const;

/** Seeds missing dictionary values without overwriting administrator-maintained values. */
export async function initializeItemReferenceDictionaries(tx: Prisma.TransactionClient, systemCode: string) {
  const actor = 'item-reference-dictionary-init';
  let changes = 0;
  for (const seed of itemReferenceDictionarySeeds) {
    let dictionary = await tx.sysDictionary.findUnique({ where: { systemCode_dictCode: { systemCode, dictCode: seed.code } } });
    if (!dictionary) {
      dictionary = await tx.sysDictionary.create({ data: { systemCode, dictCode: seed.code, dictName: seed.name, groupCode: seed.groupCode, description: seed.description, sortNo: seed.sortNo, itemsEditable: seed.itemsEditable, createdBy: actor, updatedBy: actor } });
      changes++;
    }
    for (const [index, [itemValue, itemName, colorKey]] of seed.items.entries()) {
      const existing = await tx.sysDictionaryItem.findUnique({ where: { dictionaryId_itemValue: { dictionaryId: dictionary.id, itemValue } } });
      if (!existing) {
        await tx.sysDictionaryItem.create({ data: { dictionaryId: dictionary.id, itemCode: itemValue, itemValue, itemName, colorKey, sortNo: (index + 1) * 10, createdBy: actor, updatedBy: actor } });
        changes++;
      }
    }
  }
  return { systemCode, changes };
}
