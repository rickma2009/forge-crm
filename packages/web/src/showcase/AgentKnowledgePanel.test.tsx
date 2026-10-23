import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {vi} from 'vitest';
import {AgentKnowledgePanel} from './AgentKnowledgePanel';
import {write} from './gateway';
vi.mock('./gateway',()=>({write:vi.fn()}));
it('requires review and sends an immutable revision while cancel closes directly',async()=>{
 vi.mocked(write).mockResolvedValue({} as Response);const saved=vi.fn(async()=>{});
 render(<AgentKnowledgePanel base="/agent" items={[{id:'v2',documentId:'doc',revision:2,title:'连接 FAQ',kind:'FAQ',content:'经核查规格',status:'ACTIVE',validUntil:null,expired:false}]} onSaved={saved} onError={vi.fn()}/>);
 fireEvent.click(await screen.findByRole('button',{name:'连接 FAQ'}));fireEvent.click(screen.getByRole('button',{name:'保存已核查资料'}));expect(await screen.findByText('请确认已核查内容')).toBeInTheDocument();expect(write).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'保存已核查资料'}));await waitFor(()=>expect(write).toHaveBeenCalledWith('/agent/knowledge',expect.objectContaining({documentId:'doc',revision:2,reviewed:true})));await waitFor(()=>expect(saved).toHaveBeenCalled());
 fireEvent.click(screen.getByRole('button',{name:'新增资料'}));fireEvent.change(screen.getByRole('textbox',{name:'资料标题'}),{target:{value:'尚未保存'}});fireEvent.click(screen.getByRole('button',{name:'取消'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
