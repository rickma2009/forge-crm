import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseService } from '../packages/server/src/database/database.service';

const here = dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(resolve(here, '../.env'));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const db = new DatabaseService(databaseUrl);
const systemCode = 'demo-portal';
const actor = 'demo-rebuild-20261006';
const businessDate = '20261006';
const day = new Date('2026-10-06T00:00:00+08:00');
const dateAt = (offset: number) => new Date(day.getTime() + offset * 86_400_000);
const code = (prefix: string, index: number) => `${prefix}${businessDate}${String(index).padStart(5, '0')}`;
const customerCode = (index: number) => `C${String(index).padStart(7, '0')}`;
const round = (value: number) => Math.round(value * 100) / 100;
const charLength = (value: string) => Array.from(value).length;
const truncate = (value: string, max: number) => Array.from(value).slice(0, max).join('');
const ignoredNameToken = /^(?:DDR[345](?:L|X)?|常温|高温|低温|不指定|不带ECC|量产|外购|V\d+(?:\.\d+)?|GP|ROHS|REACH)$/i;

function conciseMaterialName(current: string, remark: string | null) {
  const description = remark?.match(/(?:^|；)描述：([\s\S]*?)(?:；来源：|$)/)?.[1]?.trim() ?? '';
  const tokens = description.split(/[,，;；]/).map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const base = (tokens[0] || current || '物料').trim();
  const selected: string[] = [];
  for (const original of tokens.slice(1)) {
    if (ignoredNameToken.test(original) || original.toLowerCase() === base.toLowerCase() || /^(?:seewo|希沃)$/i.test(original)) continue;
    const token = truncate(original.replace(/\s*\([^)]{12,}\)\s*/g, '').trim(), 18);
    if (!token || selected.some((value) => value.toLowerCase() === token.toLowerCase())) continue;
    if (charLength([base, ...selected, token].join(' ')) > 30) continue;
    selected.push(token);
    if (selected.length >= 4) break;
  }
  return truncate([base, ...selected].join(' '), 30);
}

type BomSnapshot = Awaited<ReturnType<typeof db.scmBom.findMany>>[number] & {
  lines: Array<Awaited<ReturnType<typeof db.scmBomLine.findMany>>[number] & { alternatives: Awaited<ReturnType<typeof db.scmBomAlternative.findMany>> }>;
};

