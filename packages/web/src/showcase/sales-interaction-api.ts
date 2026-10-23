import { mentionMembersSchema,suggestionPageSchema,guidanceTodoSchema,priorityScoreSchema,scoreRuleSchema,commentPageSchema,notificationPageSchema,type RecordKind } from '@forge-crm/contracts';
import { call,write } from './gateway';
const root=(code:string)=>`/api/systems/${encodeURIComponent(code)}/sales-interaction`;
async function get<T>(url:string,schema:{parse:(value:unknown)=>T}){return schema.parse(await(await call(url)).json());}
async function post(url:string,input:unknown,method:'POST'|'PATCH'='POST'){return(await write(url,input,method)).json();}
const rec=(code:string,kind:RecordKind,id:string)=>`${root(code)}/records/${kind}/${encodeURIComponent(id)}`;
export const salesInteractionApi={
 suggestions:(c:string,k:RecordKind,id:string)=>get(`${rec(c,k,id)}/suggestions`,suggestionPageSchema),
 act:(c:string,id:string,input:unknown)=>post(`${root(c)}/suggestions/${encodeURIComponent(id)}/actions`,input),
 todos:(c:string,k:RecordKind,id:string)=>get(`${rec(c,k,id)}/todos`,guidanceTodoSchema.array()),
 complete:(c:string,id:string,input:unknown)=>post(`${root(c)}/todos/${encodeURIComponent(id)}`,input,'PATCH'),
 score:(c:string,id:string)=>get(`${root(c)}/scores/${encodeURIComponent(id)}`,priorityScoreSchema),
 override:(c:string,id:string,input:unknown)=>post(`${root(c)}/scores/${encodeURIComponent(id)}/overrides`,input),
 rules:(c:string)=>get(`${root(c)}/score-rules`,scoreRuleSchema.array()),
 createRule:(c:string,input:unknown)=>post(`${root(c)}/score-rules`,input),
 ruleState:(c:string,id:string,input:unknown)=>post(`${root(c)}/score-rules/${encodeURIComponent(id)}/state`,input),
 comments:(c:string,k:RecordKind,id:string,cursor?:string,rootId?:string)=>{const q=new URLSearchParams();if(cursor)q.set('cursor',cursor);if(rootId)q.set('rootCommentId',rootId);return get(`${rec(c,k,id)}/comments?${q}`,commentPageSchema);},
 draft:(c:string,k:RecordKind,id:string,input:unknown)=>post(`${rec(c,k,id)}/comment-drafts`,input) as Promise<{id:string;version:number}>,
 publish:(c:string,id:string,input:unknown)=>post(`${root(c)}/comments/${encodeURIComponent(id)}`,input),
 commentState:(c:string,id:string,input:unknown)=>post(`${root(c)}/comments/${encodeURIComponent(id)}/state`,input),
 members:(c:string,k:RecordKind,id:string,q:string,cursor?:string)=>get(`${rec(c,k,id)}/members?${new URLSearchParams({q,...(cursor?{cursor}:{})})}`,mentionMembersSchema),
 notifications:(c:string,unreadOnly:boolean,cursor?:string)=>get(`${root(c)}/notifications?${new URLSearchParams({unreadOnly:String(unreadOnly),...(cursor?{cursor}:{})})}`,notificationPageSchema),
 read:(c:string,input:unknown)=>post(`${root(c)}/notifications/read`,input),
};
