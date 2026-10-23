import { act,render,screen,waitFor,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { type TimelineEntry,type TimelinePage,type ActivityWrite,type ActivityUpdate } from '@forge-crm/contracts';
import { ActivityPanel,localDateTime } from './ActivityPanel';
import { GatewayError,type EnterpriseGateway } from './gateway';
const entry=(id='a'):TimelineEntry=>({key:`ACTIVITY:${id}`,sourceType:'ACTIVITY',sourceId:id,type:'VISIT',title:`拜访-${id}`,content:'产品需求',result:'确认交期',nextStep:'报价',occurredAt:'2026-10-02T02:00:00.000Z',recordedAt:'2026-10-03T02:00:00.000Z',actorName:'张三',opportunityId:null,version:1,status:'ACTIVE',canEdit:true});
const page=(items=[entry()]):TimelinePage=>({items,nextCursor:null,snapshotAt:'2026-10-03T02:00:00.000Z',canCreate:true});
const api=()=>({list:vi.fn(async(_code:string,_kind:string,_id:string,_type:string,_cursor?:string)=>page()),create:vi.fn(async(_code:string,_kind:string,_id:string,_input:ActivityWrite)=>({sourceType:'ACTIVITY',sourceId:'new'})),update:vi.fn(async(_code:string,_source:string,_id:string,_input:ActivityUpdate)=>({saved:true}))});
const gateway={attachments:vi.fn(async()=>[])} as unknown as EnterpriseGateway;
beforeEach(()=>{vi.spyOn(window,'confirm').mockReturnValue(true);});
afterEach(()=>vi.restoreAllMocks());
describe('ActivityPanel',()=>{
 it('shows occurrence/recording times and filters types while clearing stale content',async()=>{
  const service=api(),user=userEvent.setup();render(<ActivityPanel systemCode="demo" kind="customer" recordId="c" gateway={gateway} api={service}/>);
  await screen.findByRole('button',{name:'拜访-a'});expect(screen.getByText(/录入时间/)).toBeVisible();
  service.list.mockResolvedValueOnce(page([]));await user.selectOptions(screen.getByRole('combobox',{name:'活动类型'}),'SYSTEM');expect(await screen.findByText('暂无活动记录')).toBeVisible();expect(screen.queryByRole('button',{name:'拜访-a'})).not.toBeInTheDocument();expect(service.list).toHaveBeenLastCalledWith('demo','customer','c','SYSTEM');
 });
 it('keeps failed form inputs and reuses the creation request ID when retrying',async()=>{
  const service=api(),user=userEvent.setup();service.create.mockRejectedValueOnce(new Error('连接中断'));
  render(<ActivityPanel systemCode="demo" kind="customer" recordId="c" gateway={gateway} api={service}/>);await user.click(await screen.findByRole('button',{name:'新增活动'}));
  const dialog=within(screen.getByRole('dialog'));await user.type(dialog.getByLabelText('标题'),'电话纪要');await user.type(dialog.getByLabelText('内容'),'已确认需求');await user.click(dialog.getByRole('button',{name:'保存活动'}));expect(await screen.findByRole('alert')).toHaveTextContent('连接中断');expect(dialog.getByLabelText('标题')).toHaveValue('电话纪要');
  await user.click(dialog.getByRole('button',{name:'保存活动'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(service.create.mock.calls[0][3].requestId).toBe(service.create.mock.calls[1][3].requestId);
 });
 it('author edit requires a reason and void preserves the record instead of deleting',async()=>{
  const service=api(),user=userEvent.setup();render(<ActivityPanel systemCode="demo" kind="customer" recordId="c" gateway={gateway} api={service}/>);
  await user.click(await screen.findByRole('button',{name:'拜访-a'}));await user.click(screen.getByRole('button',{name:'修改活动 拜访-a'}));const dialog=within(screen.getByRole('dialog'));expect(dialog.getByRole('button',{name:'保存活动'})).toBeDisabled();await user.selectOptions(dialog.getByLabelText('记录状态'),'DISABLED');await user.type(dialog.getByLabelText('修改原因'),'重复登记');await user.click(dialog.getByRole('button',{name:'保存活动'}));await waitFor(()=>expect(service.update).toHaveBeenCalledWith('demo','ACTIVITY','a',expect.objectContaining({version:1,status:'DISABLED',reason:'重复登记'})));
 });
 it('system events are read-only and never expose attachment mutations or activity edit controls',async()=>{
  const service=api(),user=userEvent.setup();service.list.mockResolvedValue({...page([{...entry(),sourceType:'STAGE_EVENT',type:'SYSTEM',title:'阶段变更',canEdit:false}]),canCreate:false});render(<ActivityPanel systemCode="demo" kind="opportunity" recordId="o" gateway={gateway} api={service}/>);
  await user.click(await screen.findByRole('button',{name:'阶段变更'}));expect(screen.queryByRole('button',{name:'新增活动'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/修改活动/})).not.toBeInTheDocument();expect(screen.queryByText('活动附件（最多10个）')).not.toBeInTheDocument();expect(screen.getByText(/系统留痕，只读/)).toBeVisible();
 });
 it('deduplicates loaded pages and clears cached entries if permissions/cursor invalidate continuation',async()=>{
  const service=api(),user=userEvent.setup();service.list.mockResolvedValueOnce({...page(),nextCursor:'cursor-1'}).mockResolvedValueOnce({...page([entry(),entry('b')]),nextCursor:'cursor-2'}).mockRejectedValueOnce(new GatewayError(403,'FORBIDDEN','权限已撤销'));
  render(<ActivityPanel systemCode="demo" kind="customer" recordId="c" gateway={gateway} api={service}/>);await user.click(await screen.findByRole('button',{name:'加载更多活动'}));await screen.findByRole('button',{name:'拜访-b'});expect(screen.getAllByRole('button',{name:'拜访-a'})).toHaveLength(1);await user.click(screen.getByRole('button',{name:'加载更多活动'}));expect(await screen.findByRole('alert')).toHaveTextContent('权限已撤销');expect(screen.queryByRole('button',{name:'拜访-a'})).not.toBeInTheDocument();
 });
 it('ignores old responses after changing records and reports unsaved editor state',async()=>{
  const service=api(),dirty=vi.fn(),user=userEvent.setup();let resolve!:(page:TimelinePage)=>void;service.list.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValueOnce(page([entry('new')]));
  const view=render(<ActivityPanel systemCode="demo" kind="customer" recordId="old" gateway={gateway} api={service} onDirtyChange={dirty}/>);view.rerender(<ActivityPanel systemCode="demo" kind="customer" recordId="new" gateway={gateway} api={service} onDirtyChange={dirty}/>);await screen.findByRole('button',{name:'拜访-new'});await act(async()=>resolve(page()));expect(screen.queryByRole('button',{name:'拜访-a'})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'新增活动'}));expect(dirty).toHaveBeenLastCalledWith(true);await user.keyboard('{Escape}');expect(window.confirm).not.toHaveBeenCalled();await waitFor(()=>expect(dirty).toHaveBeenLastCalledWith(false));
 });
 it('uses local datetime input instead of displaying UTC as local time',()=>{
  const date=new Date('2026-10-02T02:00:00.000Z');const local=localDateTime(date.toISOString());expect(new Date(local).getTime()).toBe(date.getTime());
 });
});
