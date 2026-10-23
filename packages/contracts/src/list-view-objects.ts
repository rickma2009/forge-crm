/** Registered business objects. Presentation settings never grant data or action access. */
export const businessListObjects = {
 'supplier-directory': {name:'供应商',identity:'supplierCode',fields:{supplierCode:'供应商编码',supplierName:'供应商名称',shortName:'简称',categoryCode:'供应商类别',contactName:'联系人',phone:'电话',paymentTermDays:'账期（天）',leadTimeDays:'交期（天）',status:'状态',remark:'备注',updatedAt:'更新时间'}},
 'purchase-order-directory': {name:'采购订单',identity:'orderNo',fields:{orderNo:'采购订单号',supplierName:'供应商',orderDate:'订单日期',expectedDate:'预计到货日',buyerId:'采购员',legalEntityId:'法人',warehouseId:'计划仓库',amount:'原价金额',netAmount:'折后含税金额',taxAmount:'税额',status:'审核状态',fulfillmentStatus:'收货进度',remark:'备注',updatedAt:'更新时间'}},
 'purchase-receipt-directory': {name:'采购入库',identity:'receiptNo',fields:{receiptNo:'采购入库单号',orderNo:'来源订单号',supplierName:'供应商',documentDate:'入库日期',legalEntityId:'法人',warehouseId:'收货仓库',receiverId:'收货人',grossAmount:'含税金额',taxAmount:'税额',costAmount:'入库成本',status:'状态',remark:'备注',updatedAt:'更新时间'}},
  'approval-center': {name:'审批中心',identity:'orderNo',fields:{orderNo:'单号',applicantName:'申请人',customerName:'客户',amount:'申请金额',round:'轮次',status:'状态',createdAt:'提交时间'}},
  'item-directory': { name: '物料产品', identity: 'itemCode', fields: { itemCode: '物料编码', itemName: '物料名称', itemType: '类型', itemSource: '物料来源', itemLifecycle: '生命周期阶段', majorCategoryId: '物料大类', middleCategoryId: '物料中类', minorCategoryId: '物料小类', model: '型号', productLine: '产品线', baseUnit: '基本单位', batchManaged: '批次管理', status: '状态', remark: '备注', updatedAt: '更新时间' } },
  'bom-directory': { name: 'BOM', identity: 'bomCode', fields: { bomCode: 'BOM编码', itemCode: '产品编码', itemName: '产品名称', revision: '版本', status: '状态', isCurrent: '当前版本', baseQuantity: '基准数量', baseUnit: '单位', lineCount: '组件行数', updatedAt: '更新时间' } },
  'product-directory': { name: '产品', identity: 'productCode', fields: { productCode: '产品编码', productName: '产品名称', model: '型号', productLine: '产品线', unit: '单位', remark: '备注', status: '状态', updatedAt: '更新时间' } },
  'opportunity-directory': { name: '商机', identity: 'opportunityCode', fields: { opportunityCode: '商机编号', opportunityName: '商机名称', customerName: '客户', businessStatus: '商机状态', expectedSignDate: '预签日期', signedDate: '签约日期', lostDate: '丢单日期', templateName: '模板', stageProbability: '阶段赢率', stageName: '阶段', confidence: '把握度', expectedAmount: '预计金额', ownerName: '负责人', status: '启用状态', updatedAt: '更新时间' } },
  'quotation-directory': { name: '报价单', identity: 'quoteCode', fields: { quoteCode: '报价单号', title: '标题', customerName: '客户', quoteDate: '报价日期', validUntil: '有效期至', status: '状态', total: '含税总额（CNY）' } },
  'inbound-order-directory': { name: '入库单', identity: 'orderNo', fields: { orderNo: '入库单号', documentDate: '制单日期', inboundType: '入库类型', legalEntityName: '法人', warehouseName: '仓库', status: '状态', lineCount: '明细行', updatedAt: '更新时间' } },
  'competitor-directory': { name: '竞争对手', identity: 'competitorName', fields: { competitorName: '竞争对手名称', industryPosition: '行业地位', location: '所在地', mainProducts: '主要产品', strengths: '优势', weaknesses: '劣势', status: '状态', updatedAt: '更新时间' } },
} as const;
export type BusinessListObject = keyof typeof businessListObjects;
export function isBusinessListObject(pageCode: string): pageCode is BusinessListObject {
  return Object.prototype.hasOwnProperty.call(businessListObjects, pageCode);
}
export function businessListDefaultConfig(pageCode: BusinessListObject) {
  return {
    columns: Object.keys(businessListObjects[pageCode].fields).map((key) => ({ key, visible: !['updatedAt', 'signedDate', 'lostDate'].includes(key), queryVisible: false, queryCollapsed: false, width: ['supplier-directory','purchase-order-directory','purchase-receipt-directory'].includes(pageCode) ? (/Name$|remark/.test(key) ? 280 : /No$|Code$/.test(key) ? 220 : 160) : 160, fixed: null })),
    pageSize: 20 as const, filters: {}, sort: { field: 'updatedAt', direction: 'desc' as const },
  };
}
