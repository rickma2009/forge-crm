import {Body,Controller,Get,Param,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import {businessSceneCodeSchema,systemCodeSchema} from '@forge-crm/contracts';
import {SessionGuard} from '../auth/session.guard';
import {WriteRequestGuard} from '../auth/write-request.guard';
import type {AuthenticatedRequest} from '../auth/auth.types';
import {AuthorizationService} from '../rbac/authorization.service';
import {BusinessSceneService} from './business-scene.service';
@Controller('api/systems/:systemCode/digital-employees/business-scenes')
@UseGuards(SessionGuard)
export class BusinessSceneController{
 constructor(private readonly service:BusinessSceneService,private readonly auth:AuthorizationService){}
 private async allowed(r:AuthenticatedRequest,raw:string,rawScene:string,action?:'manage'|'execute'){const code=systemCodeSchema.parse(raw),scene=businessSceneCodeSchema.parse(rawScene);await this.auth.assertPage(r.currentUser.id,code,`/showcase/digital-employee/scenarios/${scene}`);if(action)await this.auth.assertAction(r.currentUser.id,code,`de-scene-${scene.slice(4).toLowerCase()}`,action);return{code,scene};}
 @Get(':scene') async center(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('scene')s:string,@Query()q:unknown){const{code,scene}=await this.allowed(r,c,s);return this.service.center(code,scene,r.currentUser,q);}
 @Get(':scene/records/:id') async detail(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('scene')s:string,@Param('id')id:string){const{code,scene}=await this.allowed(r,c,s);return this.service.detail(code,scene,id,r.currentUser);}
 @Patch(':scene/config') @UseGuards(WriteRequestGuard) async config(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('scene')s:string,@Body()b:unknown){const{code,scene}=await this.allowed(r,c,s,'manage');return this.service.saveConfig(code,scene,r.currentUser,b);}
 @Post(':scene/records/:id/actions') @UseGuards(WriteRequestGuard) async action(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('scene')s:string,@Param('id')id:string,@Body()b:unknown){const{code,scene}=await this.allowed(r,c,s,'execute');return this.service.action(code,scene,id,r.currentUser,b);}
}
