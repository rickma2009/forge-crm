import type { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { organizationDictionarySeeds } from '../dictionary/organization-dictionaries.seed';

/** Add missing system-owned starter values without replacing user-maintained dictionary items or managers. */
export async function initializeOrganizationBusiness(db: DatabaseService, systemCode: string) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const app = await tx.sysApplication.findFirst({ where: { applicationCode: systemCode, status: 'ACTIVE' }, select: { tenantId: true } });
    if (!app) throw new Error(`SYSTEM_NOT_FOUND:${systemCode}`);
    let dictionaries = 0, items = 0, managers = 0;
    for (const seed of organizationDictionarySeeds) {
      let dictionary = await tx.sysDictionary.findUnique({ where: { systemCode_dictCode: { systemCode, dictCode: seed.code } } });
      if (!dictionary) {
        dictionary = await tx.sysDictionary.create({ data: { systemCode, dictCode: seed.code, dictName: seed.name, groupCode: seed.groupCode, description: seed.description, sortNo: seed.sortNo, itemsEditable: true, createdBy: 'organization-init', updatedBy: 'organization-init' } });
        dictionaries++;
      }
      for (const [index, [value, name, colorKey]] of seed.items.entries()) {
        const existing = await tx.sysDictionaryItem.findUnique({ where: { dictionaryId_itemValue: { dictionaryId: dictionary.id, itemValue: value } } });
        if (existing) continue;
        await tx.sysDictionaryItem.create({ data: { dictionaryId: dictionary.id, itemCode: value, itemValue: value, itemName: name, colorKey, sortNo: (index + 1) * 10, createdBy: 'organization-init', updatedBy: 'organization-init' } });
        items++;
      }
    }
    if (systemCode === 'demo-portal') {
      for (const [unitCode, account] of [
        ['component-bg', 'admin'], ['tv-division', 'tv.manager'], ['tv-sales-one', 'sales1.manager'],
        ['tv-sales-two', 'sales2.manager'], ['tv-sales-admin', 'sales.ops'], ['tv-rd-center', 'rd.manager'],
        ['power-division', 'power.manager'], ['finance-dept', 'finance.manager'], ['supply-chain-dept', 'supply.manager'],
      ] as const) {
        const user = await tx.iamUser.findFirst({ where: { tenantId: app.tenantId, account, employeeId: { not: null } }, select: { employeeId: true } });
        if (user?.employeeId) managers += (await tx.orgUnit.updateMany({ where: { tenantId: app.tenantId, unitCode, managerEmployeeId: null }, data: { managerEmployeeId: user.employeeId } })).count;
      }
    }
    return { systemCode, dictionaries, items, managers };
  });
}
