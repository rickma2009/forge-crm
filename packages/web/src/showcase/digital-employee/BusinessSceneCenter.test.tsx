import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {businessSceneConfigSchema,type BusinessSceneRecord,type BusinessSceneCenter as Center} from '@forge-crm/contracts';
import {BusinessSceneCenter} from './BusinessSceneCenter';
import {businessScenesApi} from './business-scenes-api';
vi.mock('./business-scenes-api',()=>({businessScenesApi:{center:vi.fn(),detail:vi.fn(),action:vi.fn(),config:vi.fn()}}));
// The grid itself has its own tests; exercise scene lifecycle and pagination wiring here.
vi.mock('../../common/data-grid/LazyBusinessDataGrid',()=>({BusinessDataGrid:({rows,columns,rowActions,page,onPageChange}: {rows:BusinessSceneRecord[];columns:{key:string;render?:(r:BusinessSceneRecord)=>React.ReactNode}[];rowActions?:(r:BusinessSceneRecord)=>React.ReactNode;page:number;onPageChange:(p:number)=>void})=><div>{rows.map(r=><div key={r.id}>{columns[0].render?.(r)}{rowActions?.(r)}</div>)}<button onClick={()=>onPageChange(page+1)}>下一页</button></div>}));
const record:BusinessSceneRecord={id:'DEMO-PO-001',code:'DEMO-PO202610001',kind:'PURCHASE',title:'模拟芯片供应回签',status:'PENDING_REVIEW',owner:'admin',note:'',draft:'',actionPlan:'',evidence:['DEMO:PO/snapshot/001'],events:[],purchase:{sourceNumber:'DEMO-PO001',sourceLine:1,supplier:'测试供应商',materialCode:'DEMO-M001',materialName:'芯片',orderedQty:100,priceMinor:500,expectedDate:'2026-10-15',confirmedQty:null,confirmedPriceMinor:null,confirmedDate:null,currency:'CNY'}};
const initial:Center={scenarioCode:'SCN-PO',version:1,config:businessSceneConfigSchema.parse({owner:'admin'}),connectionStatus:'DEMO',records:[record],total:15,page:1,pageSize:20,summary:{total:15,open:12,closed:3,included:0,approvedAmountMinor:0,budgetMinor:0}};
const mount=(execute=true)=>render(<BusinessSceneCenter systemCode="demo-portal" scenarioCode="SCN-PO" canManage={execute} canExecute={execute}/>);
beforeEach(()=>{vi.clearAllMocks();vi.mocked(businessScenesApi.center).mockResolvedValue(initial);vi.mocked(businessScenesApi.detail).mockResolvedValue({record,version:1});});
describe('business scene interactions',()=>{
 it('uses default 20-row pagination, query reset and read-only permissions',async()=>{
  mount(false);await screen.findByText(record.code);expect(screen.queryByRole('button',{name:'编辑核对'})).not.toBeInTheDocument();
  expect(businessScenesApi.center).toHaveBeenLastCalledWith('demo-portal','SCN-PO',expect.objectContaining({page:1,pageSize:20}));fireEvent.click(screen.getByText('下一页'));await waitFor(()=>expect(businessScenesApi.center).toHaveBeenLastCalledWith('demo-portal','SCN-PO',expect.objectContaining({page:2})));
  fireEvent.change(screen.getByLabelText('编码 / 主题 / 客户'),{target:{value:'芯片'}});fireEvent.click(screen.getByRole('button',{name:'查询'}));await waitFor(()=>expect(businessScenesApi.center).toHaveBeenLastCalledWith('demo-portal','SCN-PO',expect.objectContaining({page:1,query:'芯片'})));
 });
 it('keeps failed edits open and renders acknowledged status with the next version',async()=>{
  mount();fireEvent.click(await screen.findByText(record.code));fireEvent.click(await screen.findByRole('button',{name:'编辑 / 核对'}));const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByLabelText('回签数量'),{target:{value:'100'}});fireEvent.change(within(dialog).getByLabelText('回签核对说明'),{target:{value:'人工核对回签'}});
  vi.mocked(businessScenesApi.action).mockRejectedValueOnce(new Error('场景已更新，请刷新'));fireEvent.click(within(dialog).getByRole('button',{name:'保存'}));await waitFor(()=>expect(within(dialog).getByRole('alert')).toHaveTextContent('场景已更新'));expect(screen.getByRole('dialog')).toBeInTheDocument();
  const saved={...record,status:'CONFIRMED' as const,note:'人工核对回签'};vi.mocked(businessScenesApi.action).mockResolvedValueOnce({record:saved,version:2});fireEvent.click(within(dialog).getByRole('button',{name:'保存'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(screen.getAllByText('已核对').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button',{name:'关闭演示记录'}));const close=screen.getByRole('dialog');fireEvent.change(within(close).getByLabelText('处理结论 / 原因'),{target:{value:'演示验证完成'}});vi.mocked(businessScenesApi.action).mockResolvedValueOnce({record:{...saved,status:'CLOSED'},version:3});fireEvent.click(within(close).getByRole('button',{name:'确认'}));await waitFor(()=>expect(businessScenesApi.action).toHaveBeenLastCalledWith('demo-portal','SCN-PO',record.id,expect.objectContaining({version:2,action:'CLOSE'})));await screen.findByRole('button',{name:'重新打开'});
 });
 it('saves API parameters separately and cancellation discards without confirmation',async()=>{
  const confirm=vi.spyOn(window,'confirm');mount();fireEvent.click(await screen.findByRole('tab',{name:'接口与规则配置'}));fireEvent.click(screen.getByRole('button',{name:'编辑接口与规则'}));fireEvent.change(screen.getByLabelText('接口地址'),{target:{value:'https://api.example.com'}});fireEvent.click(screen.getByRole('button',{name:'取消'}));expect(confirm).not.toHaveBeenCalled();expect(businessScenesApi.config).not.toHaveBeenCalled();confirm.mockRestore();
  fireEvent.click(screen.getByRole('button',{name:'编辑接口与规则'}));fireEvent.change(screen.getByLabelText('数据模式'),{target:{value:'API'}});fireEvent.change(screen.getByLabelText('接口地址'),{target:{value:'https://api.example.com'}});fireEvent.change(screen.getByLabelText('资源路径'),{target:{value:'/v1/orders'}});
  const configured={...initial,version:2,records:[],total:0,connectionStatus:'CONFIGURED' as const,config:{...initial.config,sourceMode:'API' as const,baseUrl:'https://api.example.com',endpoint:'/v1/orders'}};vi.mocked(businessScenesApi.config).mockResolvedValueOnce(configured);vi.mocked(businessScenesApi.center).mockResolvedValue(configured);fireEvent.click(screen.getByRole('button',{name:'保存'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(screen.getByText('配置已保存，待数据适配与联调')).toBeInTheDocument();fireEvent.click(screen.getByRole('tab',{name:'回签清单'}));expect(screen.queryByText(record.code)).not.toBeInTheDocument();
 });
 it('does not open editing when the detail request fails',async()=>{
  vi.mocked(businessScenesApi.detail).mockRejectedValueOnce(new Error('无权访问记录'));mount();fireEvent.click(await screen.findByRole('button',{name:'编辑核对'}));await screen.findByText('无权访问记录');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(businessScenesApi.action).not.toHaveBeenCalled();
 });
});
