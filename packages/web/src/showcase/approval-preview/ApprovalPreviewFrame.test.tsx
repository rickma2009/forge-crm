import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApprovalPreviewFrame } from './ApprovalPreviewFrame';
import { approvalChannel, approvalPreviewOrigin } from './protocol';
afterEach(()=>vi.useRealTimers());
describe('approval preview frame',()=>{
 it('shows startup guidance when unavailable and allows retry',()=>{
  vi.useFakeTimers();render(<ApprovalPreviewFrame route="todo" refreshKey={0} onNavigate={()=>{}} onState={()=>{}}/>);
  act(()=>vi.advanceTimersByTime(10001));expect(screen.getByRole('alert')).toHaveTextContent('审批原型服务尚未就绪');
  fireEvent.click(screen.getByRole('button',{name:'重试审批预览'}));expect(screen.getByRole('status')).toHaveTextContent('正在打开');
 });
 it('accepts state and navigation only from the mounted iframe',()=>{
  const onState=vi.fn(),onNavigate=vi.fn();render(<ApprovalPreviewFrame route="todo" refreshKey={0} onNavigate={onNavigate} onState={onState}/>);
  const frame=screen.getByTitle('审批中心原型预览') as HTMLIFrameElement;
  const send=(data:unknown,source:Window|null=frame.contentWindow)=>fireEvent(window,new MessageEvent('message',{origin:approvalPreviewOrigin,source,data}));
  send({channel:approvalChannel,version:1,type:'state',route:'todo',title:'审批中心',count:21,dirty:false});
  expect(onState).toHaveBeenCalledWith('/showcase/approval-center','审批中心',21,false);
  send({channel:approvalChannel,version:1,type:'navigate',route:'done'},window);expect(onNavigate).not.toHaveBeenCalled();
  send({channel:approvalChannel,version:1,type:'navigate',route:'done'});expect(onNavigate).toHaveBeenCalledWith('/showcase/approval-center/done');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();expect(frame).toHaveAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals');
 });
});
