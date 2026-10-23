import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import type {WorkflowDesign} from '@forge-crm/contracts';
import {ControlledWorkflowDesigner,autoLayoutWorkflowDesign,workflowDesignGraph} from './ControlledWorkflowDesigner';

const design:WorkflowDesign={schemaVersion:1,nodes:[{id:'start',type:'START',label:'开始',x:0,y:0},{id:'end',type:'END',label:'结束',x:0,y:0}],edges:[{id:'start_end',from:'start',to:'end',label:'',match:'ALL',conditions:[],isDefault:false,sortNo:10}]};

it('auto lays out a connected process from top to bottom',()=>{
 const laidOut=autoLayoutWorkflowDesign(design),start=laidOut.nodes.find(node=>node.id==='start')!,end=laidOut.nodes.find(node=>node.id==='end')!,graph=workflowDesignGraph(design);
 expect(start.y).toBeLessThan(end.y);expect(start.x).toBe(end.x);expect(graph.edges[0].points.length).toBeGreaterThanOrEqual(4);
});

it('inserts a controlled approval node on a selected connector',async()=>{
 const user=userEvent.setup(),change=vi.fn();render(<ControlledWorkflowDesigner design={design} fields={[]} editable onChange={change}/>);
 await user.click(screen.getByRole('button',{name:'连接线：默认流转'}));
 await user.click(screen.getByRole('button',{name:'审批节点'}));
 expect(change).toHaveBeenCalledWith(expect.objectContaining({nodes:expect.arrayContaining([expect.objectContaining({type:'APPROVAL',assigneeKey:'managerId'})])}));
});

it('shows condition operators as comparison symbols while retaining encoded values',async()=>{
 const user=userEvent.setup(),conditional:WorkflowDesign={...design,edges:[{...design.edges[0],conditions:[{field:'netAmount',operator:'GTE',value:'100000'}]}]},change=vi.fn();
 render(<ControlledWorkflowDesigner design={conditional} fields={[{fieldCode:'netAmount',fieldName:'折扣后总额',type:'MONEY',operators:['EQ','NE','GT','GTE','LT','LTE']}]} editable onChange={change}/>);
 await user.click(screen.getByRole('button',{name:'连接线：默认流转'}));
 const operator=screen.getByLabelText('条件运算符 1');
 expect(operator).toHaveValue('GTE');expect(screen.getByRole('option',{name:'≥'})).toHaveValue('GTE');expect(screen.queryByRole('option',{name:'GTE'})).not.toBeInTheDocument();
});
