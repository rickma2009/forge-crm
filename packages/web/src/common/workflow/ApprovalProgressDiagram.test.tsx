import {render,screen,fireEvent} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {ApprovalProgressDiagram} from './ApprovalProgressDiagram';
import type {WorkflowGraph} from '@forge-crm/contracts';
const graph:WorkflowGraph={schemaVersion:1,width:600,height:300,nodes:[{id:'manager',label:'经理',type:'UserTask',x:10,y:40,width:180,height:88},{id:'director',label:'二级负责人',type:'UserTask',x:240,y:40,width:180,height:88}],edges:[{id:'branch',from:'manager',to:'director',label:'超过阈值',points:[{x:190,y:84},{x:240,y:84}]}]};
describe('ApprovalProgressDiagram',()=>{
 it('retains unexecuted branches and exact design coordinates in runtime',()=>{const {container,rerender}=render(<ApprovalProgressDiagram graph={graph} design/>);const initial=container.querySelectorAll('.workflow-node')[1].getAttribute('transform');rerender(<ApprovalProgressDiagram graph={graph} states={{manager:'current'}}/>);expect(screen.getByRole('button',{name:'二级负责人，未执行'})).toBeInTheDocument();expect(container.querySelectorAll('.workflow-node')[1].getAttribute('transform')).toBe(initial);expect(container.querySelectorAll('polyline:not(.workflow-edge-hit)')).toHaveLength(1);});
 it('supports keyboard node selection and marks status with text',()=>{const select=vi.fn();render(<ApprovalProgressDiagram graph={graph} states={{manager:'failed'}} onSelect={select}/>);fireEvent.keyDown(screen.getByRole('button',{name:'经理，执行失败'}),{key:'Enter'});expect(select).toHaveBeenCalledWith('manager');});
});
