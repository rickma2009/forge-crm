import {defaultSalesDesign,emptySalesDesign,validateWorkflowDesign,validateWorkflowDraft} from './workflow-definition';

describe('workflow definition validation',()=>{
 it('allows the start/end skeleton to be saved as an incomplete draft',()=>{
  expect(validateWorkflowDraft(emptySalesDesign()).nodes.map(node=>node.id)).toEqual(['start','end']);
  expect(()=>validateWorkflowDesign(emptySalesDesign())).toThrow('业务动作');
 });

 it('accepts the complete sales order workflow and registered object fields',()=>{
  expect(validateWorkflowDesign(defaultSalesDesign()).nodes).toHaveLength(7);
 });

 it('rejects unknown fields, negative numeric values and conditions outside gateways',()=>{
  for(const condition of [
   {field:'unknownField',operator:'GT' as const,value:'1'},
   {field:'netAmount',operator:'GT' as const,value:'-1'},
  ]){
   const design=defaultSalesDesign();design.edges.find(edge=>edge.id==='high')!.conditions=[condition];
   expect(()=>validateWorkflowDraft(design)).toThrow();
  }
  const design=defaultSalesDesign();design.edges.find(edge=>edge.id==='submit')!.conditions=[{field:'netAmount',operator:'GT',value:'1'}];
  expect(()=>validateWorkflowDesign(design)).toThrow('条件只能设置');
 });

 it('rejects gateways without exactly one default route and disconnected nodes',()=>{
  const noDefault=defaultSalesDesign();noDefault.edges.find(edge=>edge.id==='low')!.isDefault=false;
  expect(()=>validateWorkflowDesign(noDefault)).toThrow('默认路径');
  const disconnected=defaultSalesDesign();disconnected.edges=disconnected.edges.filter(edge=>edge.id!=='finish');
  expect(()=>validateWorkflowDesign(disconnected)).toThrow();
 });
});
