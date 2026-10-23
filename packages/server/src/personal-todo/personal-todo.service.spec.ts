import { PersonalTodoService } from './personal-todo.service';
import { ApiException } from '../http/api-exceptions';
import type { DatabaseService } from '../database/database.service';
import type { ActivityAccessService } from '../activity/activity-access.service';
import type { SalesScope } from '../sales-guidance/sales-facts';
describe('personal task business visibility',()=>{
 it('checks each agent context rather than sharing an unrestricted cache',async()=>{
 const date=new Date();const rows=[{id:'a',sourceSuggestionId:null,contextType:'OPPORTUNITY',contextId:'allowed',dueDate:null,createdAt:date},{id:'b',sourceSuggestionId:null,contextType:'OPPORTUNITY',contextId:'denied',dueDate:null,createdAt:date}];
 const scope=jest.fn(async(_code:string,_user:string,_kind:string,id:string)=>{if(id==='denied')throw new ApiException('FORBIDDEN',403,'无权访问');});
 const service=new PersonalTodoService({sysPersonalTodo:{findMany:async()=>rows}} as unknown as DatabaseService,{scope} as unknown as ActivityAccessService);
 const result=await service.visibleOpen('app','user',{id:'app',tenantId:'tenant'} as SalesScope);expect(result.total).toBe(1);expect(result.items.map(item=>item.id)).toEqual(['a']);expect(scope).toHaveBeenCalledTimes(2);
 });
});
