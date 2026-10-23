import {Body,Controller,Delete,Get,Param,Post,Put,Query,Req,UseGuards} from '@nestjs/common';
import {SessionGuard} from '../auth/session.guard';
import {WriteRequestGuard} from '../auth/write-request.guard';
import type {AuthenticatedRequest} from '../auth/auth.types';
import {AuthorizationService} from '../rbac/authorization.service';
import {SalesWorkflowService} from './sales-workflow.service';
import {systemCodeSchema} from '@forge-crm/contracts';
import {z} from 'zod';
@Controller('api/systems/:systemCode/workflows')
@UseGuards(SessionGuard)
export class SalesWorkflowController {
 constructor(private readonly service:SalesWorkflowService,private readonly auth:AuthorizationService){}
 private async allowed(r:AuthenticatedRequest,c:string,action='view',page='approval-center'){const code=systemCodeSchema.parse(c);await this.auth.assertAction(r.currentUser.id,code,page,action);return code;}
 @Post('preview') @UseGuards(WriteRequestGuard) async preview(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Body() body:unknown){await this.allowed(r,c,'manage','workflow-settings');return this.service.preview(body);}
 @Get('issues') async issues(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string){return this.service.issues(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id);}
 @Get('configurations') async configs(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string){return this.service.configurations(await this.allowed(r,c,'view','workflow-settings'),r.currentUser.id);}
 @Get('options') async options(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string){return this.service.options(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id);}
 @Get('objects') async objects(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string){return this.service.objectCatalog(await this.allowed(r,c,'view','workflow-settings'),r.currentUser.id);}
 @Get('definitions') async definitions(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Query() query:unknown){return this.service.workflowList(await this.allowed(r,c,'view','workflow-settings'),r.currentUser.id,query);}
 @Post('definitions') @UseGuards(WriteRequestGuard) async createDefinition(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Body() body:unknown){return this.service.createWorkflow(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id,body);}
 @Get('definitions/:id') async definition(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string){return this.service.workflowDetail(await this.allowed(r,c,'view','workflow-settings'),r.currentUser.id,z.string().uuid().parse(id));}
 @Put('definitions/:id') @UseGuards(WriteRequestGuard) async updateDefinition(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string,@Body() body:unknown){return this.service.updateWorkflow(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id,z.string().uuid().parse(id),body);}
 @Post('definitions/:id/edit') @UseGuards(WriteRequestGuard) async editDefinition(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string,@Body() body:unknown){return this.service.editWorkflow(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id,z.string().uuid().parse(id),z.object({requestKey:z.string().uuid()}).parse(body).requestKey);}
 @Delete('definitions/:id') @UseGuards(WriteRequestGuard) async deleteDefinition(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string){return this.service.deleteWorkflow(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id,z.string().uuid().parse(id));}
 @Post('definitions/:id/publish') @UseGuards(WriteRequestGuard) async publishDefinition(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string,@Body() body:unknown){return this.service.publishWorkflow(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id,z.string().uuid().parse(id),z.object({requestKey:z.string().uuid()}).parse(body).requestKey);}
 @Post('configurations') @UseGuards(WriteRequestGuard) async publish(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Body() body:unknown){return this.service.publish(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id,body);}
 @Get('approvals') async list(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Query() query:unknown){return this.service.list(await this.allowed(r,c),r.currentUser.id,query);}
 @Get('approvals/:id') async detail(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string){return this.service.detail(await this.allowed(r,c),r.currentUser.id,z.string().uuid().parse(id));}
 @Post('approvals/:id/actions') @UseGuards(WriteRequestGuard) async act(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string,@Body() body:unknown){return this.service.act(await this.allowed(r,c,'process'),r.currentUser.id,z.string().uuid().parse(id),body);}
 @Get('orders/:id') async order(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string){return this.service.forOrder(await this.allowed(r,c,'view','sales-order-directory'),r.currentUser.id,z.string().uuid().parse(id));}
 @Post('deliveries/:id/retry') @UseGuards(WriteRequestGuard) async retry(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string){return this.service.retry(await this.allowed(r,c,'manage','workflow-settings'),r.currentUser.id,z.string().uuid().parse(id));}
 @Get('notices') async notices(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string){return this.service.notices(await this.allowed(r,c),r.currentUser.id);}
 @Post('approvals/:id/read') @UseGuards(WriteRequestGuard) async read(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string){return this.service.markRead(await this.allowed(r,c),r.currentUser.id,z.string().uuid().parse(id));}
}
