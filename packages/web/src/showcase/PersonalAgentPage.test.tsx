import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { call, write } from './gateway';
import { PersonalAgentPage } from './PersonalAgentPage';

vi.mock('./gateway', () => ({ call: vi.fn(), write: vi.fn(), GatewayError: class GatewayError extends Error {} }));
const response = (value: unknown) => ({ json: async () => value }) as Response;
const conversation = { id: 'conv-1', title: '新会话', contextType: 'NONE', contextId: null, archived: false, createdAt: '2026-09-30T10:00:00Z', updatedAt: '2026-09-30T10:00:00Z' };
const detail = { ...conversation, messages: [] as unknown[] };

describe('personal Agent workspace', () => {
  beforeEach(() => {
    vi.mocked(call).mockReset(); vi.mocked(write).mockReset();
    vi.mocked(call).mockImplementation(async (path) => response(path.endsWith('/users') ? [] : path.includes('/conversations/conv-1') ? detail : []));
  });
  it('creates a private conversation and saves a reviewed todo only after confirmation', async () => {
    vi.mocked(write).mockImplementation(async (path) => {
      if (path.endsWith('/conversations')) return response(conversation);
      if (path.endsWith('/messages')) return response({ ...conversation, messages: [
        { id: 'user-1', role: 'USER', status: 'COMPLETED', content: '生成跟进待办', createdAt: conversation.createdAt, sourceRefs: [], todoDraft: null, todoSaved: false, error: null },
        { id: 'reply-1', role: 'ASSISTANT', status: 'COMPLETED', content: '建议联系客户', createdAt: conversation.createdAt, sourceRefs: [], todoDraft: { title: '跟进客户', description: '确认需求', dueDate: null }, todoSaved: false, error: null },
      ] });
      return response({ id: 'todo-1' });
    });
    render(<PersonalAgentPage systemCode="demo-portal" onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /新会话/ }));
    await screen.findByRole('textbox', { name: '输入问题' });
    fireEvent.change(screen.getByRole('textbox', { name: '输入问题' }), { target: { value: '生成跟进待办' } });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(await screen.findByText('建议联系客户')).toBeInTheDocument();
    expect(vi.mocked(write)).toHaveBeenCalledTimes(2);
    fireEvent.change(screen.getByRole('textbox', { name: '标题' }), { target: { value: '人工调整的待办' } });
    fireEvent.click(screen.getByRole('button', { name: '确认保存待办' }));
    await waitFor(() => expect(vi.mocked(write)).toHaveBeenCalledWith(expect.stringContaining('/messages/reply-1/todo'), expect.objectContaining({ title: '人工调整的待办' })));
    expect(await screen.findByText('已保存的待办')).toBeInTheDocument();
  });
 it('confirms only the selected meeting action and keeps the other editable',async()=>{
  vi.mocked(write).mockImplementation(async path=>path.endsWith('/conversations')?response(conversation):path.endsWith('/messages')?response({...conversation,messages:[{id:'reply-2',role:'ASSISTANT',status:'COMPLETED',content:'会议行动',createdAt:conversation.createdAt,sourceRefs:[],todoDraft:null,todoDrafts:[{title:'核查规格',description:'确认',dueDate:null},{title:'准备材料',description:'核对',dueDate:null}],savedActions:[],todoSaved:false,error:null}]}):response({id:'todo-2',draftIndex:1,status:'OPEN',version:1,canComplete:true,result:''}));
  render(<PersonalAgentPage systemCode="demo-portal" onNavigate={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:/新会话/}));await screen.findByRole('textbox',{name:'输入问题'});fireEvent.change(screen.getByRole('textbox',{name:'输入问题'}),{target:{value:'会议行动'}});fireEvent.click(screen.getByRole('button',{name:'发送'}));await screen.findByText('会议行动');fireEvent.click(screen.getAllByRole('button',{name:'确认保存待办'})[1]);await waitFor(()=>expect(vi.mocked(write)).toHaveBeenCalledWith(expect.stringContaining('/messages/reply-2/todo'),expect.objectContaining({draftIndex:1,title:'准备材料'})));expect(screen.getAllByRole('button',{name:'确认保存待办'})).toHaveLength(1);
 });

});
