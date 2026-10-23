import { Injectable } from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {businessSceneActionSchema,businessSceneCodeSchema,businessSceneConfigWriteSchema,businessSceneDataSchema,businessSceneQuerySchema,businessSceneCenterSchema,type BusinessSceneCode,type BusinessSceneData} from '@forge-crm/contracts';
import {DatabaseService} from '../database/database.service';
import {ApiException} from '../http/api-exceptions';
import type {Prisma} from '../generated/prisma/client';
import {applyBusinessSceneAction,initialBusinessScene,sceneSummary} from './business-scene-domain';
type Actor={id:string;account:string};
const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value));
@Injectable()
export class BusinessSceneService{
 constructor(private readonly db:DatabaseService){}
 private async scope(code:string){const rows=await this.db.sysApplication.findMany({where:{applicationCode:code,status:'ACTIVE',tenant:{status:'ACTIVE'}},select:{id:true,tenantId:true},take:2});if(rows.length!==1)throw new ApiException('NOT_FOUND',404,'应用不存在或作用域不明确');return{applicationId:rows[0].id,tenantId:rows[0].tenantId};}
 private async load(code:string,scene:BusinessSceneCode,actor:Actor){const scope=await this.scope(code);const row=await this.db.sysDeSceneWorkspace.upsert({where:{applicationId_scenarioCode:{applicationId:scope.applicationId,scenarioCode:scene}},update:{},create:{...scope,scenarioCode:scene,data:json(initialBusinessScene(scene,actor.account)),createdBy:actor.id,updatedBy:actor.id}});return{scope,row,data:businessSceneDataSchema.parse(row.data)};}
 async center(code:string,rawScene:string,actor:Actor,rawQuery:unknown={}){
  const scene=businessSceneCodeSchema.parse(rawScene),q=businessSceneQuerySchema.parse(rawQuery),{row,data}=await this.load(code,scene,actor);
  const rows=data.config.sourceMode==='DEMO'?data.demoRecords.filter(r=>(!q.query||`${r.code} ${r.title} ${r.purchase?.supplier??''} ${r.purchase?.sourceNumber??''} ${r.quality?.customer??''} ${r.metric?.customer??''} ${r.metric?.sourceNumber??''}`.toLowerCase().includes(q.query.toLowerCase()))&&(!q.status||r.status===q.status)&&(!q.period||r.metric?.period===q.period)):[];
  return businessSceneCenterSchema.parse({scenarioCode:scene,version:row.version,config:data.config,connectionStatus:data.config.sourceMode==='DEMO'?'DEMO':data.config.baseUrl&&data.config.endpoint?'CONFIGURED':'WAITING_CONFIG',records:rows.slice((q.page-1)*q.pageSize,q.page*q.pageSize),total:rows.length,page:q.page,pageSize:q.pageSize,summary:sceneSummary(rows)});
 }
 async detail(code:string,scene:BusinessSceneCode,id:string,actor:Actor){const{row,data}=await this.load(code,scene,actor);if(data.config.sourceMode!=='DEMO')throw new ApiException('NOT_FOUND',404,'API模式没有已导入的真实记录');const record=data.demoRecords.find(r=>r.id===id);if(!record)throw new ApiException('NOT_FOUND',404,'场景记录不存在');return{record,version:row.version};}
 private async update(code:string,scene:BusinessSceneCode,actor:Actor,version:number,change:(data:BusinessSceneData)=>BusinessSceneData,action:string,resourceId?:string){const{scope,row,data}=await this.load(code,scene,actor);if(row.version!==version)throw new ApiException('BAD_REQUEST',409,'场景已更新，请刷新后重试');const next=businessSceneDataSchema.parse(change(structuredClone(data)));
  await this.db.$transaction(async tx=>{const changed=await tx.sysDeSceneWorkspace.updateMany({where:{id:row.id,...scope,version},data:{data:json(next),version:{increment:1},updatedBy:actor.id}});if(!changed.count)throw new ApiException('BAD_REQUEST',409,'场景已被其他人更新，请刷新');await tx.sysAuditLog.create({data:{...scope,actorUserId:actor.id,requestId:randomUUID(),resourceType:'digital-employee-scene',resourceId:row.id,actionCode:action,afterSnapshot:{scenarioCode:scene,recordId:resourceId??null,dataSource:'DEMO',externalAction:false}}});});
 }
 async saveConfig(code:string,scene:BusinessSceneCode,actor:Actor,raw:unknown){const input=businessSceneConfigWriteSchema.parse(raw),scope=await this.scope(code);if(input.config.connectionCode&&!await this.db.intDeConnection.findFirst({where:{...scope,connectionCode:input.config.connectionCode,status:{not:'DISABLED'},category:{not:'MAIL'}}}))throw new ApiException('BAD_REQUEST',400,'连接引用不存在、已停用或不是业务API连接');await this.update(code,scene,actor,input.version,data=>({...data,config:input.config}),'scene.config.save');return this.center(code,scene,actor);}
 async action(code:string,scene:BusinessSceneCode,id:string,actor:Actor,raw:unknown){const input=businessSceneActionSchema.parse(raw);await this.update(code,scene,actor,input.version,data=>{if(data.config.sourceMode!=='DEMO')throw new ApiException('BAD_REQUEST',409,'API模式尚未完成数据适配，不能操作模拟记录');const index=data.demoRecords.findIndex(r=>r.id===id);if(index<0)throw new ApiException('NOT_FOUND',404,'场景记录不存在');data.demoRecords[index]=applyBusinessSceneAction(data.demoRecords[index],input,data.config,actor.account);return data;},`scene.demo.${input.action.toLowerCase()}`,id);return this.detail(code,scene,id,actor);}
}
