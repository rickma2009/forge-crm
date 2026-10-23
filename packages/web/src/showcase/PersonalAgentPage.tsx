import { useEffect, useState, type FormEvent } from 'react';
import { IconArchive, IconArrowLeft, IconPlus, IconSend, IconTrash } from '@tabler/icons-react';
import { call, write, GatewayError } from './gateway';
import './personal-agent.css';
import { AgentKnowledgePanel, type Knowledge } from './AgentKnowledgePanel';
import { DetailTabs } from '../common/DetailWorkspace';
import { SalesActionDialog } from '../common/SalesActionDialog';

type ContextType = 'NONE' | 'CUSTOMER' | 'OPPORTUNITY';
type Conversation = { id: string; title: string; contextType: ContextType; contextId: string | null; archived: boolean; createdAt: string; updatedAt: string };
type Ref = { id: string; kind: string; title: string; path: string; capturedAt: string };
type Draft = { title: string; description: string; dueDate: string | null };
type SavedAction = {id:string;draftIndex:number;status:string;result:string;version:number;canComplete:boolean};
type Message = { id: string; role: 'USER' | 'ASSISTANT'; content: string; status: string; error: string | null; sourceRefs: Ref[]; todoDrafts?:Draft[]; savedActions?:SavedAction[]; todoDraft: Draft | null; todoSaved: boolean; createdAt: string };
type Detail = Conversation & { messages: Message[] };
type RecordResult = { id: string; kind: string; title: string; path: string };
type User = { id: string; displayName: string; account: string };
const messageOf = (error: unknown) => error instanceof GatewayError ? error.message : error instanceof Error ? error.message : '操作失败，请稍后重试';

