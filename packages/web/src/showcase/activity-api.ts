import { timelinePageSchema,type ActivityWrite,type ActivityUpdate } from '@forge-crm/contracts';
import { call,write } from './gateway';
const root=(code:string)=>`/api/systems/${encodeURIComponent(code)}/activity-timeline`;
export const activityApi={
 async list(code:string,kind:string,id:string,type:string,cursor?:string){const q=new URLSearchParams();if(type)q.set('type',type);if(cursor)q.set('cursor',cursor);return timelinePageSchema.parse(await(await call(`${root(code)}/${kind}/${encodeURIComponent(id)}?${q}`)).json());},
 async create(code:string,kind:string,id:string,input:ActivityWrite){return(await write(`${root(code)}/${kind}/${encodeURIComponent(id)}`,input)).json();},
 async update(code:string,source:string,id:string,input:ActivityUpdate){return(await write(`${root(code)}/entries/${source}/${encodeURIComponent(id)}`,input,'PATCH')).json();},
};
