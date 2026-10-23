import { businessSceneConfigSchema,businessSceneDataSchema,businessSceneRecordSchema, type BusinessSceneAction,type BusinessSceneCode,type BusinessSceneConfig,type BusinessSceneData,type BusinessSceneRecord } from '@forge-crm/contracts';
import { ApiException } from '../http/api-exceptions';
const emptyEightD=()=>({d1:'',d2:'',d3:'',d4:'',d5:'',d6:'',d7:'',d8:''});
export const sceneNames:Record<BusinessSceneCode,string>={'SCN-PO':'采购回签与交期差异','SCN-RMA':'客诉与质量 8D','SCN-BI':'经营分析'};
const sceneKinds:Record<BusinessSceneCode,BusinessSceneRecord['kind']>={'SCN-PO':'PURCHASE','SCN-RMA':'QUALITY','SCN-BI':'METRIC'};
export function initialBusinessScene(code:BusinessSceneCode,owner:string):BusinessSceneData {
 const demoRecords=Array.from({length:15},(_,index)=>{
  const i=index+1,n=String(i).padStart(3,'0');
  const base={id:`DEMO-${code.slice(4)}-${n}`,code:`DEMO-${code.slice(4)}202610${n}`,kind:sceneKinds[code],owner,note:'',draft:'',actionPlan:'',evidence:[`DEMO:${code}/snapshot/${n}`],events:[]};
  if(code==='SCN-PO')return businessSceneRecordSchema.parse({...base,title:`模拟${['芯片','连接器','电源模块'][index%3]}供应回签`,status:['PENDING_REVIEW','WAITING_REPLY','CONFIRMED','CLOSED'][index%4],purchase:{sourceNumber:`DEMO-PO202610${String(Math.ceil(i/3)).padStart(3,'0')}`,sourceLine:(index%3)+1,supplier:['华星电子（演示）','启明器件（演示）','远航连接（演示）'][index%3],materialCode:`DEMO-M${n}`,materialName:['控制芯片','高速连接器','电源模块'][index%3],orderedQty:1000+i*100,priceMinor:500+i*35,expectedDate:'2026-10-15',confirmedQty:index%4===0?null:1000+i*100-(index%4===1?100:0),confirmedPriceMinor:index%4===0?null:500+i*35+(index%4===1?25:0),confirmedDate:index%4===0?null:index%4===1?'2026-10-20':'2026-10-15',currency:'CNY'},note:index%4>=2?'演示：已人工核对数量、价格和交期。':''});
  if(code==='SCN-RMA')return businessSceneRecordSchema.parse({...base,title:`模拟${['触控间歇失效','电源启动异常','接口接触不良'][index%3]}客诉`,status:['NEW','INVESTIGATING','VALIDATING','CLOSED'][index%4],quality:{customer:['云杉科技（演示）','星海制造（演示）','启明教育（演示）'][index%3],product:['会议平板','智能控制板','扩展模块'][index%3],batch:`DEMO-B202610${n}`,serialNumber:`DEMO-SN${n}`,defect:['触控间歇失效','电源启动异常','接口接触不良'][index%3],affectedQty:2+i,facts:[`演示：客户报告 ${2+i} 台异常`, '演示：已保存外观检查及测试日志'],hypotheses:['待核实：连接异常可能相关，尚不能认定根因','待核实：需要比对软件版本与环境条件'],eightD:index%4>=2?{d1:'演示责任团队：质量、研发、售后',d2:'根据演示客诉与测试日志描述问题',d3:'演示建议：隔离待检样品',d4:index%4===3?'演示验证：连接失效条件可重复':'根因仍待试验核实',d5:'演示措施：检查连接及固件',d6:index%4===3?'演示复测已完成':'安排验证并记录结果',d7:'演示建议：增加相关检查项',d8:index%4===3?'演示闭环总结':'尚未关闭'}:emptyEightD(),rootCauseConfirmed:index%4===3,validationResult:index%4===3?'演示：复测通过，无重复失效':''}});
  const status=['DRAFT','APPROVED','FULFILLED'][index%3] as 'DRAFT'|'APPROVED'|'FULFILLED';
  return businessSceneRecordSchema.parse({...base,title:`模拟客户订单收入与交付核对 ${n}`,status:index%5===0?'CLOSED':'OPEN',metric:{sourceNumber:`DEMO-SO202610${n}`,customer:['云杉科技（演示）','星海制造（演示）','启明教育（演示）'][index%3],organization:['华东销售（演示）','华南销售（演示）'][index%2],region:index%2?'华南':'华东',period:'2026-10',orderStatus:status,amountMinor:Math.round((1000000+i*230000)*(index%4===1?.65:1)),budgetMinor:1000000+i*230000,shippedQty:status==='FULFILLED'?100+i*10:status==='DRAFT'?0:50+i*5,orderedQty:100+i*10,currency:'CNY'}});
 });
 return businessSceneDataSchema.parse({config:businessSceneConfigSchema.parse({owner}),demoRecords});
}
export function purchaseDifferences(row:BusinessSceneRecord,config:BusinessSceneConfig){
 const p=row.purchase!;const missing=p.confirmedQty===null||p.confirmedPriceMinor===null||p.confirmedDate===null;
 const qty=p.confirmedQty===null?null:p.confirmedQty-p.orderedQty,price=p.confirmedPriceMinor===null?null:p.confirmedPriceMinor-p.priceMinor;
 const delay=p.confirmedDate===null?null:Math.round((Date.parse(p.confirmedDate)-Date.parse(p.expectedDate))/86400000);
 return {missing,qty,price,delay,qtyRisk:qty!==null&&Math.abs(qty)*100>p.orderedQty*config.qtyTolerancePercent,priceRisk:price!==null&&(p.priceMinor===0?price!==0:Math.abs(price)*100>p.priceMinor*config.priceTolerancePercent),delayRisk:delay!==null&&delay>config.delayToleranceDays};
}
export function sceneSummary(rows:BusinessSceneRecord[]){const included=rows.filter(r=>r.metric&&r.metric.orderStatus!=='DRAFT');return{total:rows.length,open:rows.filter(r=>r.status!=='CLOSED').length,closed:rows.filter(r=>r.status==='CLOSED').length,approvedAmountMinor:included.reduce((sum,r)=>sum+r.metric!.amountMinor,0),budgetMinor:included.reduce((sum,r)=>sum+r.metric!.budgetMinor,0),included:included.length};}
export function applyBusinessSceneAction(row:BusinessSceneRecord,input:BusinessSceneAction,config:BusinessSceneConfig,actor:string,now=new Date()):BusinessSceneRecord{
 const next=structuredClone(row);const invalid=(message:string):never=>{throw new ApiException('BAD_REQUEST',409,message);};
 if(row.status==='CLOSED'&&input.action!=='REOPEN')invalid('已关闭记录只能重新打开');
 if(input.action==='REOPEN'){if(row.status!=='CLOSED')invalid('仅已关闭记录可以重开');if(!input.note)invalid('请填写重开原因');next.status=row.kind==='PURCHASE'?'PENDING_REVIEW':row.kind==='QUALITY'?'INVESTIGATING':'OPEN';}
 else if(input.action==='CLOSE'){
  if(!input.note)invalid('请填写处理结论');
  if(row.kind==='PURCHASE'&&(row.status!=='CONFIRMED'||purchaseDifferences(row,config).missing))invalid('请先人工核对完整回签');
  if(row.quality&&(!row.quality.rootCauseConfirmed||!row.quality.validationResult.trim()||!row.quality.eightD.d4.trim()||!row.quality.eightD.d6.trim()))invalid('请先核实根因并记录验证结果及8D验证说明');
  if(row.quality&&/待核实|尚未核实|尚不能|不可据此/.test(row.quality.eightD.d4))invalid('D4仍为待核实假设，请补充已验证根因');
  if(row.kind==='METRIC'&&!row.actionPlan.trim())invalid('请先保存后续行动或无需行动的依据');next.status='CLOSED';next.note=input.note;
 }else if(input.action==='PURCHASE_SAVE'){
  if(!row.purchase||!input.purchase)invalid('当前场景不支持回签编辑');if(!input.note)invalid('请填写回签核对说明');
  next.purchase={...row.purchase!,confirmedQty:input.purchase!.confirmedQty,confirmedDate:input.purchase!.confirmedDate,confirmedPriceMinor:input.purchase!.confirmedPriceMinor};
  next.status=purchaseDifferences(next,config).missing?'WAITING_REPLY':'CONFIRMED';next.note=input.note;
 }else if(input.action==='PURCHASE_DRAFT'){
  if(!row.purchase)invalid('当前记录不是采购回签');const p=row.purchase!,d=purchaseDifferences(row,config);
  next.draft=`【演示催办草稿，未发送】\n主题：请确认 ${p.sourceNumber} 第${p.sourceLine}行回签\n${p.supplier}：请核实 ${p.materialCode} ${p.materialName}，订单数量 ${p.orderedQty}，含税单价 ${(p.priceMinor/100).toFixed(2)} CNY，要求交期 ${p.expectedDate}。\n${d.missing?'回签数量、价格或交期仍有缺失。':`当前差异：数量 ${d.qty}，单价差 ${(d.price!/100).toFixed(2)} CNY，交期差 ${d.delay} 天。`}\n配置规则关注项：${[d.qtyRisk?'数量差异':'',d.priceRisk?'价格差异':'',d.delayRisk?'交期延迟':''].filter(Boolean).join('、')||'未超过配置容差，仍需核实缺失信息'}。\n请说明差异及可执行方案。未确认前不更改采购单或作出承诺。`;
 }else if(input.action==='QUALITY_DRAFT'){
  if(!row.quality)invalid('当前记录不是质量事件');const q=row.quality!;if(Object.values(q.eightD).some(text=>text.trim()))invalid('已有8D内容，请通过编辑修订，避免覆盖已核查记录');next.quality={...q,eightD:{d1:`责任团队（待确认）：${row.owner}、研发、售后`,d2:`纪要事实：${q.defect}，报告${q.affectedQty}台，批次${q.batch}。证据仅演示快照。`,d3:'建议：核验样品及隔离范围，由工程师确定；尚未执行。',d4:`待核实假设：${q.hypotheses.join('；')}。不可据此认定根因。`,d5:'制定纠正措施、负责人、截止时间；待工程师补充。',d6:'安排复测与对照试验，记录验证证据及判定标准。',d7:'根据确认根因提出防再发建议，待评审。',d8:'尚未关闭；需核实根因并填写验证与总结。'},rootCauseConfirmed:false,validationResult:''};next.status='INVESTIGATING';
 }else if(input.action==='QUALITY_SAVE'){
  if(!row.quality||!input.quality)invalid('当前场景不支持8D编辑');next.quality={...row.quality!,eightD:input.quality!.eightD,rootCauseConfirmed:input.quality!.rootCauseConfirmed,validationResult:input.quality!.validationResult};next.status=next.quality.rootCauseConfirmed?'VALIDATING':'INVESTIGATING';next.note=input.note;
 }else if(input.action==='ANALYZE'){
  if(!row.metric)invalid('当前记录不是经营指标');const m=row.metric!,difference=m.amountMinor-m.budgetMinor;
  next.draft=m.orderStatus==='DRAFT'?'【演示规则解释】该订单为草稿，不计入已审核订单金额与预算对比。':`【演示规则解释】来源 ${m.sourceNumber}，期间 ${m.period}，币种 CNY。订单金额 ${(m.amountMinor/100).toFixed(2)}，对比预算 ${(m.budgetMinor/100).toFixed(2)}，差异 ${(difference/100).toFixed(2)}。${m.budgetMinor?`偏差 ${(difference/m.budgetMinor*100).toFixed(1)}%。`:'预算为零，不能计算偏差率。'}${m.budgetMinor&&Math.abs(difference)*100>m.budgetMinor*config.anomalyPercent?`超过${config.anomalyPercent}%预算偏差关注阈值。`:'未超过预算偏差关注阈值。'}交付 ${m.shippedQty}/${m.orderedQty}。仅说明样本差异，业务原因尚待核实；不代表全公司收入。`;
 }else if(input.action==='SAVE_ACTION'){if(!row.metric||!input.actionPlan?.trim())invalid('请填写经营分析的后续行动');next.actionPlan=input.actionPlan!;next.note=input.note;}
 next.events.push({at:now.toISOString(),actor,action:input.action,note:input.note||'演示规则草稿生成，未执行外部动作'});
 if(next.events.length>300)invalid('处理记录已达到上限，请新建后续演示案例');return businessSceneRecordSchema.parse(next);
}