export function PersonalAgentPage({ systemCode, onNavigate, context, initialMode='CHAT' }: { systemCode: string; onNavigate: (path: string) => void; context?: { type: Exclude<ContextType, 'NONE'>; id: string }; initialMode?:'CHAT'|'EMAIL_DRAFT' }) {
  const base = `/api/systems/${encodeURIComponent(systemCode)}/personal-agent`;
  const [list, setList] = useState<Conversation[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<RecordResult[]>([]);
  const [recordQuery, setRecordQuery] = useState('');
  const [recordType, setRecordType] = useState<'CUSTOMER' | 'OPPORTUNITY'>('CUSTOMER');
  const [choosing, setChoosing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [mode,setMode]=useState<'CHAT'|'MEETING'|'EMAIL_DRAFT'>(initialMode);
  const [panel,setPanel]=useState('chat');
  const [knowledge,setKnowledge]=useState<Knowledge[]>([]);
  const [knowledgeIds,setKnowledgeIds]=useState<string[]>([]);
  const [preview,setPreview]=useState<Knowledge|null>(null);
  const refreshKnowledge=async()=>setKnowledge(await (await call(`${base}/knowledge`)).json() as Knowledge[]);
  useEffect(()=>{void refreshKnowledge().catch(e=>setError(messageOf(e)));},[base]);
  const [savedTodoMessages, setSavedTodoMessages] = useState<string[]>([]);
  const refreshList = async () => setList(await (await call(`${base}/conversations?${new URLSearchParams({ query, archived: String(archived) })}`)).json() as Conversation[]);
  const open = async (id: string) => { setError(''); const next=await (await call(`${base}/conversations/${id}`)).json() as Detail; setDetail(next); if(next.contextType!=='OPPORTUNITY')setMode(initialMode); };
  useEffect(() => { void refreshList().catch((e) => setError(messageOf(e))); }, [base, query, archived]);
  useEffect(() => { void call(`${base}/users`).then((r) => r.json()).then((v) => setUsers(v as User[])).catch(() => undefined); }, [base]);
  useEffect(() => {
    if (!context) return;
    let active = true;
    void call(`${base}/conversations?archived=false`).then((r) => r.json()).then(async (rows: Conversation[]) => {
      if (!active) return;
      const found = rows.find((row) => row.contextType === context.type && row.contextId === context.id);
      const id = found?.id ?? (await (await write(`${base}/conversations`, { contextType: context.type, contextId: context.id })).json() as Conversation).id;
      if (active) { await open(id); await refreshList(); }
    }).catch((e) => { if (active) setError(messageOf(e)); });
    return () => { active = false; };
  }, [base, context?.type, context?.id]);
  const create = async (type: ContextType = 'NONE', id: string | null = null) => {
    setBusy(true); setError('');
    try { const row = await (await write(`${base}/conversations`, { contextType: type, contextId: id })).json() as Conversation; await refreshList(); await open(row.id); setChoosing(false); }
    catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  const searchRecords = async (event: FormEvent) => { event.preventDefault(); try { setRecords(await (await call(`${base}/records?${new URLSearchParams({ keyword: recordQuery, type: recordType })}`)).json() as RecordResult[]); setError(''); } catch (e) { setError(messageOf(e)); } };
  const send = async (event: FormEvent) => {
    event.preventDefault(); if (!detail || !text.trim() || busy) return;
    const input = text.trim(); setBusy(true); setError('');
    try { const next = await (await write(`${base}/conversations/${detail.id}/messages`, { requestId:crypto.randomUUID(),text:input,mode,knowledgeIds })).json() as Detail; setDetail(next); setText(''); await refreshList(); }
    catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  const modify = async (input: { title?: string; archived?: boolean }) => { if (!detail) return; try { await write(`${base}/conversations/${detail.id}`, input, 'PATCH'); await refreshList(); if (input.archived !== undefined) setDetail(null); else await open(detail.id); } catch (e) { setError(messageOf(e)); } };
  const remove = async () => { if (!detail || !window.confirm('确定删除此会话及消息？已保存的正式待办将保留。')) return; try { await write(`${base}/conversations/${detail.id}`, undefined, 'DELETE'); setDetail(null); await refreshList(); } catch (e) { setError(messageOf(e)); } };
  const saveTodo = async (messageId:string,draft:Draft,ownerUserId:string,index=0)=>{try{const saved=await (await write(`${base}/messages/${messageId}/todo`,{...draft,ownerUserId:ownerUserId||undefined,draftIndex:index})).json() as SavedAction;setSavedTodoMessages(current=>[...current,`${messageId}:${index}`]);setDetail(current=>current?{...current,messages:current.messages.map(message=>message.id===messageId?{...message,savedActions:[...(message.savedActions??[]).filter(a=>a.draftIndex!==index),{...saved,draftIndex:index}]}:message)}:current);setError('');}catch(e){setError(messageOf(e));}};
  const completeTodo=async(action:SavedAction,result:string)=>{try{await write(`${base}/todos/${action.id}`,{status:'DONE',result,version:action.version},'PATCH');if(detail)await open(detail.id);}catch(e){setError(messageOf(e));}};
  const sourceClick=async(ref:Ref)=>{if(ref.kind==='knowledge'){try{setPreview(await (await call(`${base}/knowledge/${ref.id.split(':')[1]}`)).json() as Knowledge);}catch(e){setError(messageOf(e));}}else onNavigate(ref.path);};
  return <div className="personal-agent-page">
    <aside className="personal-agent-sessions"><header><div><small>CRM AGENT</small><h1>Agent 工作台</h1></div><button type="button" className="is-primary" disabled={busy} onClick={() => void create()}><IconPlus size={16} />新会话</button></header>
      <input aria-label="搜索会话" placeholder="搜索我的会话" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="personal-agent-session-tabs"><button type="button" aria-pressed={!archived} onClick={() => { setArchived(false); setDetail(null); }}>进行中</button><button type="button" aria-pressed={archived} onClick={() => { setArchived(true); setDetail(null); }}>已归档</button></div>
      <button type="button" className="personal-agent-context-button" onClick={() => setChoosing(!choosing)}>选择客户或商机开始</button>
      {choosing && <form className="personal-agent-picker" onSubmit={(e) => void searchRecords(e)}><select aria-label="业务对象类型" value={recordType} onChange={(e) => { setRecordType(e.target.value as 'CUSTOMER' | 'OPPORTUNITY'); setRecords([]); }}><option value="CUSTOMER">客户</option><option value="OPPORTUNITY">商机</option></select><input required aria-label="搜索业务对象" placeholder="输入编码或名称" value={recordQuery} onChange={(e) => setRecordQuery(e.target.value)} /><button type="submit">查找</button>{records.map((record) => <button key={record.id} type="button" onClick={() => void create(recordType, record.id.split(':')[1])}>{record.title}</button>)}</form>}
      <div className="personal-agent-session-list">{list.map((row) => <button key={row.id} type="button" disabled={busy} className={detail?.id === row.id ? 'selected' : ''} onClick={() => void open(row.id).catch((e) => setError(messageOf(e)))}><strong>{row.title}</strong><small>{row.contextType === 'CUSTOMER' ? '客户' : row.contextType === 'OPPORTUNITY' ? '商机' : '通用会话'} · {new Date(row.updatedAt).toLocaleString('zh-CN')}</small></button>)}{!list.length && <p>暂无{archived ? '归档' : '进行中'}会话</p>}</div>
    </aside>
    <main className="personal-agent-chat"><DetailTabs id="personal-agent" label="Agent 功能" active={panel} onChange={setPanel} tabs={[{id:'chat',label:'会话与行动'},{id:'knowledge',label:'我的知识资料'}]}/>{panel==='knowledge'&&<AgentKnowledgePanel base={base} items={knowledge} onSaved={refreshKnowledge} onError={setError}/>}<div className="personal-agent-conversation" hidden={panel!=='chat'}>{error && <div className="enterprise-alert" role="alert">{error}</div>}{!detail ? <div className="personal-agent-empty"><h2>从一个问题或业务对象开始</h2><p>对话会保存到当前账号；回答中的资料可点击查看。</p></div> : <><header className="personal-agent-chat-header"><div><h2>{detail.title}</h2><small>{detail.contextType === 'NONE' ? '通用会话' : `关联${detail.contextType === 'CUSTOMER' ? '客户' : '商机'}`}</small></div><div><button type="button" onClick={() => { const title = window.prompt('会话名称', detail.title); if (title?.trim()) void modify({ title: title.trim() }); }}>改名</button><button type="button" onClick={() => void modify({ archived: !detail.archived })}><IconArchive size={15} />{detail.archived ? '恢复' : '归档'}</button><button type="button" aria-label="删除会话" onClick={() => void remove()}><IconTrash size={15} /></button></div></header>
      {detail.contextId && <button type="button" className="personal-agent-back" onClick={() => onNavigate(`/showcase/${detail.contextType === 'CUSTOMER' ? 'customers' : 'opportunities'}/${detail.contextId}`)}><IconArrowLeft size={15} />返回关联业务记录</button>}
      <div className="personal-agent-messages" aria-live="polite">{detail.messages.map((message) => <article key={message.id} className={`personal-agent-message ${message.role.toLowerCase()}`}><small>{message.role === 'USER' ? '我' : 'Agent'} · {new Date(message.createdAt).toLocaleString('zh-CN')}</small>{message.status === 'RUNNING' ? <p>正在生成…</p> : message.status === 'FAILED' ? <p role="alert">生成失败：{message.error}。输入已保存，可重新提问。</p> : <p>{message.content}</p>}{message.sourceRefs?.length > 0 && <div className="personal-agent-sources">来源：{message.sourceRefs.map((ref) => <button type="button" key={ref.id} onClick={() => void sourceClick(ref)}>{ref.title}</button>)}</div>}{(message.todoDrafts??(message.todoDraft?[message.todoDraft]:[])).map((draft,index)=>{const action=message.savedActions?.find(a=>a.draftIndex===index);return <TodoDraft key={`${message.id}:${index}`} draft={draft} users={users} saved={Boolean(action)||(!message.savedActions&&message.todoSaved)||savedTodoMessages.includes(`${message.id}:${index}`)} action={action} onComplete={result=>action&&void completeTodo(action,result)} onSave={(value,owner)=>void saveTodo(message.id,value,owner,index)}/>;})}</article>)}{!detail.messages.length && <div className="personal-agent-empty"><p>可以询问客户情况、商机进展、跟进话术，或请 Agent 起草待办。</p></div>}</div>
      {!detail.archived && <form className="personal-agent-compose" onSubmit={(e) => void send(e)}><label>处理方式<select aria-label="处理方式" value={mode} disabled={busy} onChange={e=>setMode(e.target.value as 'CHAT'|'MEETING'|'EMAIL_DRAFT')}><option value="CHAT">业务问答</option><option value="EMAIL_DRAFT">邮件回复草稿（需审阅）</option><option value="MEETING" disabled={detail.contextType!=='OPPORTUNITY'}>商机会议行动</option></select></label><label>引用知识<select multiple size={2} aria-label="引用知识" value={knowledgeIds} disabled={busy} onChange={e=>setKnowledgeIds(Array.from(e.target.selectedOptions).map(o=>o.value).slice(0,5))}>{knowledge.filter(item=>item.status==='ACTIVE'&&!item.expired).map(item=><option key={item.id} value={item.id}>{item.title} · v{item.revision}</option>)}</select></label><textarea aria-label="输入问题" value={text} onChange={(e) => setText(e.target.value)} placeholder="描述你要了解的客户、商机或跟进任务…" rows={3} maxLength={12000} /><button type="submit" className="is-primary" disabled={busy || !text.trim()}><IconSend size={17} />{busy ? '处理中…' : mode==='EMAIL_DRAFT'?'生成回复草稿':'发送'}</button></form>}
    </>}</div>{preview&&<SalesActionDialog title={`${preview.title} · v${preview.revision}`} onClose={()=>setPreview(null)} onSave={async()=>setPreview(null)} saveLabel="关闭"><p>{preview.outdated?'该引用为历史版本，请核对最新资料。':'当前有效版本'}</p><p style={{whiteSpace:'pre-wrap'}}>{preview.content}</p></SalesActionDialog>}</main>
  </div>;
}

function TodoDraft({ draft, users, saved, action, onComplete, onSave }: { draft: Draft; users: User[]; saved: boolean; action?:SavedAction; onComplete:(result:string)=>void; onSave: (value: Draft, owner: string) => void }) {
  const [value,setValue]=useState(draft);const [owner,setOwner]=useState('');const [result,setResult]=useState('');
  return <form className="personal-agent-todo" onSubmit={(e) => { e.preventDefault(); onSave(value, owner); }}><strong>{saved ? '已保存的待办' : '待办草稿 · 确认后保存'}</strong><label>标题<input required maxLength={160} value={value.title} disabled={saved} onChange={(e) => setValue({ ...value, title: e.target.value })} /></label><label>内容<textarea maxLength={2000} value={value.description} disabled={saved} onChange={(e) => setValue({ ...value, description: e.target.value })} /></label><label>负责人<select value={owner} disabled={saved} onChange={(e) => setOwner(e.target.value)}><option value="">当前账号</option>{users.map((user) => <option value={user.id} key={user.id}>{user.displayName}（{user.account}）</option>)}</select></label><label>截止日期<input type="date" value={value.dueDate ?? ''} disabled={saved} onChange={(e) => setValue({ ...value, dueDate: e.target.value || null })} /></label>{action&&<p>执行状态：{action.status==='DONE'?'已完成':'待执行'}　结果：{action.result||'尚未填写'}</p>}{action?.canComplete&&action.status==='OPEN'&&<><label>执行结果<input value={result} onChange={e=>setResult(e.target.value)} maxLength={2000}/></label><button type="button" disabled={!result.trim()} onClick={()=>onComplete(result.trim())}>确认完成行动</button></>}{!saved && <button type="submit" className="is-primary">确认保存待办</button>}</form>;
}
