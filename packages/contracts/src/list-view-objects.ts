/** Registered business objects. Presentation settings never grant data or action access. */
export const businessListObjects = {
  'product-directory': { name: '产品', identity: 'productCode', fields: { productCode: '产品编码', productName: '产品名称', model: '型号', productLine: '产品线', unit: '单位', remark: '备注', status: '状态', updatedAt: '更新时间' } },
  'opportunity-directory': { name: '商机', identity: 'opportunityCode', fields: { opportunityCode: '商机编号', opportunityName: '商机名称', customerName: '客户', templateName: '模板', stageProbability: '阶段赢率', stageName: '阶段', confidence: '把握度', expectedAmount: '预计金额', ownerName: '负责人', status: '状态', updatedAt: '更新时间' } },
  'quotation-directory': { name: '报价单', identity: 'quoteCode', fields: { quoteCode: '报价单号', title: '标题', customerName: '客户', quoteDate: '报价日期', validUntil: '有效期至', status: '状态', total: '含税总额（CNY）' } },
  'competitor-directory': { name: '竞争对手', identity: 'competitorName', fields: { competitorName: '竞争对手名称', industryPosition: '行业地位', location: '所在地', mainProducts: '主要产品', strengths: '优势', weaknesses: '劣势', status: '状态', updatedAt: '更新时间' } },
} as const;
export type BusinessListObject = keyof typeof businessListObjects;
export function isBusinessListObject(pageCode: string): pageCode is BusinessListObject {
  return Object.prototype.hasOwnProperty.call(businessListObjects, pageCode);
}
export function businessListDefaultConfig(pageCode: BusinessListObject) {
  return {
    columns: Object.keys(businessListObjects[pageCode].fields).map((key) => ({ key, visible: key !== 'updatedAt', queryVisible: false, queryCollapsed: false, width: 160, fixed: null })),
    pageSize: 20 as const, filters: {}, sort: { field: 'updatedAt', direction: 'desc' as const },
  };
}
