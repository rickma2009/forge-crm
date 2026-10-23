import {businessSceneCenterSchema,businessSceneRecordSchema,type BusinessSceneCode,type BusinessSceneConfig,type BusinessSceneAction} from '@forge-crm/contracts';
import {call,write} from '../gateway';
const base=(system:string,scene:BusinessSceneCode)=>`/api/systems/${encodeURIComponent(system)}/digital-employees/business-scenes/${scene}`;
const detail=async(response:Response)=>{const value=await response.json() as {record:unknown;version:number};return{record:businessSceneRecordSchema.parse(value.record),version:value.version};};
export const businessScenesApi={
 center:async(system:string,scene:BusinessSceneCode,query:{query?:string;status?:string;period?:string;page?:number;pageSize?:number}={})=>businessSceneCenterSchema.parse(await(await call(`${base(system,scene)}?${new URLSearchParams(Object.entries(query).filter(([,v])=>v!==''&&v!==undefined).map(([k,v])=>[k,String(v)]))}`)).json()),
 detail:async(system:string,scene:BusinessSceneCode,id:string)=>detail(await call(`${base(system,scene)}/records/${encodeURIComponent(id)}`)),
 config:async(system:string,scene:BusinessSceneCode,config:BusinessSceneConfig,version:number)=>businessSceneCenterSchema.parse(await(await write(`${base(system,scene)}/config`,{config,version},'PATCH')).json()),
 action:async(system:string,scene:BusinessSceneCode,id:string,input:BusinessSceneAction)=>detail(await write(`${base(system,scene)}/records/${encodeURIComponent(id)}/actions`,input)),
};
