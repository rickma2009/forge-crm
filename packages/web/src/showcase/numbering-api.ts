import { codeRuleListSchema,type CodeRuleWrite } from '@forge-crm/contracts';
import { call,write } from './gateway';
const root=(c:string)=>`/api/systems/${encodeURIComponent(c)}/code-rules`;
export const numberingApi={
 list:async(c:string,q:URLSearchParams)=>codeRuleListSchema.parse(await(await call(`${root(c)}?${q}`)).json()),
 save:async(c:string,id:string|null,input:CodeRuleWrite)=>{await write(`${root(c)}${id?`/${encodeURIComponent(id)}`:''}`,input,id?'PATCH':'POST');},
 remove:async(c:string,id:string,version:number)=>{await write(`${root(c)}/${encodeURIComponent(id)}`,{version},'DELETE');},
};