async function clearBusinessData() {
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      crm_customer,
      sd_opp,
      sd_quotation,
      sd_sales_order,
      sd_sales_outbound,
      scm_inbound_order,
      scm_inventory_balance,
      scm_inventory_txn,
      scm_inventory_event,
      scm_bom,
      sd_product_price,
      md_product,
      sd_sales_event,
      ai_analysis_task,
      agent_task,
      sys_agent_conversation,
      sys_personal_todo,
      sd_opp_stage_event,
      sd_sales_activity,
      sd_sales_suggestion,
      sd_opp_score,
      sd_score_override,
      sd_record_comment,
      sd_comment_revision,
      sd_comment_mention,
      sys_event_outbox,
      sys_notification
    RESTART IDENTITY CASCADE
  `);
  await db.sysAttachment.deleteMany({ where: { ownerType: { in: ['PRODUCT', 'OPPORTUNITY', 'QUOTATION', 'SALES_ORDER', 'SALES_OUTBOUND', 'INBOUND_ORDER'] } } });
  await db.mdItem.deleteMany({ where: { createdBy: { not: 'demo-excel-import' } } });
  await db.sysCodeIssue.deleteMany({ where: { objectCode: { in: ['CUSTOMER', 'EMPLOYEE', 'OPPORTUNITY', 'QUOTATION', 'SALES_ORDER', 'INBOUND', 'OUTBOUND'] } } });
  await db.sysCodeCounter.deleteMany({ where: { objectCode: { in: ['CUSTOMER', 'EMPLOYEE', 'OPPORTUNITY', 'QUOTATION', 'SALES_ORDER', 'INBOUND', 'OUTBOUND'] } } });
  await db.scmDocumentCounter.deleteMany({});
}

async function normalizeEmployees(tenantId: string) {
  const employments = await db.orgEmployment.findMany({ where: { tenantId }, include: { employee: true }, orderBy: [{ employee: { employeeName: 'asc' } }, { id: 'asc' }] });
  const adminIndex = employments.findIndex((row) => row.employee.employeeName === '系统管理员');
  if (adminIndex > 0) employments.unshift(...employments.splice(adminIndex, 1));
  for (let index = 0; index < employments.length; index++) {
    await db.orgEmployment.update({ where: { id: employments[index].id }, data: { employeeNo: `TMP-${String(index + 1).padStart(6, '0')}` } });
  }
  for (let index = 0; index < employments.length; index++) {
    await db.orgEmployment.update({ where: { id: employments[index].id }, data: { employeeNo: `1${String(index + 1).padStart(6, '0')}`, version: { increment: 1 } } });
  }
  await db.sysCodeCounter.create({ data: { tenantId, objectCode: 'EMPLOYEE', namespace: '1|', currentValue: BigInt(employments.length) } });
  return employments.length;
}

async function rebuildItems(tenantId: string) {
  const source = await db.mdItem.findMany({ where: { tenantId, createdBy: 'demo-excel-import' }, orderBy: [{ middleCategoryId: 'asc' }, { itemCode: 'asc' }] });
  if (source.length !== 514) throw new Error(`Expected 514 imported source items, found ${source.length}`);
  for (const row of source) {
    if (!row.middleCategoryId || !/^\d{3}\.\d{3}\.\d{7}$/.test(row.itemCode)) throw new Error(`Invalid source item category/code: ${row.itemCode}`);
  }
  const occupied = new Set(source.filter((row) => row.itemType === 'PRODUCT').map((row) => row.itemName));
  const groups = new Map<string, typeof source>();
  for (const row of source.filter((item) => item.itemType === 'MATERIAL')) {
    const candidate = conciseMaterialName(row.itemName, row.remark);
    const group = groups.get(candidate) ?? [];
    group.push(row);
    groups.set(candidate, group);
  }
  const itemNames = new Map<string, string>();
  for (const [candidate, rows] of groups) for (const row of rows) {
    let itemName = candidate;
    if (rows.length > 1 || occupied.has(itemName)) {
      const suffix = `-${row.itemCode.slice(-4)}`;
      itemName = `${truncate(candidate, 30 - charLength(suffix))}${suffix}`;
    }
    let serial = 2;
    while (occupied.has(itemName)) {
      const suffix = `-${row.itemCode.slice(-4)}-${serial++}`;
      itemName = `${truncate(candidate, 30 - charLength(suffix))}${suffix}`;
    }
    occupied.add(itemName);
    itemNames.set(row.id, itemName);
  }
  for (const row of source) await db.mdItem.update({ where: { id: row.id }, data: { itemName: itemNames.get(row.id) ?? row.itemName, status: 'ACTIVE', updatedBy: actor } });
  return new Map(source.map((row) => [row.id, row.id]));
}

async function rebuildBoms(app: { id: string; tenantId: string }, snapshots: BomSnapshot[], itemMapping: Map<string, string>) {
  const bomMapping = new Map<string, string>();
  for (const source of snapshots) {
    const itemId = itemMapping.get(source.itemId);
    if (!itemId) throw new Error(`Missing rebuilt BOM product for ${source.bomCode}`);
    const item = await db.mdItem.findUniqueOrThrow({ where: { id: itemId } });
    const created = await db.scmBom.create({ data: { tenantId: app.tenantId, applicationId: app.id, itemId, bomCode: `BOM-${item.itemCode}`, revision: 1, status: 'PUBLISHED', isCurrent: true, baseQuantity: source.baseQuantity, createdBy: actor, updatedBy: actor } });
    bomMapping.set(source.id, created.id);
  }
  for (const source of snapshots) {
    const bomId = bomMapping.get(source.id)!;
    for (const line of source.lines) {
      const itemId = itemMapping.get(line.itemId);
      if (!itemId) throw new Error(`Missing rebuilt BOM component ${line.itemId}`);
      const created = await db.scmBomLine.create({ data: { tenantId: app.tenantId, applicationId: app.id, bomId, lineCode: line.lineCode, itemId, quantity: line.quantity, sortNo: line.sortNo, childBomId: line.childBomId ? bomMapping.get(line.childBomId) ?? null : null } });
      if (line.alternatives.length) await db.scmBomAlternative.createMany({ data: line.alternatives.map((alternative) => { const alternativeItemId = itemMapping.get(alternative.itemId); if (!alternativeItemId) throw new Error(`Missing rebuilt alternative ${alternative.itemId}`); return { tenantId: app.tenantId, applicationId: app.id, lineId: created.id, itemId: alternativeItemId, priority: alternative.priority, ratio: alternative.ratio }; }) });
    }
  }
}

async function rebuildCustomers(systemCodeValue: string) {
  const categories = ['potential', 'formal', 'partner'];
  const statuses = ['active', 'paused', 'archived'];
  const industries = ['manufacturing', 'retail', 'technology', 'service', 'other'];
  const levels = ['a', 'b', 'c', 'd'];
  const regions = [['广东省', '广州市'], ['广东省', '深圳市'], ['江苏省', '苏州市'], ['浙江省', '杭州市'], ['四川省', '成都市']];
  const rows = [];
  let index = 0;
  for (const categoryValue of categories) for (const statusValue of statuses) for (let n = 0; n < 5; n++) {
    index++;
    const [province, city] = regions[(index - 1) % regions.length];
    const customer = await db.crmCustomer.create({ data: { systemCode: systemCodeValue, customerCode: customerCode(index), customerName: `${city}演示${categoryValue === 'formal' ? '制造' : categoryValue === 'partner' ? '合作' : '潜客'}企业${String(index).padStart(2, '0')}`, shortName: `演示客户${String(index).padStart(2, '0')}`, categoryValue, statusValue, industryValue: industries[index % industries.length], levelValue: levels[index % levels.length], address: `${province}${city}演示产业园${index}号`, salesOwnerKey: null, salesOwnerName: null, remark: `全量重建演示客户；类别=${categoryValue}；状态=${statusValue}`, createdBy: actor, updatedBy: actor } });
    await db.crmCustomerContact.create({ data: { systemCode: systemCodeValue, customerId: customer.id, name: `联系人${String(index).padStart(2, '0')}`, department: n % 2 ? '采购部' : '信息化部', position: n % 2 ? '采购经理' : '项目经理', decisionRole: n % 3 === 0 ? 'DECISION_MAKER' : 'INFLUENCER', mobile: `138${String(10000000 + index).slice(-8)}`, email: `contact${index}@demo.example`, status: 'ACTIVE', sortNo: 10, remark: '演示联系人', createdBy: actor, updatedBy: actor } });
    await db.crmCustomerAddress.create({ data: { systemCode: systemCodeValue, customerId: customer.id, addressType: n % 2 ? 'DELIVERY' : 'OFFICE', recipient: `收货人${index}`, phone: `139${String(20000000 + index).slice(-8)}`, province, city, district: '演示区', detail: `产业大道${index}号`, isDefault: true, status: 'ACTIVE', sortNo: 10, remark: '演示地址', createdBy: actor, updatedBy: actor } });
    rows.push(customer);
  }
  return rows;
}

async function rebuildOpportunities(app: { id: string; tenantId: string }, customers: Awaited<ReturnType<typeof rebuildCustomers>>, products: Awaited<ReturnType<typeof db.mdItem.findMany>>, users: Awaited<ReturnType<typeof db.iamUser.findMany>>) {
  const setting = await db.sysParameter.findFirst({ where: { applicationId: app.id, parameterCode: 'OPPORTUNITY_STAGE_TEMPLATE', status: 'ACTIVE' } });
  const templateCode = typeof setting?.value === 'string' ? setting.value : undefined;
  const template = await db.sdOppTemplate.findFirst({ where: { applicationId: app.id, status: 'ACTIVE', ...(templateCode ? { templateCode } : {}) }, include: { stages: { where: { status: 'ACTIVE' }, orderBy: { sortNo: 'asc' } } } });
  if (!template || template.stages.length < 5) throw new Error('Active opportunity template with at least five stages is required');
  const businessStatuses = ['INITIAL', 'FOLLOWING', 'SIGNED', 'LOST', 'VOID'];
  const sources = ['客户转介绍', '官网咨询', '展会线索', '销售拜访', '合作伙伴推荐'];
  const rows = [];
  for (let index = 0; index < 30; index++) {
    const customer = customers.filter((row) => row.statusValue === 'active')[index % 15];
    const owner = users[index % users.length];
    const stage = template.stages[index % template.stages.length];
    const businessStatus = businessStatuses[index % businessStatuses.length];
    const expectedAmount = 100_000 + index * 25_000;
    const opportunity = await db.sdOpp.create({ data: { tenantId: app.tenantId, applicationId: app.id, systemCode, opportunityCode: code('OP', index + 1), opportunityName: `${customer.shortName}数字化项目${String(index + 1).padStart(2, '0')}`, customerId: customer.id, customerName: customer.customerName, ownerUserId: owner.id, ownerName: owner.displayName, source: sources[index % sources.length], templateId: template.id, templateName: template.templateName, stageId: stage.id, stageName: stage.stageName, stageProbability: stage.probability, confidence: businessStatus === 'SIGNED' ? 100 : businessStatus === 'LOST' || businessStatus === 'VOID' ? 0 : Math.max(10, stage.probability), businessStatus, signedDate: businessStatus === 'SIGNED' ? dateAt(-index) : null, lostDate: businessStatus === 'LOST' ? dateAt(-index) : null, confirmedDate: businessStatus === 'INITIAL' ? null : dateAt(-30 - index), expectedSignDate: dateAt(30 + index), customerBudget: expectedAmount * 1.2, expectedAmount, currencyCode: 'CNY', status: index < 5 ? 'DISABLED' : 'ACTIVE', remark: `全量重建演示商机；阶段=${stage.stageName}；业务状态=${businessStatus}`, createdBy: actor, updatedBy: actor, createdAt: dateAt(-60 + index) } });
    const selected = [products[index % products.length], products[(index + 7) % products.length]];
    await db.sdOppProduct.createMany({ data: selected.map((product, line) => ({ tenantId: app.tenantId, opportunityId: opportunity.id, productId: product.id, productCode: product.itemCode, productName: product.itemName, model: product.model, quantity: 5 + line * 5, unitPrice: round(expectedAmount / 15), expectedAmount: round(expectedAmount * (line ? 2 / 3 : 1 / 3)), requirement: `演示配置需求${line + 1}`, sortNo: (line + 1) * 10, createdBy: actor, updatedBy: actor })) });
    for (let follow = 0; follow < 2; follow++) await db.sdOppFollowUp.create({ data: { opportunityId: opportunity.id, followedAt: dateAt(-20 + follow * 7 + index), followerUserId: owner.id, followerName: owner.displayName, workItem: follow ? '确认配置、价格和交付周期' : '了解项目背景和采购计划', resultNext: follow ? '准备报价并确认决策链' : '安排技术交流', status: 'ACTIVE', createdBy: actor, updatedBy: actor } });
    rows.push(opportunity);
  }
  return rows;
}

async function rebuildQuotations(app: { id: string; tenantId: string }, opportunities: Awaited<ReturnType<typeof rebuildOpportunities>>, products: Awaited<ReturnType<typeof db.mdItem.findMany>>) {
  const statuses = [...Array(5).fill('DRAFT'), ...Array(5).fill('SUBMITTED'), ...Array(40).fill('ACCEPTED'), ...Array(5).fill('REJECTED'), ...Array(5).fill('EXPIRED')];
  const rows = [];
  for (let index = 0; index < statuses.length; index++) {
    const opportunity = opportunities[index % opportunities.length];
    const customer = await db.crmCustomer.findUniqueOrThrow({ where: { id: opportunity.customerId } });
    const status = statuses[index];
    const selected = [products[index % products.length], products[(index + 11) % products.length]];
    const lines = selected.map((product, line) => { const quantity = 5 + line * 5, unitPrice = 2_000 + index * 100 + line * 500; return { product, quantity, unitPrice, amount: quantity * unitPrice, sortNo: (line + 1) * 10 }; });
    const quote = await db.sdQuotation.create({ data: { tenantId: app.tenantId, applicationId: app.id, systemCode, quoteCode: code('QT', index + 1), title: `${opportunity.opportunityName}报价方案`, customerId: customer.id, customerName: customer.customerName, opportunityId: opportunity.id, ownerUserId: opportunity.ownerUserId, quoteDate: dateAt(-index), validUntil: status === 'EXPIRED' ? dateAt(-1) : dateAt(30 + index), status, total: lines.reduce((sum, line) => sum + line.amount, 0), terms: '含税，交付周期30天，质保12个月。', remark: `全量重建演示报价；状态=${status}`, createdBy: opportunity.ownerUserId, updatedBy: opportunity.ownerUserId } });
    await db.sdQuotationLine.createMany({ data: lines.map(({ product, quantity, unitPrice, amount, sortNo }) => ({ quotationId: quote.id, tenantId: app.tenantId, applicationId: app.id, productId: product.id, productCode: product.itemCode, productName: product.itemName, model: product.model, unit: product.baseUnit, productLine: product.productLine ?? '计算机产品', quantity, suggestedPrice: unitPrice, priceSource: 'STANDARD', unitPrice, discount: 1, amount, sortNo, delivery: '30天', remark: '演示报价明细' })) });
    rows.push(quote);
  }
  return rows;
}

async function rebuildSalesOrders(app: { id: string; tenantId: string }, quotes: Awaited<ReturnType<typeof rebuildQuotations>>, users: Awaited<ReturnType<typeof db.iamUser.findMany>>, products: Awaited<ReturnType<typeof db.mdItem.findMany>>) {
  const statuses = [...Array(5).fill('DRAFT'), ...Array(5).fill('SUBMITTED'), ...Array(25).fill('APPROVED'), ...Array(5).fill('CANCELLED')];
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'ACCEPTED');
  const rows: Array<{ order: Awaited<ReturnType<typeof db.sdSalesOrder.create>>; line: Awaited<ReturnType<typeof db.sdSalesOrderLine.create>> }> = [];
  for (let index = 0; index < statuses.length; index++) {
    const quote = acceptedQuotes[index % acceptedQuotes.length];
    const customer = await db.crmCustomer.findUniqueOrThrow({ where: { id: quote.customerId } });
    const salesperson = users[index % users.length];
    const product = products[index % products.length];
    const quantity = 20;
    const unitPrice = 3_000 + index * 50;
    const amount = quantity * unitPrice;
    const status = statuses[index];
    const order = await db.sdSalesOrder.create({ data: { tenantId: app.tenantId, applicationId: app.id, orderNo: code('SO', index + 1), orderDate: dateAt(-index), sourceType: 'QUOTATION', sourceId: quote.id, sourceNo: quote.quoteCode, opportunityId: quote.opportunityId, customerId: customer.id, customerCode: customer.customerCode, customerName: customer.customerName, salespersonId: salesperson.id, salespersonName: salesperson.displayName, organizationName: '营销中心', region: ['华南', '华东', '华北', '西南', '华中'][index % 5], orderType: index % 2 ? 'NORMAL' : 'PROJECT', currencyCode: 'CNY', discount: 1, amount, netAmount: amount, taxAmount: round(amount * 0.13), status, fulfillmentStatus: 'NOT_SHIPPED', remark: `全量重建演示销售订单；状态=${status}`, version: 1, creatorId: salesperson.id, submittedBy: status === 'DRAFT' ? null : salesperson.id, submittedAt: status === 'DRAFT' ? null : dateAt(-index), approvedBy: ['APPROVED', 'CANCELLED'].includes(status) ? users[0].id : null, approvedAt: ['APPROVED', 'CANCELLED'].includes(status) ? dateAt(-index) : null, closedAt: null } });
    const line = await db.sdSalesOrderLine.create({ data: { orderId: order.id, tenantId: app.tenantId, applicationId: app.id, lineNo: 10, sortNo: 10, itemId: product.id, itemCode: product.itemCode, itemName: product.itemName, baseUnit: product.baseUnit, quantity, unitPrice, amount, discount: 1, discountedAmount: amount, finalAmount: amount, taxRate: 0.13, taxAmount: round(amount * 0.13), shippedQty: 0, lineStatus: 'NOT_SHIPPED', remark: '演示订单明细' } });
    rows.push({ order, line });
  }
  return rows;
}

async function rebuildInventoryAndOutbounds(app: { id: string; tenantId: string }, users: Awaited<ReturnType<typeof db.iamUser.findMany>>, products: Awaited<ReturnType<typeof db.mdItem.findMany>>, orders: Awaited<ReturnType<typeof rebuildSalesOrders>>) {
  const warehouses = await db.scmWarehouse.findMany({ where: { tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: { warehouseCode: 'asc' } });
  if (!warehouses.length) throw new Error('At least one active warehouse is required');
  const legalEntity = await db.orgLegalEntity.findFirstOrThrow({ where: { tenantId: app.tenantId, status: 'ACTIVE' } });
  const balance = new Map<string, { item: typeof products[number]; warehouse: typeof warehouses[number]; qty: number; amount: number; batchNo: string }>();
  const inboundStatuses = ['DRAFT', 'POSTED', 'REVERSED', 'VOIDED'] as const;
  const inboundTypes = ['PRODUCTION', 'FINISHED_GOODS', 'TRANSFER', 'STOCK_GAIN'] as const;
  for (let index = 0; index < 20; index++) {
    const status = inboundStatuses[Math.floor(index / 5)];
    const inboundType = inboundTypes[index % inboundTypes.length];
    const item = products[index % products.length];
    const warehouse = warehouses[index % warehouses.length];
    const batchNo = item.batchManaged ? `LOT-${businessDate}-${String(index + 1).padStart(3, '0')}` : '';
    const order = await db.scmInboundOrder.create({ data: { tenantId: app.tenantId, applicationId: app.id, orderNo: code('IB', index + 1), documentDate: dateAt(-index), creatorId: users[0].id, inboundType, status, postedAt: ['POSTED', 'REVERSED'].includes(status) ? dateAt(-index) : null, postedBy: ['POSTED', 'REVERSED'].includes(status) ? users[0].id : null, reversedAt: status === 'REVERSED' ? dateAt(-index + 1) : null, reversedBy: status === 'REVERSED' ? users[1].id : null, legalEntityId: legalEntity.id, warehouseId: warehouse.id, reasonCode: `${inboundType}_DEMO`, currencyCode: 'CNY', remark: `全量重建演示入库；类型=${inboundType}；状态=${status}`, createdBy: actor, updatedBy: actor } });
    const line = await db.scmInboundLine.create({ data: { orderId: order.id, tenantId: app.tenantId, lineNo: 10, itemId: item.id, itemCode: item.itemCode, itemName: item.itemName, batchNo, actualQty: 100, baseUnit: item.baseUnit, amount: 100_000, remark: '演示入库明细', createdBy: actor, updatedBy: actor } });
    if (['POSTED', 'REVERSED'].includes(status)) await db.scmInventoryTxn.create({ data: { tenantId: app.tenantId, applicationId: app.id, sourceType: 'INBOUND_ORDER', sourceName: '入库单', sourceOrderId: order.id, orderNo: order.orderNo, sourceLineId: line.id, lineNo: 10, movementType: 'INBOUND', itemCode: item.itemCode, itemName: item.itemName, quantity: 100, amount: 100_000, batchNo, warehouseId: warehouse.id, legalEntityId: legalEntity.id, currencyCode: 'CNY', remark: '演示入库过账', actorId: users[0].id, occurredAt: dateAt(-index) } });
    if (status === 'REVERSED') await db.scmInventoryTxn.create({ data: { tenantId: app.tenantId, applicationId: app.id, sourceType: 'INBOUND_ORDER', sourceName: '入库单冲销', sourceOrderId: order.id, orderNo: order.orderNo, sourceLineId: line.id, lineNo: 10, movementType: 'REVERSAL', itemCode: item.itemCode, itemName: item.itemName, quantity: -100, amount: -100_000, batchNo, warehouseId: warehouse.id, legalEntityId: legalEntity.id, currencyCode: 'CNY', remark: '演示入库冲销', actorId: users[1].id, occurredAt: dateAt(-index + 1) } });
    if (status === 'POSTED') balance.set(`${warehouse.id}:${item.itemCode}:${batchNo}`, { item, warehouse, qty: 100, amount: 100_000, batchNo });
  }
  const stocked = [...balance.values()];
  const approvedOrders = orders.filter((row) => row.order.status === 'APPROVED');
  const outboundStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REVERSED'];
  for (let index = 0; index < 20; index++) {
    const status = outboundStatuses[Math.floor(index / 5)];
    const selectedOrder = approvedOrders[index % approvedOrders.length];
    const stock = stocked[index % stocked.length];
    await db.sdSalesOrderLine.update({ where: { id: selectedOrder.line.id }, data: { itemId: stock.item.id, itemCode: stock.item.itemCode, itemName: stock.item.itemName, baseUnit: stock.item.baseUnit } });
    const outbound = await db.sdSalesOutbound.create({ data: { tenantId: app.tenantId, applicationId: app.id, outboundNo: code('OB', index + 1), orderId: selectedOrder.order.id, orderNo: selectedOrder.order.orderNo, customerName: selectedOrder.order.customerName, documentDate: dateAt(-index), legalEntityId: legalEntity.id, warehouseId: stock.warehouse.id, warehouseName: stock.warehouse.warehouseName, shipperId: users[0].id, shipperName: users[0].displayName, currencyCode: 'CNY', salesAmount: 6_000, costAmount: 4_000, status, remark: `全量重建演示销售出库；状态=${status}`, creatorId: users[0].id, submittedBy: status === 'DRAFT' ? null : users[0].id, submittedAt: status === 'DRAFT' ? null : dateAt(-index), approvedBy: ['APPROVED', 'REVERSED'].includes(status) ? users[1].id : null, approvedAt: ['APPROVED', 'REVERSED'].includes(status) ? dateAt(-index) : null, reversedBy: status === 'REVERSED' ? users[1].id : null, reversedAt: status === 'REVERSED' ? dateAt(-index + 1) : null } });
    const line = await db.sdSalesOutboundLine.create({ data: { outboundId: outbound.id, tenantId: app.tenantId, applicationId: app.id, lineNo: 10, orderLineId: selectedOrder.line.id, itemId: stock.item.id, itemCode: stock.item.itemCode, itemName: stock.item.itemName, baseUnit: stock.item.baseUnit, batchNo: stock.batchNo, quantity: 2, salesAmount: 6_000, costAmount: 4_000, remark: '演示出库明细' } });
    if (['APPROVED', 'REVERSED'].includes(status)) {
      await db.scmInventoryTxn.create({ data: { tenantId: app.tenantId, applicationId: app.id, sourceType: 'SALES_OUTBOUND', sourceName: '销售出库', sourceOrderId: outbound.id, orderNo: outbound.outboundNo, sourceLineId: line.id, lineNo: 10, movementType: 'OUTBOUND', itemCode: stock.item.itemCode, itemName: stock.item.itemName, quantity: -2, amount: -4_000, batchNo: stock.batchNo, warehouseId: stock.warehouse.id, legalEntityId: legalEntity.id, currencyCode: 'CNY', remark: '演示销售出库过账', actorId: users[1].id, occurredAt: dateAt(-index) } });
      stock.qty -= 2; stock.amount -= 4_000;
    }
    if (status === 'REVERSED') {
      await db.scmInventoryTxn.create({ data: { tenantId: app.tenantId, applicationId: app.id, sourceType: 'SALES_OUTBOUND', sourceName: '销售出库冲销', sourceOrderId: outbound.id, orderNo: outbound.outboundNo, sourceLineId: line.id, lineNo: 10, movementType: 'OUTBOUND_REVERSAL', itemCode: stock.item.itemCode, itemName: stock.item.itemName, quantity: 2, amount: 4_000, batchNo: stock.batchNo, warehouseId: stock.warehouse.id, legalEntityId: legalEntity.id, currencyCode: 'CNY', remark: '演示销售出库冲销', actorId: users[1].id, occurredAt: dateAt(-index + 1) } });
      stock.qty += 2; stock.amount += 4_000;
    }
    if (status === 'APPROVED') {
      await db.sdSalesOrderLine.update({ where: { id: selectedOrder.line.id }, data: { shippedQty: 2, lineStatus: 'PARTIAL' } });
      await db.sdSalesOrder.update({ where: { id: selectedOrder.order.id }, data: { fulfillmentStatus: 'PARTIAL', version: { increment: 1 } } });
    }
  }
  for (const row of stocked) await db.scmInventoryBalance.create({ data: { tenantId: app.tenantId, legalEntityId: legalEntity.id, warehouseId: row.warehouse.id, itemCode: row.item.itemCode, batchNo: row.batchNo, baseUnit: row.item.baseUnit, quantity: row.qty, amount: row.amount, currencyCode: 'CNY' } });
}

async function resetCounters(tenantId: string, counts: Record<string, number>) {
  const namespaces: Record<string, string> = { CUSTOMER: 'C|', EMPLOYEE: '1|', OPPORTUNITY: `OP|${businessDate}`, QUOTATION: `QT|${businessDate}`, SALES_ORDER: `SO|${businessDate}`, INBOUND: `IB|${businessDate}`, OUTBOUND: `OB|${businessDate}` };
  for (const [objectCode, currentValue] of Object.entries(counts)) await db.sysCodeCounter.upsert({ where: { tenantId_objectCode_namespace: { tenantId, objectCode, namespace: namespaces[objectCode] } }, create: { tenantId, objectCode, namespace: namespaces[objectCode], currentValue }, update: { currentValue } });
}

async function report(app: { id: string; tenantId: string }, employeeCount: number) {
  const [customers, items, boms, bomLines, alternatives, opportunities, quotes, orders, outbounds, inbounds, balances, transactions] = await Promise.all([
    db.crmCustomer.groupBy({ by: ['categoryValue', 'statusValue'], where: { systemCode }, _count: true }),
    db.mdItem.groupBy({ by: ['itemType', 'status'], where: { tenantId: app.tenantId }, _count: true }),
    db.scmBom.count({ where: { applicationId: app.id } }), db.scmBomLine.count({ where: { applicationId: app.id } }), db.scmBomAlternative.count({ where: { applicationId: app.id } }),
    db.sdOpp.groupBy({ by: ['businessStatus', 'status'], where: { applicationId: app.id }, _count: true }),
    db.sdQuotation.groupBy({ by: ['status'], where: { applicationId: app.id }, _count: true }),
    db.sdSalesOrder.groupBy({ by: ['status'], where: { applicationId: app.id }, _count: true }),
    db.sdSalesOutbound.groupBy({ by: ['status'], where: { applicationId: app.id }, _count: true }),
    db.scmInboundOrder.groupBy({ by: ['status', 'inboundType'], where: { applicationId: app.id }, _count: true }),
    db.scmInventoryBalance.count({ where: { tenantId: app.tenantId } }), db.scmInventoryTxn.count({ where: { applicationId: app.id } }),
  ]);
  const result = { rebuiltAt: new Date().toISOString(), systemCode, marker: actor, employeeCount, customers, items, boms, bomLines, alternatives, opportunities, quotations: quotes, salesOrders: orders, salesOutbounds: outbounds, inbounds, inventoryBalances: balances, inventoryTransactions: transactions };
  await writeFile(resolve(here, '004全量演示数据重建报告.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return result;
}

async function main() {
  const app = await db.sysApplication.findFirstOrThrow({ where: { applicationCode: systemCode, status: 'ACTIVE' } });
  const bomSnapshots = await db.scmBom.findMany({ where: { applicationId: app.id, createdBy: 'demo-excel-import' }, include: { lines: { orderBy: { sortNo: 'asc' }, include: { alternatives: { orderBy: { priority: 'asc' } } } } }, orderBy: { bomCode: 'asc' } }) as BomSnapshot[];
  if (bomSnapshots.length !== 24) throw new Error(`Expected 24 imported BOMs, found ${bomSnapshots.length}`);
  console.log(JSON.stringify({ phase: 'snapshot', importedItems: 514, importedBoms: bomSnapshots.length }));
  await clearBusinessData();
  console.log(JSON.stringify({ phase: 'cleared' }));
  const employeeCount = await normalizeEmployees(app.tenantId);
  const itemMapping = await rebuildItems(app.tenantId);
  await rebuildBoms(app, bomSnapshots, itemMapping);
  console.log(JSON.stringify({ phase: 'master-data', employeeCount, rebuiltItems: itemMapping.size, rebuiltBoms: bomSnapshots.length }));
  const customers = await rebuildCustomers(systemCode);
  const users = await db.iamUser.findMany({ where: { tenantId: app.tenantId, status: 'ACTIVE' }, orderBy: { account: 'asc' }, take: 10 });
  const products = await db.mdItem.findMany({ where: { tenantId: app.tenantId, status: 'ACTIVE', itemType: 'PRODUCT' }, orderBy: { itemCode: 'asc' } });
  if (users.length < 2 || products.length < 20) throw new Error('Not enough active users or products after rebuild');
  const opportunities = await rebuildOpportunities(app, customers, products, users);
  const quotations = await rebuildQuotations(app, opportunities, products);
  const orders = await rebuildSalesOrders(app, quotations, users, products);
  await rebuildInventoryAndOutbounds(app, users, products, orders);
  await resetCounters(app.tenantId, { CUSTOMER: customers.length, EMPLOYEE: employeeCount, OPPORTUNITY: opportunities.length, QUOTATION: quotations.length, SALES_ORDER: orders.length, INBOUND: 20, OUTBOUND: 20 });
  await db.sysAuditLog.create({ data: { tenantId: app.tenantId, applicationId: app.id, actorUserId: null, actionCode: 'demo.full_rebuild', resourceType: 'demo-database', resourceId: systemCode, beforeSnapshot: { backup: '/private/tmp/forge-crm-before-full-demo-rebuild-20261006.dump' }, afterSnapshot: { importedSourceItems: 514, rebuiltActiveItems: itemMapping.size, boms: bomSnapshots.length, customers: customers.length, opportunities: opportunities.length, quotations: quotations.length, salesOrders: orders.length, inbounds: 20, outbounds: 20 }, requestId: 'full-demo-rebuild-20261006-v1' } });
  console.log(JSON.stringify(await report(app, employeeCount), null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
