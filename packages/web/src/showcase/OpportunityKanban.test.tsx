import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { businessListDefaultConfig, type Opportunity, type OpportunityBoard, type OpportunityTemplate, type OpportunityStageCommand, type OpportunityDetail } from '@forge-crm/contracts';
import { OpportunityKanban, OpportunityBoardControls } from './OpportunityKanban';
import type { DirectoryExtension } from '../common/BusinessDirectory';
import { GatewayError, type EnterpriseGateway } from './gateway';
const row = { id: 'a', opportunityCode: 'O-001', opportunityName: '测试商机', stageId: 's1', stageName: '初始', templateId: 't', status: 'ACTIVE', businessStatus: 'FOLLOWING', version: 3, customerName: '客户', confidence: 50, expectedAmount: 123, expectedAmountExact: '123.00' } as Opportunity;
const stage = (id: string, name: string, status = 'ACTIVE') => ({ id, stageName: name, status }) as OpportunityTemplate['stages'][number];
const data = (): OpportunityBoard => ({ templateId: 't', columns: [
 { stage: stage('s1','初始'), items: [row], total: 21, amount: '456.00', missingAmount: 2, nextCursor: 'a' },
 { stage: stage('s2','技术确认'), items: [], total: 0, amount: '0.00', missingAmount: 0, nextCursor: null },
] });
const context = (): DirectoryExtension => ({ config: { ...businessListDefaultConfig('opportunity-directory'), viewMode: 'KANBAN', kanban: { templateId: 't', cardFields: ['customerName','expectedAmount'] } }, query: { keyword: '', status: '' }, revision: '0', busy: false, canSave: true, saveConfig: vi.fn(async()=>{}), fallback: vi.fn() });
const api = () => ({ load: vi.fn(async (_system: string, _query: URLSearchParams) => data()), move: vi.fn(async (_system: string, _id: string, _input: OpportunityStageCommand) => ({} as OpportunityDetail)) });
describe('opportunity kanban', () => {
 it('supports keyboard-confirmed movement with mandatory reason, keeps card stationary until success', async () => {
  const service = api(), user = userEvent.setup(); render(<OpportunityKanban context={context()} systemCode="demo" allowedActions={['update']} onOpen={vi.fn()} api={service} />);
  const move = await screen.findByRole('button',{name:'变更阶段 O-001'}); move.focus(); await user.keyboard('{Enter}');
  expect(screen.getByRole('button',{name:'确定变更'})).toBeDisabled(); expect(screen.getByRole('combobox',{name:'目标阶段'})).toHaveFocus();
  await user.type(screen.getByRole('textbox',{name:'变更理由'}),'客户已确认');
  await user.click(screen.getByRole('button',{name:'确定变更'}));
  await waitFor(()=>expect(service.move).toHaveBeenCalledWith('demo','a',expect.objectContaining({stageId:'s2',reason:'客户已确认',version:3,requestId:expect.any(String)})));
  expect(await screen.findByText('阶段已更新，已刷新看板汇总。')).toBeVisible(); expect(service.load).toHaveBeenCalledTimes(2);
 });
 it('cancel does not write and restores keyboard focus; read-only users cannot move', async () => {
  const service=api(), user=userEvent.setup(); const view=render(<OpportunityKanban context={context()} systemCode="demo" allowedActions={['update']} onOpen={vi.fn()} api={service} />);
  await user.click(await screen.findByRole('button',{name:'变更阶段 O-001'})); await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(service.move).not.toHaveBeenCalled(); expect(screen.getByRole('button',{name:'变更阶段 O-001'})).toHaveFocus();
  view.rerender(<OpportunityKanban context={context()} systemCode="demo" allowedActions={[]} onOpen={vi.fn()} api={service} />); expect(screen.queryByRole('button',{name:'变更阶段 O-001'})).not.toBeInTheDocument();
 });
 it('loads per-column pages without duplicate cards and keeps full totals', async () => {
  const service=api(),user=userEvent.setup(); service.load.mockResolvedValueOnce(data()).mockResolvedValueOnce({templateId:'t',columns:[{...data().columns[0],items:[row,{...row,id:'b',opportunityCode:'O-002'}],nextCursor:null}]});
  render(<OpportunityKanban context={context()} systemCode="demo" allowedActions={[]} onOpen={vi.fn()} api={service}/>);
  await user.click(await screen.findByRole('button',{name:'加载更多 · 初始'})); await screen.findByRole('link',{name:'O-002'});
  expect(screen.getAllByRole('link',{name:'O-001'})).toHaveLength(1); expect(screen.getByText('21 个商机 · 预计金额 456.00')).toBeVisible(); expect(service.load.mock.calls[1][1].get('after')).toBe('a');
 });
 it('409 closes stale confirmation and refreshes without optimistic card movement', async () => {
  const service=api(),user=userEvent.setup(); service.move.mockRejectedValue(new GatewayError(409,'BAD_REQUEST','版本冲突'));
  render(<OpportunityKanban context={context()} systemCode="demo" allowedActions={['update']} onOpen={vi.fn()} api={service}/>);
  await user.click(await screen.findByRole('button',{name:'变更阶段 O-001'})); await user.type(screen.getByRole('textbox',{name:'变更理由'}),'推进'); await user.click(screen.getByRole('button',{name:'确定变更'}));
  expect(await screen.findByText('商机已变化，已刷新看板；请重新选择阶段。')).toBeVisible(); await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); expect(service.load).toHaveBeenCalledTimes(2);
 });
 it('drag opens the same confirmation without submitting and does not navigate', async () => {
  const service=api(),open=vi.fn(); render(<OpportunityKanban context={context()} systemCode="demo" allowedActions={['update']} onOpen={open} api={service}/>);
  await screen.findByRole('link',{name:'O-001'});
  const dataTransfer={effectAllowed:'',setData:vi.fn()}; fireEvent.dragStart(screen.getByTitle(/拖动卡片/),{dataTransfer}); fireEvent.drop(screen.getByRole('region',{name:'技术确认阶段'}),{dataTransfer});
  expect(screen.getByRole('dialog')).toBeVisible(); expect(service.move).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
 });
 it('failed requests keep the dialog and reuse the command request ID on retry', async () => {
  const service=api(),user=userEvent.setup(); service.move.mockRejectedValueOnce(new Error('网络中断'));
  render(<OpportunityKanban context={context()} systemCode="demo" allowedActions={['update']} onOpen={vi.fn()} api={service}/>);
  await user.click(await screen.findByRole('button',{name:'变更阶段 O-001'})); await user.type(screen.getByRole('textbox',{name:'变更理由'}),'推进'); await user.click(screen.getByRole('button',{name:'确定变更'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('网络中断'); await user.click(screen.getByRole('button',{name:'确定变更'})); await waitFor(()=>expect(service.move).toHaveBeenCalledTimes(2)); expect(service.move.mock.calls[0]).toEqual(service.move.mock.calls[1]);
 });
 it('persists mode while preserving table widths/page size and falls back when template is invalid', async () => {
  const ctx=context(),user=userEvent.setup(); const gateway={opportunityTemplates:vi.fn(async()=>[{id:'t',templateName:'公共',isDefault:true,status:'ACTIVE',stages:[]}])} as unknown as EnterpriseGateway;
  const view=render(<OpportunityBoardControls context={ctx} systemCode="demo" gateway={gateway}/>); await screen.findByRole('option',{name:'公共'});
  await user.click(screen.getByRole('button',{name:'表格'})); expect(ctx.saveConfig).toHaveBeenCalledWith({...ctx.config,schemaVersion:2,viewMode:'TABLE'});
  view.unmount(); const missing={opportunityTemplates:vi.fn(async()=>[])} as unknown as EnterpriseGateway; render(<OpportunityBoardControls context={ctx} systemCode="demo" gateway={missing}/>); await waitFor(()=>expect(ctx.fallback).toHaveBeenCalledWith(expect.stringContaining('模板已失效')));
 });
});
