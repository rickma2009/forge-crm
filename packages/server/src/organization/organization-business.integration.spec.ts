import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { initializeOrganizationBusiness } from './organization-defaults';
import { DictionaryService } from '../dictionary/dictionary.service';

const describeDatabase = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

describeDatabase('organization business fields database boundaries', () => {
  let db: DatabaseService;
  beforeAll(() => { db = new DatabaseService(process.env.DATABASE_URL!); });
  afterAll(async () => { await db.$disconnect(); });

  it('keeps independent organization flags and both dictionaries after repeated initialization', async () => {
    const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } });
    const sales = await db.orgUnit.findFirstOrThrow({ where: { tenantId: app.tenantId, unitCode: 'tv-sales-one' } });
    expect(sales.isSalesOrg).toBe(true);
    expect(sales.isRdOrg).toBe(false);
    expect(sales.managerEmployeeId).toBeTruthy();
    const dictionaries = await db.sysDictionary.findMany({ where: { systemCode: 'demo-portal', dictCode: { in: ['employee_post', 'employee_job_title'] } }, include: { items: true } });
    expect(dictionaries).toHaveLength(2);
    expect(dictionaries.find((item) => item.dictCode === 'employee_post')?.items.length).toBeGreaterThanOrEqual(12);
    expect(dictionaries.find((item) => item.dictCode === 'employee_job_title')?.items.length).toBeGreaterThanOrEqual(6);
    expect(await initializeOrganizationBusiness(db, 'demo-portal')).toMatchObject({ dictionaries: 0, items: 0, managers: 0 });
  });

  it('rejects a manager employee from another tenant at the database boundary', async () => {
    const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: 'demo-portal' } });
    const unit = await db.orgUnit.findFirstOrThrow({ where: { tenantId: app.tenantId, unitCode: 'tv-sales-one' } });
    const actor = randomUUID();
    await expect(db.$transaction(async (tx) => {
      const tenant = await tx.sysTenant.create({ data: { tenantCode: `fk-${randomUUID()}`, tenantName: 'FK测试租户' } });
      const foreignEmployee = await tx.orgEmployee.create({ data: { tenantId: tenant.id, employeeName: '跨租户员工', createdBy: actor, updatedBy: actor } });
      return tx.orgUnit.update({ where: { id: unit.id }, data: { managerEmployeeId: foreignEmployee.id } });
    })).rejects.toThrow();
    expect((await db.orgUnit.findUniqueOrThrow({ where: { id: unit.id } })).managerEmployeeId).toBe(unit.managerEmployeeId);
  });

  it('keeps referenced岗位 and 职位 dictionary codes stable', async () => {
    const dictionary = await db.sysDictionary.findFirstOrThrow({ where: { systemCode: 'demo-portal', dictCode: 'employee_post' }, include: { items: { take: 1 } } });
    const item = dictionary.items[0]!;
    await expect(new DictionaryService(db).updateItem('demo-portal', item.id, 'integration-test', { version: item.version, itemValue: `${item.itemValue}-renamed` })).rejects.toThrow('不能修改');
    expect((await db.sysDictionaryItem.findUniqueOrThrow({ where: { id: item.id } })).itemValue).toBe(item.itemValue);
  });
});
