import { Body,Controller,Get,Param,Patch,Post,Query,Req,UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ActivityService } from './activity.service';
@Controller('api/systems/:systemCode/activity-timeline') @UseGuards(SessionGuard)
export class ActivityController {
 constructor(private readonly service:ActivityService){}
 @Get(':kind/:id') list(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('kind')k:string,@Param('id')id:string,@Query()q:Record<string,unknown>){return this.service.list(systemCodeSchema.parse(c),r.currentUser.id,k,id,q);}
 @Post(':kind/:id') @UseGuards(WriteRequestGuard) create(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('kind')k:string,@Param('id')id:string,@Body()b:unknown){return this.service.create(systemCodeSchema.parse(c),r.currentUser.id,r.currentUser.account,k,id,b);}
 @Patch('entries/:source/:id') @UseGuards(WriteRequestGuard) update(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('source')s:string,@Param('id')id:string,@Body()b:unknown){return this.service.update(systemCodeSchema.parse(c),r.currentUser.id,r.currentUser.account,s,id,b);}
}
