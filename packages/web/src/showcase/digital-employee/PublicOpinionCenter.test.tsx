import { render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import type { DeOpinionCenter } from '@forge-crm/contracts';
import { PublicOpinionCenter } from './PublicOpinionCenter';
import { digitalEmployeeApi } from './api';

vi.mock('../../common/data-grid/DeclarativeDataGrid',()=>({DeclarativeDataGrid:({children}:{children:ReactNode})=><table>{children}</table>}));
vi.mock('./api',()=>({digitalEmployeeApi:{getOpinionCenter:vi.fn(),startOpinionRun:vi.fn(),cancelOpinionRun:vi.fn(),saveOpinionTopic:vi.fn(),saveOpinionSource:vi.fn(),checkOpinionSource:vi.fn(),retryOpinionRun:vi.fn(),importOpinionItems:vi.fn(),opinionEventAction:vi.fn(),taskAction:vi.fn()}}));
const center={topic:{id:'00000000-0000-4000-8000-000000000001',code:'MAXHUB-RISK',name:'MAXHUB品牌舆情',brand:'MAXHUB',requiredTerms:['MAXHUB'],riskTerms:{投诉:['投诉'],质量:['质量']},excludedTerms:[],languages:['zh','en'],enabled:true,version:1},sources:[{id:'00000000-0000-4000-8000-000000000002',code:'gdelt-global',name:'GDELT全球新闻',type:'GDELT',status:'CONFIGURED',enabled:true,config:{},secretConfigured:false,lastCheckedAt:null,lastError:null,version:1}],items:[],events:[],runs:[],tasks:[],assignees:[],queues:[{code:'RISK',name:'风险监控队列'}],summary:{totalItems:0,totalEvents:0,urgent:0,important:0,pending:0,negative:0,activeTasks:0},workspaceVersion:1} satisfies DeOpinionCenter;
const centerWithEvent:DeOpinionCenter={...center,events:[{id:'00000000-0000-4000-8000-000000000003',eventCode:'OP-DEMO-001',title:'MAXHUB产品质量问题',status:'PENDING_REVIEW',riskLevel:'IMPORTANT',riskScore:62,sentiment:'NEGATIVE',summary:'事件摘要应显示在独立详情区。',matchedTerms:['MAXHUB','质量'],sourceCount:2,sourceNames:['GDELT全球新闻','行业资讯示例'],itemCount:3,firstSeenAt:'2026-10-08T00:00:00.000Z',lastSeenAt:'2026-10-08T01:00:00.000Z',owner:'系统管理员',queue:'风险监控队列',taskId:null,resolution:null,falsePositiveReason:null,version:1}],summary:{...center.summary,totalEvents:1,important:1,pending:1}};

describe('PublicOpinionCenter',()=>{
 beforeEach(()=>{vi.mocked(digitalEmployeeApi.getOpinionCenter).mockResolvedValue(center);vi.mocked(digitalEmployeeApi.startOpinionRun).mockResolvedValue({runId:'run-1',status:'QUEUED',message:'监测任务已创建'});});
 it('shows a manual-only workspace and starts the selected sources',async()=>{
  render(<PublicOpinionCenter systemCode="demo-portal" canManage canExecute/>);expect(await screen.findByText(/监控品牌/)).toHaveTextContent('MAXHUB');expect(screen.getByText(/自动监控/)).toHaveTextContent('未启用');await userEvent.click(screen.getByRole('button',{name:'立即监测'}));expect(screen.getByRole('dialog',{name:'立即监测MAXHUB舆情'})).toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'开始监测'}));await waitFor(()=>expect(digitalEmployeeApi.startOpinionRun).toHaveBeenCalledWith('demo-portal',expect.objectContaining({sourceCodes:['gdelt-global'],rangeHours:24,useAi:true,previewOnly:false})));
 });
 it('uses the shared detail tabs for topic and source configuration',async()=>{
  render(<PublicOpinionCenter systemCode="demo-portal" canManage canExecute/>);await screen.findByText(/监控品牌/);await userEvent.click(screen.getByRole('tab',{name:'主题与词库'}));expect(screen.getByText(/MAXHUB AND/)).toBeInTheDocument();await userEvent.click(screen.getByRole('tab',{name:'来源接口'}));expect(screen.getAllByText('GDELT全球新闻')).toHaveLength(2);expect(screen.getByText('已配置')).toBeInTheDocument();
 });
 it('opens event content in a separate detail region and shows readable source values',async()=>{
  vi.mocked(digitalEmployeeApi.getOpinionCenter).mockResolvedValue(centerWithEvent);
  render(<PublicOpinionCenter systemCode="demo-portal" canManage canExecute/>);
  await userEvent.click(await screen.findByRole('tab',{name:'舆情事件 1'}));
  await userEvent.click(screen.getByRole('button',{name:/OP-DEMO-001/}));
  const detail=screen.getByRole('complementary',{name:'OP-DEMO-001事件详情'});
  expect(detail).toHaveTextContent('事件摘要应显示在独立详情区');
  expect(detail).toHaveTextContent('GDELT全球新闻、行业资讯示例');
  expect(screen.getByText('3 条')).toBeInTheDocument();
 });
});
