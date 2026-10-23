import { describe, expect, it } from 'vitest';
import { approvalChannel, approvalHostPath, approvalPreviewOrigin, approvalRoute, parsePreviewMessage, previewEnabled, validApprovalRoute } from './protocol';
describe('approval preview bridge', () => {
  const frame = {} as Window;
  const data = {channel:approvalChannel,version:1,type:'state',route:'todo',title:'审批中心',count:21,dirty:false};
  const event = {origin:approvalPreviewOrigin,source:frame,data};
  it('limits the preview to development on loopback', () => {
    expect(previewEnabled('localhost',true)).toBe(true);
    expect(previewEnabled('127.0.0.1',true)).toBe(true);
    expect(previewEnabled('crm.example.com',true)).toBe(false);
    expect(previewEnabled('localhost',false)).toBe(false);
  });
  it('accepts only known preview routes, never business URLs', () => {
    for(const p of ['todo','definitions','definition/expense','instance/00000000-0000-4000-8000-000000000001']) expect(validApprovalRoute(p)).toBe(true);
    for(const p of ['/showcase/customers','https://example.com','../customers','definition/unknown','instance/x',{},null]) expect(validApprovalRoute(p)).toBe(false);
    expect(approvalRoute('/showcase/approval-center')).toBe('todo');
    expect(approvalRoute('/showcase/approval-center/../customers')).toBe(null);
    expect(approvalHostPath('todo')).toBe('/showcase/approval-center');
  });
  it('requires exact origin and source window', () => {
    expect(parsePreviewMessage(event,frame)).toEqual(data);
    expect(parsePreviewMessage({...event,origin:'http://localhost:5174'},frame)).toBe(null);
    expect(parsePreviewMessage({...event,source:{} as Window},frame)).toBe(null);
    expect(parsePreviewMessage(event,null)).toBe(null);
  });
  it('rejects malformed, oversized and unsupported messages', () => {
    for(const patch of [{version:2},{channel:'wrong'},{type:'execute'},{dirty:'yes'},{count:-1},{count:1.5},{count:Infinity},{title:'x'.repeat(101)},{route:'/api/delete'}]) expect(parsePreviewMessage({...event,data:{...data,...patch}},frame)).toBe(null);
    expect(parsePreviewMessage({...event,data:null},frame)).toBe(null);
    expect(parsePreviewMessage({...event,data:{channel:approvalChannel,version:1,type:'navigate',route:'done'}},frame)?.type).toBe('navigate');
  });
});
