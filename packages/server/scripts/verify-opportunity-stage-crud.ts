import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { OpportunityService } from '../src/opportunity/opportunity.service';
import type { DatabaseService } from '../src/database/database.service';

async function main() {
  const connectionString = process.env.OPP_STAGE_TEST_URL;
  const url = new URL(connectionString ?? '');
  assert(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert(url.pathname.startsWith('/opp_stage_test_'), 'Only a disposable stage test database is allowed');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    // db push is only used to bootstrap this disposable test database. Restore
    // the stage-specific constraints from the existing 20260923110000 migration.
    await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS sd_opp_stage_default_key ON sd_opp_stage(template_id) WHERE is_default = true AND status = \'ACTIVE\'');
    await db.$executeRawUnsafe('DO $$ BEGIN ALTER TABLE sd_opp ADD CONSTRAINT sd_opp_stage_fkey FOREIGN KEY (stage_id) REFERENCES sd_opp_stage(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$');
    await db.$executeRawUnsafe('DO $$ BEGIN ALTER TABLE sd_opp_analysis ADD CONSTRAINT sd_opp_analysis_stage_fkey FOREIGN KEY (stage_id) REFERENCES sd_opp_stage(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$');
    const systemCode = `stage-test-${Date.now()}`;
    const tenant = await db.sysTenant.create({ data: { tenantCode: systemCode, tenantName: '阶段测试' } });
    const app = await db.sysApplication.create({ data: { tenantId: tenant.id, applicationCode: systemCode, applicationName: '阶段测试' } });
    const user = await db.iamUser.create({ data: { tenantId: tenant.id, account: systemCode, normalizedAccount: systemCode, displayName: '测试管理员' } });
    const template = await db.sdOppTemplate.create({ data: { tenantId: tenant.id, applicationId: app.id, templateCode: 'common', templateName: '公共', createdBy: user.account, updatedBy: user.account } });
    const service = new OpportunityService(db as unknown as DatabaseService);
    const actor = [user.id, user.account, 'stage-crud-test'] as const;
    const create = (stageCode: string, isDefault = false) => service.createStage(systemCode, template.id, ...actor, { stageCode, stageName: stageCode, probability: 25, isDefault });
    await create('lead', true); await create('review');
    const find = (stageCode: string) => db.sdOppStage.findUniqueOrThrow({ where: { templateId_stageCode: { templateId: template.id, stageCode } } });
    let lead = await find('lead'); const review = await find('review');
    await assert.rejects(service.deleteStage(systemCode, lead.id, ...actor, { version: lead.version }), /默认/);
    await assert.rejects(create('review', true), /编码/);
    assert.equal((await find('lead')).isDefault, true, 'failed duplicate default creation must roll back');
    await assert.rejects(service.deleteStage(systemCode, review.id, ...actor, { version: review.version + 1 }), /修改/);
    const updated = await service.updateStage(systemCode, review.id, ...actor, { version: review.version, isDefault: true, stageName: '新评审' });
    assert(Array.isArray(updated)); assert.equal(updated[0].stages.find((stage) => stage.id === review.id)?.stageName, '新评审');
    assert.equal(updated[0].stages.filter((stage) => stage.isDefault).length, 1);
    lead = await find('lead');
    await service.deleteStage(systemCode, lead.id, ...actor, { version: lead.version });
    assert.equal(await db.sdOppStage.count({ where: { id: lead.id } }), 0);
    assert.equal(await db.sysAuditLog.count({ where: { resourceId: lead.id, actionCode: 'opportunity.stage.delete' } }), 1);
    await create('used'); const used = await find('used');
    const opp = await db.sdOpp.create({ data: { tenantId: tenant.id, applicationId: app.id, systemCode, opportunityCode: 'O001', opportunityName: '引用测试', customerId: randomUUID(), customerName: '测试客户', ownerUserId: user.id, ownerName: user.displayName, templateId: template.id, templateName: template.templateName, stageId: used.id, stageName: used.stageName, stageProbability: used.probability, createdBy: user.account, updatedBy: user.account } });
    await assert.rejects(service.deleteStage(systemCode, used.id, ...actor, { version: used.version }), /引用/);
    await db.sdOppAnalysis.create({ data: { opportunityId: opp.id, opportunityName: opp.opportunityName, stageId: used.id, stageName: used.stageName, stageProbability: used.probability, confidence: 20, opportunityPoint: '测试', risk: '测试', nextPlan: '测试', analystUserId: user.id, analystName: user.displayName } });
    await db.sdOpp.update({ where: { id: opp.id }, data: { stageId: review.id, stageName: '新评审' } });
    await assert.rejects(service.deleteStage(systemCode, used.id, ...actor, { version: used.version }), /引用/);
    await assert.rejects(db.sdOppStage.delete({ where: { id: used.id } }), 'database FK must protect historical analysis');
    const other = await db.sysApplication.create({ data: { tenantId: tenant.id, applicationCode: `${systemCode}-other`, applicationName: '其他应用' } });
    await assert.rejects(service.deleteStage(other.applicationCode, used.id, ...actor, { version: used.version }), /不存在/);
    await assert.rejects(service.createStage(other.applicationCode, template.id, ...actor, { stageCode: 'foreign', stageName: '越权', probability: 10 }), /模板/);
    console.log('PASS: stage create/update/delete, duplicate rollback, default replacement, stale version, opportunity/history FK protection, app isolation and audit');
  } finally { await db.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
