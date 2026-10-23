import {businessSceneActionSchema,businessSceneConfigSchema} from '@forge-crm/contracts';
import {applyBusinessSceneAction,initialBusinessScene,purchaseDifferences,sceneSummary} from './business-scene-domain';
describe('business scene demo rules',()=>{
 const config=businessSceneConfigSchema.parse({owner:'测试'});
 const action=(value:object)=>businessSceneActionSchema.parse({version:1,...value});
 it('creates exactly 15 isolated typed demo rows per scene and excludes draft orders from totals',()=>{
  for(const code of ['SCN-PO','SCN-RMA','SCN-BI'] as const){const rows=initialBusinessScene(code,'测试').demoRecords;expect(rows).toHaveLength(15);expect(new Set(rows.map(r=>r.id)).size).toBe(15);expect(rows.every(r=>r.id.startsWith('DEMO-'))).toBe(true);}
  const rows=initialBusinessScene('SCN-BI','测试').demoRecords,summary=sceneSummary(rows);expect(summary.included).toBe(10);expect(summary.approvedAmountMinor).toBe(rows.filter(r=>r.metric!.orderStatus!=='DRAFT').reduce((s,r)=>s+r.metric!.amountMinor,0));
 });
 it('compares exact cents and dates, protects source snapshots, and requires complete reconciliation before close',()=>{
  const row=initialBusinessScene('SCN-PO','测试').demoRecords[1];expect(purchaseDifferences(row,config)).toMatchObject({qty:-100,price:25,delay:5,qtyRisk:true,priceRisk:true,delayRisk:true});
  expect(()=>applyBusinessSceneAction(row,action({action:'CLOSE',note:'核对完成'}),config,'测试')).toThrow('请先人工核对');
  const confirmed=applyBusinessSceneAction(row,action({action:'PURCHASE_SAVE',note:'人工接受演示差异',purchase:{...row.purchase!,orderedQty:999,sourceNumber:'FORGED',confirmedQty:1300}}),config,'测试');expect(confirmed.purchase!.orderedQty).toBe(row.purchase!.orderedQty);expect(confirmed.purchase!.sourceNumber).toBe(row.purchase!.sourceNumber);expect(confirmed.status).toBe('CONFIRMED');
  const closed=applyBusinessSceneAction(confirmed,action({action:'CLOSE',note:'已完成核对'}),config,'测试');expect(closed.status).toBe('CLOSED');expect(closed.events).toHaveLength(2);expect(row.events).toHaveLength(0);
 });
 it('separates root cause hypotheses from verified evidence and forbids premature quality closure',()=>{
  const row=initialBusinessScene('SCN-RMA','测试').demoRecords[0];const draft=applyBusinessSceneAction(row,action({action:'QUALITY_DRAFT'}),config,'测试');expect(draft.quality!.eightD.d4).toContain('待核实');expect(()=>applyBusinessSceneAction(draft,action({action:'CLOSE',note:'完成'}),config,'测试')).toThrow('核实根因');
  const verified=applyBusinessSceneAction(draft,action({action:'QUALITY_SAVE',quality:{...draft.quality!,product:'FORGED',eightD:{...draft.quality!.eightD,d4:'演示对照试验确认连接器松动',d6:'演示复测通过'},rootCauseConfirmed:true,validationResult:'演示复测通过'},note:'人工核实'}),config,'测试');expect(verified.quality!.product).toBe(row.quality!.product);expect(applyBusinessSceneAction(verified,action({action:'CLOSE',note:'已复核演示验证'}),config,'测试').status).toBe('CLOSED');
 });
 it('keeps drafts unsent, requires a follow-up basis, and records reopen reasons',()=>{
  const row=initialBusinessScene('SCN-BI','测试').demoRecords[1];const explained=applyBusinessSceneAction(row,action({action:'ANALYZE'}),config,'测试');expect(explained.draft).toContain('尚待核实');expect(()=>applyBusinessSceneAction(row,action({action:'CLOSE',note:'完成'}),config,'测试')).toThrow('后续行动');const planned=applyBusinessSceneAction(row,action({action:'SAVE_ACTION',actionPlan:'核对预算与订单量'}),config,'测试');const closed=applyBusinessSceneAction(planned,action({action:'CLOSE',note:'交接演示行动'}),config,'测试');expect(()=>applyBusinessSceneAction(closed,action({action:'REOPEN'}),config,'测试')).toThrow('重开原因');expect(applyBusinessSceneAction(closed,action({action:'REOPEN',note:'补充核对'}),config,'测试').status).toBe('OPEN');
 });
 it('rejects credential-bearing URLs, absolute paths and unvalidated dates',()=>{
  for(const baseUrl of ['http://example.com','https://u:p@example.com','https://example.com?token=x'])expect(()=>businessSceneConfigSchema.parse({owner:'测试',baseUrl})).toThrow();expect(()=>businessSceneConfigSchema.parse({owner:'测试',endpoint:'//attacker/a'})).toThrow();const row=initialBusinessScene('SCN-PO','测试').demoRecords[0];expect(()=>action({action:'PURCHASE_SAVE',purchase:{...row.purchase,confirmedDate:'2026-02-30'}})).toThrow();
 });
});
