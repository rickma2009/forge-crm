import assert from 'node:assert/strict';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { opportunityWriteSchema, systemCodeSchema } from '@forge-crm/contracts';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: resolve(__dirname, '../../..', '.env'), quiet: true });
const systemCode = systemCodeSchema.parse(process.argv[2] ?? 'demo-portal');
const marker = 'test-opportunities-20260929';
const scenarios = ['智慧教室大屏更新', '企业会议协作建设', '工业控制板卡采购', '展厅数字展示建设', '交通指挥调度升级', '商业数字标牌部署', 'LED显示工程建设', '嵌入式设备研发配套'];
const sources = ['客户转介绍', '官网咨询', '展会线索', '销售拜访', '合作伙伴推荐', '公开招标', '存量客户复购', '项目招募'];
const asDate = (base: Date, days: number) => new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days, 8));
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
    const setting = await db.sysParameter.findFirst({ where: { applicationId: app.id, tenantId: app.tenantId, parameterCode: 'OPPORTUNITY_STAGE_TEMPLATE', status: 'ACTIVE' }, select: { value: true } });
    const templateCode = setting?.value?.trim();
    assert(templateCode, 'CONFIGURED_OPPORTUNITY_TEMPLATE_REQUIRED');
    const [templates, customers, products, owners] = await Promise.all([
      db.sdOppTemplate.findMany({ where: { applicationId: app.id, status: 'ACTIVE', templateCode }, include: { stages: { where: { status: 'ACTIVE' }, orderBy: { sortNo: 'asc' } } }, orderBy: { templateCode: 'asc' } }),
      db.crmCustomer.findMany({ where: { systemCode, createdBy: 'test-data-20260928', statusValue: 'active' }, orderBy: { customerCode: 'asc' } }),
      db.mdItem.findMany({ where: { tenantId: app.tenantId, itemType: 'PRODUCT', status: 'ACTIVE', itemCode: { startsWith: 'TEST-P-' } }, orderBy: { itemCode: 'asc' } }),
      db.iamUser.findMany({ where: { tenantId: app.tenantId, status: 'ACTIVE', account: { not: 'admin' } }, orderBy: { account: 'asc' }, take: 6 }),
    ]);
    assert(templates.length === 1 && templates[0].stages.length >= 6, 'CONFIGURED_SIX_STAGE_TEMPLATE_REQUIRED');
    assert(customers.length >= 20 && products.length >= 4 && owners.length > 0, 'TEST_REFERENCES_REQUIRED');
    const now = new Date(), codes = Array.from({ length: 100 }, (_, i) => `TEST-O-20260929-${String(i + 1).padStart(3, '0')}`);
    const rows = codes.map((opportunityCode, i) => {
      const template = templates[0], signed = i >= 80, draft = i < 15;
      const stageIndex = signed ? 5 : draft ? 0 : Math.floor((i - 15) / 13);
      const stage = template.stages[stageIndex], customer = customers[(i * 7) % customers.length], owner = owners[i % owners.length];
      const age = signed ? 90 + ((i * 17) % 150) : draft ? 3 + (i * 3) : 25 + ((i * 19) % 210);
      const createdAt = asDate(now, -age);
      const expectedSignDate = signed ? asDate(now, -(7 + ((i * 11) % 80))) : new Date(Date.UTC(2026, 9 + i % 7, 5 + i % 23, 8));
      const businessStatus = signed ? 'SIGNED' : draft ? 'INITIAL' : i >= 75 ? 'LOST' : i >= 70 ? 'VOID' : 'FOLLOWING';
      const confidence = signed ? 100 : businessStatus === 'LOST' || businessStatus === 'VOID' ? 0 : draft ? [0, 5, 10, 15][i % 4] : Math.max(5, Math.min(95, stage.probability + [-20, -10, 0, 10, 15][i % 5]));
      // Permuted range includes both endpoints. All values are integer yuan, with exact cents allocation below.
      const amount = 50000 + Math.round(((i * 37) % 100) * 950000 / 99), count = 1 + (i % 4);
      const pool = products.filter(p => scenarios[i % scenarios.length].includes('板卡') || scenarios[i % scenarios.length].includes('嵌入式') ? p.itemCode.includes('BOARD') : p.itemCode.includes('SCREEN'));
      assert(pool.length >= count, 'SCENARIO_PRODUCT_POOL_TOO_SMALL');
      let remaining = amount * 100;
      const lines = Array.from({ length: count }, (_, line) => {
        const product = pool[(i * 11 + line * 7) % pool.length];
        const cents = line === count - 1 ? remaining : Math.floor(amount * 100 / count); remaining -= cents;
        // Divisor ensures quantity × two-decimal unit price equals exact allocated line amount.
        const quantity = [20, 10, 5, 4, 2, 1].find(q => cents % q === 0)!;
        return { product, quantity, unitPrice: (cents / quantity / 100).toFixed(2), expectedAmount: (cents / 100).toFixed(2), requirement: `测试需求：${scenarios[i % scenarios.length]}；${signed ? '合同范围已确认，按计划交付' : draft ? '初步需求尚待客户确认' : '关注兼容性、样机验证和交付安排'}`, sortNo: line * 10 };
      });
      const label = signed ? '已签约' : draft ? '初始' : businessStatus === 'LOST' ? '已丢单' : businessStatus === 'VOID' ? '已作废' : '跟进中';
      const input = opportunityWriteSchema.parse({ opportunityName: `测试-${scenarios[i % scenarios.length]}-${String(i + 1).padStart(3, '0')}`, customerId: customer.id, ownerUserId: owner.id, source: sources[i % sources.length], templateId: template.id, stageId: stage.id, confidence, businessStatus, signedDate: signed ? expectedSignDate.toISOString().slice(0, 10) : null, lostDate: businessStatus === 'LOST' ? asDate(now, -7 - i % 23).toISOString().slice(0, 10) : null, confirmedDate: draft ? null : asDate(createdAt, 3).toISOString().slice(0, 10), expectedSignDate: expectedSignDate.toISOString().slice(0, 10), customerBudget: Math.round(amount * [1, 1.1, 1.2, 1.3][i % 4]), expectedAmount: String(amount), status: 'ACTIVE', remark: `测试数据：虚构商机，用于漏斗、金额预测和保有量分析。场景状态：${label}。${draft ? '初始商机，需求尚未确认。' : signed ? '以合同阶段和100%把握度表示已签约。' : '阶段成交概率与人工把握度独立设置。'} 金额等于产品明细合计。`, products: lines.map(l => ({ productId: l.product.id, quantity: l.quantity, unitPrice: Number(l.unitPrice), requirement: l.requirement, sortNo: l.sortNo })) });
      assert(lines.reduce((sum, l) => sum + Math.round(Number(l.expectedAmount) * 100), 0) === amount * 100);
      return { opportunityCode, i, input, template, stage, customer, owner, lines, createdAt, expectedSignDate, signed, draft };
    });
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${app.id + ':' + marker}))::text`;
      const existing = await tx.sdOpp.findMany({ where: { applicationId: app.id, opportunityCode: { in: codes } } });
      assert(existing.every(r => r.createdBy === marker), 'TEST_CODE_COLLISION_WITH_BUSINESS_DATA');
      const found = new Set(existing.map(r => r.opportunityCode)); let added = 0;
      for (const row of rows) {
        if (found.has(row.opportunityCode)) continue;
        const { products: _products, ...input } = row.input; void _products;
        const opp = await tx.sdOpp.create({ data: { ...input, signedDate: input.signedDate ? new Date(input.signedDate) : null, lostDate: input.lostDate ? new Date(input.lostDate) : null, confirmedDate: input.confirmedDate ? new Date(input.confirmedDate) : null, expectedSignDate: row.expectedSignDate, tenantId: app.tenantId, applicationId: app.id, systemCode, opportunityCode: row.opportunityCode, customerName: row.customer.customerName, ownerName: row.owner.displayName, templateName: row.template.templateName, stageName: row.stage.stageName, stageProbability: row.stage.probability, createdBy: marker, updatedBy: marker, createdAt: row.createdAt, updatedAt: asDate(now, -((row.i * 3) % 18)) } });
        await tx.sdOppProduct.createMany({ data: row.lines.map(l => ({ tenantId: app.tenantId, opportunityId: opp.id, productId: l.product.id, productCode: l.product.itemCode, productName: l.product.itemName, model: l.product.model, quantity: l.quantity, unitPrice: l.unitPrice, expectedAmount: l.expectedAmount, requirement: l.requirement, sortNo: l.sortNo, createdBy: marker, updatedBy: marker, createdAt: row.createdAt })) });
        const followCount = row.draft ? 1 : 2 + row.i % 3;
        await tx.sdOppFollowUp.createMany({ data: Array.from({ length: followCount }, (_, n) => ({ opportunityId: opp.id, followedAt: row.signed && n === followCount - 1 ? row.expectedSignDate : asDate(row.createdAt, Math.floor((n + 1) * (row.signed ? (row.expectedSignDate.getTime() - row.createdAt.getTime()) / 86400000 : Math.min(50, (now.getTime() - row.createdAt.getTime()) / 86400000 - 1)) / (followCount + 1))), followerUserId: row.owner.id, followerName: row.owner.displayName, workItem: row.signed && n === followCount - 1 ? '确认合同签署与后续交付' : ['登记项目线索与初步需求', '确认技术规格与产品配置', '沟通预算及交付周期', row.signed ? '确认合同签署与后续交付' : '沟通方案及下一次确认事项'][n], resultNext: `测试跟进：${n === followCount - 1 && row.input.businessStatus === 'LOST' ? '客户选择其他方案，商机已丢单。' : n === followCount - 1 && row.input.businessStatus === 'VOID' ? '重复立项或采购取消，商机已作废。' : row.draft ? '需求尚未确认，下一步补充采购数量与预算。' : row.signed && n === followCount - 1 ? '合同已签订，后续按合同推进交付。' : `${row.stage.stageName}阶段；${row.i % 3 === 0 ? '客户预算审批待完成' : row.i % 3 === 1 ? '样机验证与技术兼容性待确认' : '商务条款与交期需进一步确认'}。`}`, status: 'ACTIVE', createdBy: marker, updatedBy: marker, createdAt: row.createdAt })) });
        added++;
      }
      const stored = await tx.sdOpp.findMany({ where: { applicationId: app.id, opportunityCode: { in: codes } }, include: { products: true } });
      assert(stored.length === 100, 'EXPECTED_100_TEST_OPPORTUNITIES');
      for (const r of stored) {
        assert(r.products.length >= 1 && r.products.length <= 4, 'PRODUCT_COUNT_RANGE');
        assert(r.expectedAmount && r.expectedAmount.toNumber() >= 50000 && r.expectedAmount.toNumber() <= 1000000, 'AMOUNT_RANGE');
        assert(r.products.reduce((sum, l) => sum + Math.round(l.expectedAmount.toNumber() * 100), 0) === Math.round(r.expectedAmount.toNumber() * 100), 'HEADER_LINE_AMOUNT_MISMATCH');
      }
      return { added, total: stored.length, productLines: stored.reduce((n, r) => n + r.products.length, 0), stages: Object.fromEntries([...new Set(stored.map(r => r.stageName))].map(name => [name, stored.filter(r => r.stageName === name).length])), minAmount: Math.min(...stored.map(r => r.expectedAmount!.toNumber())), maxAmount: Math.max(...stored.map(r => r.expectedAmount!.toNumber())) };
    }, { timeout: 60000 });
    console.log(JSON.stringify({ systemCode, marker, initial: 15, following: 55, void: 5, lost: 5, signed: 20, ...result }));
  } finally { await db.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'TEST_OPPORTUNITY_SEED_FAILED'); process.exitCode = 1; });
