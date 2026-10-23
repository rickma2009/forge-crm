import { render,screen,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { deMailCenterSchema,type DeMailCenter } from '@forge-crm/contracts';
import { MailAutomationCenter } from './MailAutomationCenter';
import { digitalEmployeeApi } from './api';

vi.mock('./api',()=>({digitalEmployeeApi:{getMailCenter:vi.fn(),mailTaskAction:vi.fn()}}));

const task={id:'MAIL-001',title:'[一般邮件] 客户交期确认',employee:'邮件数字员工',domain:'协同',object:'customer@example.com',risk:'LOW' as const,status:'PENDING' as const,due:'10-08 18:00',owner:'未分配',trigger:'收到邮件',output:'邮件摘要',action:'人工处理',finding:'客户询问交期',evidence:['mail:mail-primary:1'],plan:['确认交期'],requiresApproval:false,scenarioCode:'SCN-RFQ',strategyCode:'MAIL_一般邮件',scenarioData:{category:'一般邮件',completionRule:'NOTE_OR_REPLY'},priority:'LOW' as const,starred:false,tags:[],queue:'综合队列',ownerId:null,responseDueAt:'2026-10-08T08:00:00.000Z',resolutionDueAt:'2026-10-10T00:00:00.000Z',firstRespondedAt:null,completedAt:null,pausedAt:null,resumeAt:null,alertLevel:'NONE' as const,resolutionCode:null,resolutionNote:null,events:[]};
const center=(overrides:Partial<DeMailCenter>={}):DeMailCenter=>deMailCenterSchema.parse({automation:{id:'00000000-0000-4000-8000-000000000010',connectionCode:'mail-primary',enabled:true,config:{},nextRunAt:null,lastRunAt:null,lastError:null,version:1},rules:[],templates:[],messages:[],runs:[],tasks:[task],assignees:[],queues:[{code:'GENERAL',name:'综合队列'}],monitor:{active:1,unassigned:1,dueSoon:0,overdue:0,onHold:0},workspaceVersion:5,...overrides});

describe('MailAutomationCenter task actions',()=>{
 beforeEach(()=>{vi.mocked(digitalEmployeeApi.getMailCenter).mockResolvedValue(center());vi.mocked(digitalEmployeeApi.mailTaskAction).mockReset();});

 it('replaces the row immediately with the action response and uses the current workspace version',async()=>{
  const user=userEvent.setup(),running=center({tasks:[{...task,status:'RUNNING',firstRespondedAt:'2026-10-08T01:00:00.000Z'}],workspaceVersion:6});
  vi.mocked(digitalEmployeeApi.mailTaskAction).mockResolvedValue(running);
  render(<MailAutomationCenter systemCode="demo-portal" connectionCode="mail-primary" initialTab="tasks" canManage canExecute/>);
  const grid=await screen.findByRole('grid',{name:'邮件任务闭环'});
  await user.click(within(grid).getByRole('button',{name:'开始'}));
  expect(digitalEmployeeApi.mailTaskAction).toHaveBeenCalledWith('demo-portal','mail-primary','MAIL-001',expect.objectContaining({action:'START',version:5}));
  expect(await within(grid).findByText('处理中')).toBeInTheDocument();
  expect(digitalEmployeeApi.getMailCenter).toHaveBeenCalledTimes(1);
 });

 it('keeps the confirmation dialog open on validation errors and refreshes the completed status after success',async()=>{
  const user=userEvent.setup(),running=center({tasks:[{...task,status:'RUNNING',firstRespondedAt:'2026-10-08T01:00:00.000Z'}],workspaceVersion:8}),completed=center({tasks:[{...task,status:'COMPLETED',firstRespondedAt:'2026-10-08T01:00:00.000Z',completedAt:'2026-10-08T02:00:00.000Z',resolutionCode:'HANDLED',resolutionNote:'已回复客户'}],monitor:{active:0,unassigned:0,dueSoon:0,overdue:0,onHold:0},workspaceVersion:9});
  vi.mocked(digitalEmployeeApi.getMailCenter).mockResolvedValue(running);vi.mocked(digitalEmployeeApi.mailTaskAction).mockResolvedValue(completed);
  render(<MailAutomationCenter systemCode="demo-portal" connectionCode="mail-primary" initialTab="tasks" canManage canExecute/>);
  await screen.findByRole('grid',{name:'邮件任务闭环'});await user.selectOptions(screen.getByLabelText('处理状态'),'ALL');await user.click(screen.getByRole('button',{name:'完成'}));
  await user.click(screen.getByRole('button',{name:'确认'}));expect(await screen.findByRole('alert')).toHaveTextContent('请填写处理说明');expect(digitalEmployeeApi.mailTaskAction).not.toHaveBeenCalled();
  await user.type(screen.getByRole('textbox',{name:'处理说明'}),'已回复客户');await user.click(screen.getByRole('button',{name:'确认'}));
  expect(await within(screen.getByRole('grid',{name:'邮件任务闭环'})).findByText('已完成')).toBeInTheDocument();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(digitalEmployeeApi.mailTaskAction).toHaveBeenCalledWith('demo-portal','mail-primary','MAIL-001',expect.objectContaining({action:'COMPLETE',note:'已回复客户',version:8}));
 });
});
