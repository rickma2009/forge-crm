import { act,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { salesInteractionApi as api } from './sales-interaction-api';
import { SalesGuidancePanel,PriorityScorePanel } from './SalesGuidancePanel';
import { RecordCollaborationPanel } from './RecordCollaborationPanel';
import { NotificationPanel } from './NotificationPanel';
import type { EnterpriseGateway } from './gateway';
import type { PriorityScore,SalesSuggestion,RecordComment } from '@forge-crm/contracts';
vi.mock('./sales-interaction-api',()=>({salesInteractionApi:{suggestions:vi.fn(),todos:vi.fn(),act:vi.fn(),complete:vi.fn(),score:vi.fn(),override:vi.fn(),rules:vi.fn(),createRule:vi.fn(),ruleState:vi.fn(),comments:vi.fn(),draft:vi.fn(),publish:vi.fn(),commentState:vi.fn(),members:vi.fn(),notifications:vi.fn(),read:vi.fn()}}));
vi.mock('../common/data-grid/DeclarativeDataGrid',()=>({DeclarativeDataGrid:({children}:{children:React.ReactNode})=><table>{children}</table>}));
const gateway={attachments:vi.fn(async()=>[]),uploadAttachment:vi.fn(async()=>({}))} as unknown as EnterpriseGateway;
const suggestion:SalesSuggestion={id:'s',ruleCode:'R01',ruleVersion:1,title:'联系客户',reason:'超过7天未跟进',basisAt:'2026-10-01T00:00:00Z',state:'ACTIVE',version:1,inputHash:'a'.repeat(64),resumeAt:null,todoId:null,canAct:true};
const score:PriorityScore={systemScore:55,effectiveScore:55,dimensions:[{code:'amount',label:'金额潜力',score:0,max:30,reasons:['未配置币别，不可评估']}],ruleVersion:1,calculatedAt:'2026-10-01T00:00:00Z',stale:false,closed:false,message:'跟进优先级，不代表成交概率',inputHash:'b'.repeat(64),override:null,canOverride:true,canManageRules:true};
const comment:RecordComment={id:'m',rootCommentId:null,authorName:'张三',body:'<script>alert(1)</script>',state:'PUBLISHED',version:2,createdAt:'2026-10-01T00:00:00Z',canEdit:true,canModerate:false,mentions:[]};
beforeEach(()=>{
 vi.resetAllMocks();vi.spyOn(window,'confirm').mockReturnValue(true);vi.mocked(gateway.attachments).mockResolvedValue([]);
 vi.mocked(api.suggestions).mockResolvedValue({items:[suggestion],basis:'基于当前可见记录',canAdopt:true});vi.mocked(api.todos).mockResolvedValue([]);vi.mocked(api.act).mockResolvedValue({todoId:'t'});vi.mocked(api.complete).mockResolvedValue({});vi.mocked(api.score).mockResolvedValue(score);vi.mocked(api.override).mockResolvedValue({});vi.mocked(api.comments).mockResolvedValue({items:[comment],canCreate:true,nextCursor:null});vi.mocked(api.draft).mockResolvedValue({id:'draft',version:1});vi.mocked(api.publish).mockResolvedValue({});vi.mocked(api.members).mockResolvedValue({items:[],nextCursor:null});vi.mocked(api.notifications).mockResolvedValue({items:[],unread:0,nextCursor:null});vi.mocked(api.read).mockResolvedValue({});
});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('retains failed adoption inputs and retries the same request without calling a model',async()=>{
 vi.mocked(api.act).mockRejectedValueOnce(new Error('网络中断'));const user=userEvent.setup();render(<SalesGuidancePanel systemCode="demo" kind="customer" recordId="c"/>);await user.click(await screen.findByRole('button',{name:'确认采纳建议'}));const d=within(screen.getByRole('dialog'));await user.clear(d.getByLabelText('待办标题'));await user.type(d.getByLabelText('待办标题'),'明日联系客户');await user.click(d.getByRole('button',{name:'确认'}));expect(await screen.findByRole('alert')).toHaveTextContent('网络中断');expect(d.getByLabelText('待办标题')).toHaveValue('明日联系客户');await user.click(d.getByRole('button',{name:'确认'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(api.act).toHaveBeenCalledTimes(2);expect(vi.mocked(api.act).mock.calls[0][2]).toEqual(vi.mocked(api.act).mock.calls[1][2]);
});
it('does not expose suggestion mutations when server capabilities deny them',async()=>{
 vi.mocked(api.suggestions).mockResolvedValue({items:[{...suggestion,canAct:false}],basis:'当前可见',canAdopt:false});render(<SalesGuidancePanel systemCode="demo" kind="opportunity" recordId="o"/>);await screen.findByText('联系客户');expect(screen.queryByRole('button',{name:'确认采纳建议'})).not.toBeInTheDocument();
});
it('records todo completion results and optimistic version',async()=>{
 vi.mocked(api.todos).mockResolvedValue([{id:'t',title:'确认需求',description:'待办',status:'OPEN',result:'',dueDate:null,version:3}]);const user=userEvent.setup();render(<SalesGuidancePanel systemCode="demo" kind="opportunity" recordId="o"/>);await user.click(await screen.findByRole('button',{name:'确认处理待办'}));const d=within(screen.getByRole('dialog'));await user.type(d.getByLabelText('实际结果或取消原因'),'已与客户确认');await user.click(d.getByRole('button',{name:'保存'}));await waitFor(()=>expect(api.complete).toHaveBeenCalledWith('demo','t',{status:'DONE',result:'已与客户确认',version:3}));
});
it('ignores old record requests after switching objects',async()=>{
 let resolve!:(value:Awaited<ReturnType<typeof api.suggestions>>)=>void;vi.mocked(api.suggestions).mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValueOnce({items:[],basis:'新对象',canAdopt:false});const view=render(<SalesGuidancePanel systemCode="demo" kind="customer" recordId="old"/>);view.rerender(<SalesGuidancePanel systemCode="demo" kind="customer" recordId="new"/>);await screen.findByText('暂无触发的销售建议');await act(async()=>resolve({items:[suggestion],basis:'旧对象',canAdopt:true}));expect(screen.queryByText('联系客户')).not.toBeInTheDocument();
});
it('shows score explanations, locks closed records and does not call priority a probability',async()=>{
 vi.mocked(api.score).mockResolvedValue({...score,closed:true});render(<PriorityScorePanel systemCode="demo" recordId="o"/>);expect(await screen.findByText('跟进优先级，不代表成交概率')).toBeVisible();expect(screen.getByText('未配置币别，不可评估')).toBeVisible();expect(screen.getByRole('button',{name:'人工覆盖 / 恢复'})).toBeDisabled();
});
it('submits manual restoration with reason and current score fingerprint',async()=>{
 const user=userEvent.setup();render(<PriorityScorePanel systemCode="demo" recordId="o"/>);await user.click(await screen.findByRole('button',{name:'人工覆盖 / 恢复'}));const d=within(screen.getByRole('dialog'));await user.selectOptions(d.getByLabelText('操作'),'restore');await user.type(d.getByLabelText('原因'),'恢复自动评估');await user.click(d.getByRole('button',{name:'保存'}));await waitFor(()=>expect(api.override).toHaveBeenCalledWith('demo','o',expect.objectContaining({score:null,reason:'恢复自动评估',inputHash:score.inputHash,currentOverrideId:null})));
});
it('creates a draft rule without implicitly publishing it',async()=>{
 const current={id:'r',ruleVersion:1,state:'PUBLISHED' as const,config:{sourceScores:{},amountThresholds:{}},version:1,createdAt:'2026-10-01T00:00:00Z'};vi.mocked(api.rules).mockResolvedValueOnce([current]).mockResolvedValue([{...current,id:'r2',ruleVersion:2,state:'DRAFT'},current]);vi.mocked(api.createRule).mockResolvedValue({id:'r2'});const user=userEvent.setup();render(<PriorityScorePanel systemCode="demo" recordId="o"/>);await user.click(await screen.findByRole('button',{name:'评分规则'}));await screen.findByRole('option',{name:'版本 1 · 已发布'});await user.click(screen.getByRole('button',{name:'保存为新草稿版本'}));await screen.findByRole('option',{name:'版本 2 · 草稿'});expect(api.ruleState).not.toHaveBeenCalled();
});
it('renders comment content as plain text and creates uploads without submitting the parent comment',async()=>{
 const user=userEvent.setup();render(<RecordCollaborationPanel systemCode="demo" kind="opportunity" recordId="o" gateway={gateway}/>);await screen.findByText('<script>alert(1)</script>');expect(document.querySelector('script')).toBeNull();await user.click(screen.getByRole('button',{name:'发表评论'}));const d=within(await screen.findByRole('dialog',{name:'发表评论'}));await user.type(d.getByLabelText('评论内容'),'测试附件上传');await user.click(d.getByRole('button',{name:'上传附件'}));expect(await screen.findByRole('dialog',{name:'上传附件'})).toBeVisible();expect(document.querySelector('form form')).toBeNull();expect(api.publish).not.toHaveBeenCalled();await user.keyboard('{Escape}');expect(screen.queryByRole('dialog',{name:'上传附件'})).not.toBeInTheDocument();expect(screen.getByRole('dialog',{name:'发表评论'})).toBeVisible();
});
it('preserves failed comment text and draft ID for retry',async()=>{
 vi.mocked(api.publish).mockRejectedValueOnce(new Error('提及成员已无权限'));const user=userEvent.setup();render(<RecordCollaborationPanel systemCode="demo" kind="customer" recordId="c" gateway={gateway}/>);await user.click(await screen.findByRole('button',{name:'发表评论'}));const d=within(await screen.findByRole('dialog',{name:'发表评论'}));await user.type(d.getByLabelText('评论内容'),'保留这段内容');await user.click(d.getByRole('button',{name:'发送评论'}));expect(await screen.findByRole('alert')).toHaveTextContent('提及成员已无权限');expect(d.getByLabelText('评论内容')).toHaveValue('保留这段内容');await user.click(d.getByRole('button',{name:'发送评论'}));await waitFor(()=>expect(api.publish).toHaveBeenCalledTimes(2));expect(vi.mocked(api.publish).mock.calls[0]).toEqual(vi.mocked(api.publish).mock.calls[1]);
});
it('hides revoked notification body/link and marks only current user notification IDs',async()=>{
 vi.mocked(api.notifications).mockResolvedValue({items:[{id:'n',readAt:null,createdAt:'2026-10-01T00:00:00Z',title:'协作通知（内容不可用）',body:'权限已变化',path:null,available:false}],unread:1,nextCursor:null});const user=userEvent.setup(),nav=vi.fn();render(<NotificationPanel systemCode="demo" onNavigate={nav}/>);await screen.findByText('权限已变化');expect(screen.queryByRole('button',{name:'协作通知（内容不可用）'})).not.toBeInTheDocument();await user.click(screen.getByRole('button',{name:'确认已读通知'}));expect(api.read).toHaveBeenCalledWith('demo',{ids:['n']});expect(nav).not.toHaveBeenCalled();
});
it('pauses notification polling while the document is hidden',async()=>{
 vi.useFakeTimers();render(<NotificationPanel systemCode="demo" onNavigate={vi.fn()}/>);await act(async()=>{});expect(screen.getByText('暂无协作通知')).toBeVisible();const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(true);await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));await vi.advanceTimersByTimeAsync(30000);});expect(api.notifications).toHaveBeenCalledTimes(1);hidden.mockReturnValue(false);await act(async()=>document.dispatchEvent(new Event('visibilitychange')));expect(api.notifications).toHaveBeenCalledTimes(2);
});
