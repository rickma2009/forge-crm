import { render,screen,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { deWorkspaceSchema } from '@forge-crm/contracts';
import { DigitalEmployeePage } from './DigitalEmployeePage';
import { digitalEmployeeApi } from './api';

vi.mock('./api',()=>({digitalEmployeeApi:{get:vi.fn(),taskAction:vi.fn(),createTask:vi.fn(),transition:vi.fn()}}));

const workspace=deWorkspaceSchema.parse({version:3,tasks:[{id:'DE-001',title:'客户邮件待处理',employee:'邮件数字员工',domain:'销售',object:'客户A',risk:'HIGH',status:'PENDING',due:'10-08 12:00',owner:'未分配',trigger:'收到邮件',output:'摘要',action:'处理',finding:'客户要求确认交期',evidence:['mail:primary:1'],plan:['确认交期'],requiresApproval:false,priority:'HIGH',queue:'销售与客户队列',responseDueAt:'2026-10-08T04:00:00.000Z',resolutionDueAt:'2026-10-08T12:00:00.000Z',alertLevel:'OVERDUE',tags:['客户'],events:[{id:'E-1',at:'2026-10-08T01:00:00.000Z',actor:'邮件数字员工',type:'CREATED',content:'创建任务'}]}],employees:[],scenarios:[],rules:[],audits:[],connections:[],assignees:[{id:'00000000-0000-4000-8000-000000000001',account:'admin',name:'系统管理员'}],queues:[{code:'SALES',name:'销售与客户队列'}],monitor:{active:1,unassigned:1,dueSoon:0,overdue:1,onHold:0}});

describe('digital employee assignment and monitoring',()=>{
 beforeEach(()=>{vi.mocked(digitalEmployeeApi.get).mockResolvedValue(workspace);vi.mocked(digitalEmployeeApi.taskAction).mockResolvedValue(workspace);});
 it('shows assignment and alert fields and opens the closure actions',async()=>{
  const user=userEvent.setup();render(<DigitalEmployeePage systemCode="forge-crm" allowedActions={['view','execute']}/>);
  expect(await screen.findByText('待分派')).toBeInTheDocument();
  await user.click(screen.getByRole('tab',{name:'任务中心'}));
  const grid=await screen.findByRole('grid',{name:'数字员工任务列表'});expect(within(grid).getByText('销售与客户队列')).toBeInTheDocument();expect(within(grid).getByText('已超时')).toBeInTheDocument();
  await user.click(within(grid).getByRole('button',{name:'DE-001'}));
  expect(await screen.findByRole('button',{name:'分派'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'标记完成'})).toBeDisabled();
 });
});
