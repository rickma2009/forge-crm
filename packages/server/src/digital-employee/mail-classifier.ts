export type MailClassification={label:string;domain:string;risk:'LOW'|'MEDIUM'|'HIGH';action:string;plan:string[]};

const rules:{pattern:RegExp;value:MailClassification}[]=[
  {pattern:/投诉|客诉|退货|\brma\b|\b8d\b|缺陷|良率|(?:产品|物料|批次|生产|检验|测试).{0,12}(?:质量|品质|不良|异常)|(?:质量|品质|不良|异常).{0,12}(?:产品|物料|批次|生产|检验|测试)/i,value:{label:'质量与客诉',domain:'质量',risk:'HIGH',action:'核对批次、影响范围并安排质量响应',plan:['确认产品、批次与异常现象','关联质量或售后记录','明确责任人和回复时限']}},
  {pattern:/报价|询价|rfq|quotation|价格|price/i,value:{label:'询价与报价',domain:'销售',risk:'MEDIUM',action:'确认需求并准备报价或澄清清单',plan:['提取客户需求与交付条件','核对产品、数量和价格信息','准备回复草稿并提交人工确认']}},
  {pattern:/订单|采购单|purchase order|\border\b|\bpo\b|合同/i,value:{label:'订单处理',domain:'销售',risk:'MEDIUM',action:'核对订单关键信息和后续履约动作',plan:['核对客户、产品、数量和价格','检查来源单据和交期','创建订单处理待办']}},
  {pattern:/交期|延期|出货|发货|物流|delivery|shipment|tracking/i,value:{label:'交付与物流',domain:'计划',risk:'HIGH',action:'核实交期或物流状态并反馈影响',plan:['核对承诺交期和实际进度','识别受影响订单','准备内部协调和客户回复']}},
  {pattern:/发票|付款|回款|对账|账单|银行|交易|invoice|payment|e-?statement|electronic\s+(?:consolidated\s+)?statement|transaction|\btxn\b/i,value:{label:'财务与对账',domain:'财务',risk:'MEDIUM',action:'核对金额、单号和付款节点',plan:['提取金额和相关单号','关联订单或客户','交由财务责任人核对']}},
  {pattern:/紧急|加急|urgent|asap|立即|马上/i,value:{label:'紧急事项',domain:'协同',risk:'HIGH',action:'立即人工审阅并分派责任人',plan:['确认紧急原因和截止时间','识别关联业务对象','分派责任人并持续跟进']}},
];

export function classifyMail(input:string):MailClassification{
  const headline=input.split(/\r?\n/,1)[0]??'';
  return rules.find(rule=>rule.pattern.test(headline))?.value??rules.find(rule=>rule.pattern.test(input))?.value??{label:'一般邮件',domain:'协同',risk:'LOW',action:'人工审阅并决定是否需要后续处理',plan:['阅读邮件内容','识别关联业务对象','必要时创建后续任务']};
}
