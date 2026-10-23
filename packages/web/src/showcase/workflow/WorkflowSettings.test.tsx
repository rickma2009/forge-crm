import {cleanup,render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,it,vi} from 'vitest';
import type {Config} from './api';
import {WorkflowSettings} from './WorkflowSettings';

const mock=vi.hoisted(()=>({
 definitions:vi.fn(),createDefinition:vi.fn(),definition:vi.fn(),objects:vi.fn(),configs:vi.fn(),options:vi.fn(),issues:vi.fn(),preview:vi.fn(),
}));
vi.mock('./api',()=>({workflowApi:{...mock,updateDefinition:vi.fn(),editDefinition:vi.fn(),deleteDefinition:vi.fn(),publishDefinition:vi.fn(),retry:vi.fn()},statusName:(status:string)=>status==='DRAFT'?'草稿':status}));

const draft:Config={id:'11111111-1111-4111-8111-111111111111',workflowCode:'wf_111111111111',workflowName:'销售订单审批',objectCode:'sales_order',revision:1,status:'DRAFT',enabled:false,createdBy:'22222222-2222-4222-8222-222222222222',createdByName:'系统管理员',createdAt:'2026-10-05T00:00:00.000Z',updatedAt:'2026-10-05T00:00:00.000Z',version:1,graph:null,config:{personnelPolicy:'FROZEN',departments:[],design:{schemaVersion:1,nodes:[{id:'start',type:'START',label:'开始',x:40,y:170},{id:'end',type:'END',label:'结束',x:360,y:170}],edges:[{id:'start_end',from:'start',to:'end',label:'',match:'ALL',conditions:[],isDefault:false,sortNo:10}]}}};

afterEach(()=>{cleanup();vi.clearAllMocks();});
function setup(){mock.definitions.mockResolvedValue({items:[],pagination:{page:1,pageSize:20,total:0,totalPages:0}});mock.createDefinition.mockResolvedValue(draft);mock.definition.mockResolvedValue(draft);mock.objects.mockResolvedValue({items:[{objectCode:'sales_order',objectName:'销售订单',fields:[]}]});mock.configs.mockResolvedValue([draft]);mock.options.mockResolvedValue({objects:[],organizations:[],users:[]});mock.issues.mockResolvedValue([]);mock.preview.mockRejectedValue(new Error('流程缺少业务动作节点'));return userEvent.setup();}

it('uses a searchable list first and creates a sales-order workflow with only start/end nodes',async()=>{
 const user=setup();render(<WorkflowSettings systemCode="demo-portal" allowedActions={['view','manage']} onNavigate={vi.fn()}/>);
 expect(await screen.findByRole('grid',{name:'工作流列表'})).toBeInTheDocument();
 expect(screen.getAllByRole('columnheader').map(node=>node.textContent)).toEqual(expect.arrayContaining(['工作流编码','工作流名称','数据对象','版本','状态','创建时间','创建人','操作']));
 await user.click(screen.getByRole('button',{name:'新增工作流'}));
 const dialog=screen.getByRole('dialog',{name:'新增工作流'});expect(within(dialog).getByLabelText('数据对象')).toHaveValue('sales_order');
 await user.click(within(dialog).getByRole('button',{name:'确定并进入设计'}));
 await waitFor(()=>expect(mock.createDefinition).toHaveBeenCalledWith('demo-portal',expect.objectContaining({workflowName:'销售订单审批',objectCode:'sales_order'})));
 expect(await screen.findByText('可视化流程设计')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'开始，设计节点'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'结束，设计节点'})).toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'连接线：默认流转'}));
 expect(screen.getByRole('button',{name:'审批节点'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'条件分支'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'业务动作'})).toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'审批节点'}));
 expect(screen.getByRole('button',{name:'审批节点，设计节点'})).toBeInTheDocument();
});
