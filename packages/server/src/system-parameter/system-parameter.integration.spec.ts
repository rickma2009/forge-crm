import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { InventoryDefaultsService } from '../inventory/inventory-defaults.service';
import { randomUUID } from 'node:crypto';
import { parameterListSchema, parameterUpdateSchema } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { initializeParameters } from './parameter-defaults';
import { SystemParameterService } from './system-parameter.service';

const run = process.env.RUN_PARAMETER_DB_TESTS === '1' ? describe : describe.skip;
run('system parameters — real PostgreSQL', () => {
  let db: DatabaseService, service: SystemParameterService, defaults: InventoryDefaultsService;
  const tenant = randomUUID(), foreignTenant = randomUUID(), application = randomUUID(), secondApplication = randomUUID();
  const prefix = `param-test-${randomUUID().slice(0, 8)}`, code = prefix, secondCode = `${prefix}-other`;
  const actor = { id: randomUUID(), account: 'parameter-test' };
  let legalId: string, warehouseId: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('LOCAL_PARAMETER_TEST_DATABASE_REQUIRED');
    db = new DatabaseService(url.toString()); service = new SystemParameterService(db); defaults = new InventoryDefaultsService(db, service);
    await db.sysTenant.createMany({ data: [{ id: tenant, tenantCode: prefix, tenantName: '参数测试租户' }, { id: foreignTenant, tenantCode: `${prefix}-foreign`, tenantName: '隔离测试租户' }] });
    await db.sysApplication.createMany({ data: [{ id: application, tenantId: tenant, applicationCode: code, applicationName: '参数测试应用' }, { id: secondApplication, tenantId: tenant, applicationCode: secondCode, applicationName: '另一应用' }] });
    const org = await db.orgUnit.create({ data: { tenantId: tenant, unitCode: 'ROOT', unitName: '测试组织', unitType: 'COMPANY', createdBy: actor.id, updatedBy: actor.id } });
    const other = await db.orgUnit.create({ data: { tenantId: foreignTenant, unitCode: 'ROOT', unitName: '另一租户组织', unitType: 'COMPANY', createdBy: actor.id, updatedBy: actor.id } });
    const legal = (tenantId: string, orgUnitId: string, entityCode: string) => db.orgLegalEntity.create({ data: { tenantId, orgUnitId, entityCode, entityName: entityCode, createdBy: actor.account, updatedBy: actor.account } });
    legalId = (await legal(tenant, org.id, '法人甲')).id; await legal(tenant, org.id, '法人乙'); await legal(foreignTenant, other.id, '其他租户法人');
    warehouseId = (await db.scmWarehouse.create({ data: { tenantId: tenant, legalEntityId: legalId, warehouseCode: 'WH01', warehouseName: '甲仓库', warehouseType: 'OWN', warehouseNature: 'NORMAL', createdBy: actor.account, updatedBy: actor.account } })).id;
    await db.$transaction((tx) => initializeParameters(tx, [code, secondCode]));
  });
  beforeEach(async () => {
    await db.sysParameter.updateMany({ where: { tenantId: tenant }, data: { value: null, status: 'ACTIVE', version: 1 } });
    await db.orgLegalEntity.updateMany({ where: { tenantId: tenant }, data: { status: 'ACTIVE' } });
    await db.scmWarehouse.updateMany({ where: { tenantId: tenant }, data: { status: 'ACTIVE' } });
  });
  afterAll(async () => {
    if (!db) return;
    await db.sysAuditLog.deleteMany({ where: { tenantId: tenant } });
    await db.sysParameter.deleteMany({ where: { tenantId: tenant } });
    await db.scmWarehouse.deleteMany({ where: { tenantId: tenant } });
    await db.orgLegalEntity.deleteMany({ where: { tenantId: { in: [tenant, foreignTenant] } } });
    await db.orgUnit.deleteMany({ where: { tenantId: { in: [tenant, foreignTenant] } } });
    await db.sysApplication.deleteMany({ where: { tenantId: tenant } });
    await db.sysTenant.deleteMany({ where: { id: { in: [tenant, foreignTenant] } } });
    await db.$disconnect();
  });
  const row = async (parameterCode: string) => db.sysParameter.findFirstOrThrow({ where: { applicationId: application, parameterCode } });
  const set = async (parameterCode: string, value: string | null, status: 'ACTIVE' | 'DISABLED' = 'ACTIVE') => { const r = await row(parameterCode); return service.update(code, r.id, actor, { value, status, version: r.version }); };
  const configure = async () => { await set('DEFAULT_LEGAL_ENTITY', '法人甲'); await set('DEFAULT_WAREHOUSE', 'WH01'); };

  it('initializes two empty presets and preserves existing text/status on repeated initialization', async () => {
    expect(parameterListSchema.parse(await service.list(code, {})).items).toHaveLength(2);
    expect(await defaults.getDefaults(code)).toEqual({ legalEntityId: null, warehouseId: null });
    await set('DEFAULT_LEGAL_ENTITY', 'any value', 'DISABLED');
    const before = await row('DEFAULT_LEGAL_ENTITY');
    await db.$transaction((tx) => initializeParameters(tx, [code, secondCode]));
    expect(await row('DEFAULT_LEGAL_ENTITY')).toEqual(before);
  });
  it('enforces unique parameter keys and a same-tenant application foreign key', async () => {
    const current = await row('DEFAULT_LEGAL_ENTITY');
    const base = { tenantId: tenant, applicationId: application, parameterCode: current.parameterCode, parameterName: 'test', usageNote: 'test', createdBy: actor.account, updatedBy: actor.account };
    await expect(db.sysParameter.create({ data: base })).rejects.toThrow();
    await expect(db.sysParameter.create({ data: { ...base, tenantId: foreignTenant } })).rejects.toThrow();
    await expect(db.sysApplication.delete({ where: { id: application } })).rejects.toThrow();
  });
  it.each(['普通文本', '001.2300', '2026-09-24', '错误编码 2026/99/99', '  保留空白  '])('stores arbitrary text verbatim: %s', async (value) => {
    await set('DEFAULT_LEGAL_ENTITY', value);
    expect((await row('DEFAULT_LEGAL_ENTITY')).value).toBe(value);
    expect(await service.getValue(code, 'DEFAULT_LEGAL_ENTITY')).toBe(value);
    expect(await defaults.getDefaults(code)).toEqual({ legalEntityId: null, warehouseId: null });
  });
  it('filters and pages raw values without checking referenced records', async () => {
    await set('DEFAULT_WAREHOUSE', '没有该仓库');
    const result = parameterListSchema.parse(await service.list(code, { keyword: '仓库', pageSize: '1' }));
    expect(result.pagination.total).toBe(1); expect(result.items[0].value).toBe('没有该仓库');
    expect(result.items[0]).not.toHaveProperty('effective');
    expect((await service.list(code, { status: 'DISABLED' })).items).toHaveLength(0);
  });
  it('resolves matching business codes to IDs only in the consumer adapter', async () => {
    await configure();
    expect(await service.getValue(code, 'DEFAULT_WAREHOUSE')).toBe('WH01');
    expect(await defaults.getDefaults(code)).toEqual({ legalEntityId: legalId, warehouseId });
    await set('DEFAULT_LEGAL_ENTITY', '其他租户法人');
    expect(await defaults.getDefaults(code)).toEqual({ legalEntityId: null, warehouseId: null });
  });
  it.each(['replace', 'clear', 'disable'])('does not cascade changes to warehouse text: %s', async (action) => {
    await configure(); const before = await row('DEFAULT_WAREHOUSE');
    await set('DEFAULT_LEGAL_ENTITY', action === 'clear' ? null : action === 'replace' ? '法人乙' : '法人甲', action === 'disable' ? 'DISABLED' : 'ACTIVE');
    expect(await row('DEFAULT_WAREHOUSE')).toEqual(before);
    expect((await defaults.getDefaults(code)).warehouseId).toBeNull();
    expect(await service.getValue(code, 'DEFAULT_WAREHOUSE')).toBe('WH01');
  });
  it('returns no business default for disabled/missing/mismatched references while preserving text', async () => {
    await configure(); await db.scmWarehouse.update({ where: { id: warehouseId }, data: { status: 'DISABLED' } });
    expect(await defaults.getDefaults(code)).toEqual({ legalEntityId: legalId, warehouseId: null });
    await db.orgLegalEntity.update({ where: { id: legalId }, data: { status: 'DISABLED' } });
    expect(await defaults.getDefaults(code)).toEqual({ legalEntityId: null, warehouseId: null });
    expect(await service.getValue(code, 'DEFAULT_LEGAL_ENTITY')).toBe('法人甲');
    await set('DEFAULT_LEGAL_ENTITY', null); expect(await service.getValue(code, 'DEFAULT_LEGAL_ENTITY')).toBeNull();
    await set('DEFAULT_WAREHOUSE', 'WH01', 'DISABLED'); expect(await service.getValue(code, 'DEFAULT_WAREHOUSE')).toBeNull();
  });
  it('rejects stale versions, immutable fields and updates from another application, and audits original text', async () => {
    const r = await row('DEFAULT_LEGAL_ENTITY'); await set('DEFAULT_LEGAL_ENTITY', 'wrong but allowed');
    await expect(service.update(code, r.id, actor, { value: 'second', status: 'ACTIVE', version: r.version })).rejects.toMatchObject({ status: 409 });
    await expect(service.update(secondCode, r.id, actor, { value: null, status: 'ACTIVE', version: 1 })).rejects.toMatchObject({ status: 404 });
    expect(parameterUpdateSchema.safeParse({ value: null, status: 'ACTIVE', version: 1, parameterName: 'tamper' }).success).toBe(false);
    expect(await service.getValue(secondCode, 'DEFAULT_LEGAL_ENTITY')).toBeNull();
    const audit = await db.sysAuditLog.findFirstOrThrow({ where: { resourceId: r.id }, orderBy: { createdAt: 'desc' } });
    expect(audit.afterSnapshot).toMatchObject({ value: 'wrong but allowed' });
  });
  it('only permits one concurrent edit with the same version', async () => {
    const r = await row('DEFAULT_LEGAL_ENTITY');
    const results = await Promise.allSettled(['A', 'B'].map((value) => service.update(code, r.id, actor, { value, status: 'ACTIVE', version: r.version })));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await row('DEFAULT_LEGAL_ENTITY')).version).toBe(2);
  });
  it('upgrades legacy IDs to codes, preserves unknown text and is idempotent (transaction rolled back)', async () => {
    const sql = readFileSync(resolve(__dirname, '../../prisma/migrations/20260924190000_parameter_text_values/migration.sql'), 'utf8');
    const rollback = new Error('test rollback');
    await expect(db.$transaction(async (tx) => {
      await tx.sysParameter.updateMany({ where: { applicationId: application, parameterCode: 'DEFAULT_LEGAL_ENTITY' }, data: { value: legalId } });
      await tx.sysParameter.updateMany({ where: { applicationId: application, parameterCode: 'DEFAULT_WAREHOUSE' }, data: { value: 'unknown warehouse text' } });
      await tx.$executeRawUnsafe(sql);
      const legal = await tx.sysParameter.findFirstOrThrow({ where: { applicationId: application, parameterCode: 'DEFAULT_LEGAL_ENTITY' } });
      const wh = await tx.sysParameter.findFirstOrThrow({ where: { applicationId: application, parameterCode: 'DEFAULT_WAREHOUSE' } });
      expect(legal.value).toBe('法人甲'); expect(wh.value).toBe('unknown warehouse text');
      await tx.$executeRawUnsafe(sql);
      expect(await tx.sysParameter.findUnique({ where: { id: legal.id } })).toEqual(legal);
      await tx.sysParameter.update({ where: { id: wh.id }, data: { value: warehouseId } });
      await tx.$executeRawUnsafe(sql);
      expect((await tx.sysParameter.findUniqueOrThrow({ where: { id: wh.id } })).value).toBe('WH01');
      throw rollback;
    })).rejects.toBe(rollback);
  });

});
