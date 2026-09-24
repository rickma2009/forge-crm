import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { initializeWarehouseDictionaries, warehouseDictionarySeeds } from './warehouse-dictionaries.seed';
const describeDb = process.env.RUN_WAREHOUSE_DB_TESTS === '1' ? describe : describe.skip;
describeDb('warehouse dictionary initialization (PostgreSQL)', () => {
  const db = new DatabaseService(process.env.DATABASE_URL!);
  afterAll(async () => db.$disconnect());
  it('creates exact presets, preserves custom changes, retires seed-only old values, and is idempotent', async () => {
    const systemCode = `wd-${randomUUID().slice(0, 8)}`;
    const rollback = new Error('test rollback');
    await expect(db.$transaction(async (tx) => {
      const old = await tx.sysDictionary.create({ data: { systemCode, dictCode: 'warehouse_nature', dictName: '仓库性质', createdBy: 'seed', updatedBy: 'seed' } });
      await tx.sysDictionaryItem.create({ data: { dictionaryId: old.id, itemCode: 'PHYSICAL', itemValue: 'PHYSICAL', itemName: '实体仓', createdBy: 'seed', updatedBy: 'seed' } });
      expect((await initializeWarehouseDictionaries(tx, systemCode)).changes).toBeGreaterThan(0);
      const rows = await tx.sysDictionary.findMany({ where: { systemCode }, include: { items: { orderBy: { sortNo: 'asc' } } } });
      for (const seed of warehouseDictionarySeeds) expect(rows.find((r) => r.dictCode === seed.code)!.items.filter((i) => i.status === 'ACTIVE').map((i) => i.itemName)).toEqual(seed.items.map((i) => i[1]));
      expect(rows.find((r) => r.dictCode === 'warehouse_nature')!.items.find((i) => i.itemValue === 'PHYSICAL')!.status).toBe('DISABLED');
      const owned = rows.flatMap((r) => r.items).find((i) => i.itemValue === 'OWNED')!;
      await tx.sysDictionaryItem.update({ where: { id: owned.id }, data: { itemName: '自定义自有仓', status: 'DISABLED', updatedBy: 'admin' } });
      expect((await initializeWarehouseDictionaries(tx, systemCode)).changes).toBe(0);
      expect(await tx.sysDictionaryItem.findUnique({ where: { id: owned.id } })).toMatchObject({ itemName: '自定义自有仓', status: 'DISABLED' });
      expect(await tx.sysDictionary.count({ where: { systemCode: `${systemCode}-other` } })).toBe(0);
      throw rollback;
    })).rejects.toBe(rollback);
    expect(await db.sysDictionary.count({ where: { systemCode } })).toBe(0);
  });
});
